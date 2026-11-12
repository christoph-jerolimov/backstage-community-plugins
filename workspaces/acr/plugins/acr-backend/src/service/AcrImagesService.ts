/*
 * Copyright 2026 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import type {
  BackstageCredentials,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { stringifyEntityRef } from '@backstage/catalog-model';
import { InputError, NotFoundError, ResponseError } from '@backstage/errors';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import {
  ACR_CONNECTION_TYPE,
  type AcrConnection,
} from '../connections/acrConnectionType';
import type { AcrConnectionsService } from '../connections/AcrConnectionsService';

/**
 * Entity annotation that contains the repository (image) name.
 *
 * @public
 */
export const ACR_ANNOTATION_REPOSITORY_NAME =
  'azure-container-registry/repository-name';

/**
 * Entity annotation that selects the registry, either by registry name
 * (`myregistry` for `myregistry.azurecr.io`) or by host. The first configured
 * connection is used if the annotation is missing.
 *
 * @public
 */
export const ACR_ANNOTATION_REGISTRY_NAME =
  'azure-container-registry/registry-name';

/** @public */
export const DEFAULT_TAGS_LIMIT = 100;

/**
 * A tag of an image in an Azure Container Registry, as returned by the
 * ACR REST API.
 *
 * @public
 */
export type AcrTag = {
  name: string;
  digest: string;
  createdTime: string;
  lastUpdateTime: string;
  signed?: boolean;
  changeableAttributes?: {
    deleteEnabled?: boolean;
    listEnabled?: boolean;
    readEnabled?: boolean;
    writeEnabled?: boolean;
  };
};

/**
 * The tags of an image in an Azure Container Registry.
 *
 * @public
 */
export type AcrTagsResponse = {
  registry: string;
  imageName: string;
  tags: AcrTag[];
};

function buildTagsUrl(
  connection: Omit<AcrConnection, 'auth'>,
  repository: string,
  limit: number,
) {
  const baseUrl = (
    connection.apiBaseUrl ?? `https://${connection.host}/acr/v1`
  ).replace(/\/+$/, '');
  const path = repository.split('/').map(encodeURIComponent).join('/');
  return `${baseUrl}/${path}/_tags?orderby=timedesc&n=${limit}`;
}

function authHeaders(auth: AcrConnection['auth']): Record<string, string> {
  switch (auth.method) {
    case 'token':
      return { Authorization: `Bearer ${auth.token}` };
    case 'basic':
      return {
        Authorization: `Basic ${Buffer.from(
          `${auth.username}:${auth.password}`,
        ).toString('base64')}`,
      };
    default:
      return {};
  }
}

/**
 * Loads image information from Azure Container Registry for catalog entities.
 *
 * @public
 */
export class AcrImagesService {
  constructor(
    private readonly options: {
      catalog: CatalogService;
      connections: AcrConnectionsService;
      /** The registry URL for entities without a registry annotation. */
      defaultRegistryUrl?: string;
      logger: LoggerService;
      fetch?: typeof fetch;
    },
  ) {}

  /**
   * Returns the image tags for the repository that is referenced by the
   * annotations of the given entity, newest first.
   */
  async getImageTags(request: {
    entityRef: string;
    credentials: BackstageCredentials;
    limit?: number;
  }): Promise<AcrTagsResponse> {
    const limit = request.limit ?? DEFAULT_TAGS_LIMIT;
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new InputError('The limit must be an integer between 1 and 1000');
    }

    const entity = await this.options.catalog.getEntityByRef(
      request.entityRef,
      { credentials: request.credentials },
    );
    if (!entity) {
      throw new NotFoundError(`Entity ${request.entityRef} not found`);
    }
    const entityRef = stringifyEntityRef(entity);

    const annotations = entity.metadata.annotations ?? {};
    const repository = annotations[ACR_ANNOTATION_REPOSITORY_NAME];
    if (!repository) {
      throw new InputError(
        `Entity ${entityRef} has no "${ACR_ANNOTATION_REPOSITORY_NAME}" annotation`,
      );
    }

    const registryUrl = this.getRegistryUrl(
      annotations[ACR_ANNOTATION_REGISTRY_NAME],
    );
    const connection = await this.options.connections
      .find({
        type: ACR_CONNECTION_TYPE,
        query: { url: registryUrl },
        authMethods: ['none', 'token', 'basic'],
      })
      .catch(error => {
        if (error?.name === 'NotFoundError') {
          throw new NotFoundError(
            `No Azure Container Registry connection is configured for ${registryUrl}`,
          );
        }
        throw error;
      });

    const url = buildTagsUrl(connection, repository, limit);
    this.options.logger.debug(
      `Loading tags of ${repository} from ${connection.host} for ${entityRef}`,
    );

    const response = await (this.options.fetch ?? fetch)(url, {
      headers: {
        Accept: 'application/json',
        ...authHeaders(connection.auth),
      },
    });
    if (response.status === 404) {
      throw new NotFoundError(
        `Repository ${repository} not found in registry ${connection.host}`,
      );
    }
    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    const body = (await response.json()) as Partial<AcrTagsResponse>;
    return {
      registry: body.registry ?? connection.host,
      imageName: body.imageName ?? repository,
      tags: body.tags ?? [],
    };
  }

  private getRegistryUrl(registryName?: string): string {
    if (!registryName) {
      if (!this.options.defaultRegistryUrl) {
        throw new NotFoundError(
          'No Azure Container Registry connection is configured',
        );
      }
      return this.options.defaultRegistryUrl;
    }
    const host = registryName.includes('.')
      ? registryName
      : `${registryName}.azurecr.io`;
    return `https://${host}`;
  }
}
