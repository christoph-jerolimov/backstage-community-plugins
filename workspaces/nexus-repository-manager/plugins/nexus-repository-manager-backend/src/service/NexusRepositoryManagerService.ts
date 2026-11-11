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
import { parseEntityRef, stringifyEntityRef } from '@backstage/catalog-model';
import type { Config } from '@backstage/config';
import { InputError, NotFoundError, ResponseError } from '@backstage/errors';
import type { CatalogService } from '@backstage/plugin-catalog-node';
import { NexusConnections } from '../connections/NexusConnections';
import type {
  NexusAuthMethod,
  NexusConnection,
} from '../connections/nexusConnectionType';
import { getEntitySearch } from './annotations';
import type {
  DockerManifest,
  EntityComponentsResponse,
  NexusAsset,
  NexusComponent,
} from './types';

/** Safety limit for the number of search result pages that are loaded. */
const MAX_SEARCH_PAGES = 100;

/**
 * Asks for a v2 schema 2 manifest if possible. It's faster for supporting
 * servers to return and contains size information.
 */
const DOCKER_MANIFEST_ACCEPT = [
  'application/vnd.docker.distribution.manifest.v2+json',
  'application/vnd.docker.distribution.manifest.v1+json;q=0.9',
  '*/*;q=0.8',
].join(', ');

const MAVEN_IGNORED_ASSET_EXTENSIONS = new Set([
  'pom',
  'sha1',
  'md5',
  'sha256',
]);

/** Whether an asset should be displayed on its own, e.g. not a pom or checksum. */
export function isPrimaryAsset(asset: NexusAsset): boolean {
  const extension = asset.maven2?.extension;
  if (extension === undefined) {
    return true;
  }
  // Extension can be `jar.md5` or `zip.sha1`, for example
  return !MAVEN_IGNORED_ASSET_EXTENSIONS.has(extension.split('.').pop() ?? '');
}

/** Whether to load the size of an asset, as the search API doesn't return it. */
function needsFileSize(asset: NexusAsset): boolean {
  return (
    asset.format === 'maven2' &&
    !asset.fileSize &&
    !!asset.maven2 &&
    // Skip e.g. sources and javadoc
    !asset.maven2.classifier &&
    isPrimaryAsset(asset)
  );
}

function toUrl(hostOrUrl: string): string {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(hostOrUrl)
    ? hostOrUrl
    : `https://${hostOrUrl}`;
}

type Fetcher = (
  path: string,
  init?: { method?: string; headers?: Record<string, string> },
) => Promise<Response>;

function createFetcher(connection: NexusConnection<NexusAuthMethod>): {
  baseUrl: string;
  fetch: Fetcher;
} {
  const baseUrl = (connection.baseUrl ?? `https://${connection.host}`).replace(
    /\/+$/,
    '',
  );
  const { auth } = connection;
  const authHeaders: Record<string, string> = {};
  if (auth.method === 'token') {
    authHeaders.Authorization = `Bearer ${auth.token}`;
  } else if (auth.method === 'basic') {
    authHeaders.Authorization = `Basic ${Buffer.from(
      `${auth.username}:${auth.password}`,
    ).toString('base64')}`;
  }

  return {
    baseUrl,
    fetch: async (path, init = {}) => {
      const response = await fetch(`${baseUrl}${path}`, {
        method: init.method ?? 'GET',
        headers: {
          // Prevents Nexus from answering with a basic auth challenge
          'X-Requested-With': 'XMLHttpRequest',
          ...init.headers,
          ...authHeaders,
        },
      });
      if (!response.ok) {
        throw await ResponseError.fromResponse(response);
      }
      return response;
    },
  };
}

function assetPath(asset: NexusAsset): string {
  // Newer versions of Nexus return paths with a leading slash
  const path = (asset.path ?? '').replace(/^\/+/, '');
  return `/repository/${encodeURIComponent(asset.repository ?? '')}/${path}`;
}

/**
 * Loads the Nexus Repository Manager components for catalog entities.
 *
 * @public
 */
export class NexusRepositoryManagerService {
  static fromConfig(
    config: Config,
    options: { catalog: CatalogService; logger: LoggerService },
  ): NexusRepositoryManagerService {
    return new NexusRepositoryManagerService(
      NexusConnections.fromConfig(config),
      options.catalog,
      options.logger,
      config.getOptionalBoolean(
        'nexusRepositoryManager.experimentalAnnotations',
      ) ?? false,
    );
  }

  private constructor(
    private readonly connections: NexusConnections,
    private readonly catalog: CatalogService,
    private readonly logger: LoggerService,
    private readonly experimentalAnnotations: boolean,
  ) {}

  /**
   * Loads the components that match the annotations of an entity. The entity
   * is read with the given credentials, so catalog permissions apply.
   */
  async getEntityComponents(options: {
    entityRef: string;
    credentials: BackstageCredentials;
  }): Promise<EntityComponentsResponse> {
    let entityRef: string;
    try {
      entityRef = stringifyEntityRef(parseEntityRef(options.entityRef));
    } catch (error) {
      throw new InputError(`Invalid entity ref "${options.entityRef}"`, error);
    }

    const entity = await this.catalog.getEntityByRef(entityRef, {
      credentials: options.credentials,
    });
    if (!entity) {
      throw new NotFoundError(`Entity "${entityRef}" not found`);
    }

    const search = getEntitySearch(entity, {
      experimentalAnnotations: this.experimentalAnnotations,
    });
    if (!search) {
      throw new InputError(
        `Entity "${entityRef}" has no Nexus Repository Manager annotations`,
      );
    }

    const connection = await this.findConnection(search.host);
    const { baseUrl, fetch: nexusFetch } = createFetcher(connection);

    const components: NexusComponent[] = [];
    let continuationToken: string | undefined;
    let page = 0;
    do {
      const params = new URLSearchParams(search.query);
      if (continuationToken) {
        params.set('continuationToken', continuationToken);
      }
      const response = await nexusFetch(`/service/rest/v1/search?${params}`, {
        headers: { Accept: 'application/json' },
      });
      const body = (await response.json()) as {
        items?: NexusComponent[];
        continuationToken?: string | null;
      };
      components.push(...(body.items ?? []));
      continuationToken = body.continuationToken ?? undefined;
      page += 1;
    } while (continuationToken && page < MAX_SEARCH_PAGES);

    if (continuationToken) {
      this.logger.warn(
        `Stopped loading Nexus components for ${entityRef} after ${MAX_SEARCH_PAGES} pages`,
      );
    }

    const results = await Promise.all(
      components
        .filter(component => component.assets?.some(isPrimaryAsset))
        .map(async component => ({
          component: await this.addFileSizes(component, nexusFetch),
          dockerManifests: await this.getDockerManifests(component, nexusFetch),
        })),
    );

    return {
      entityRef,
      title: search.title,
      connection: { title: connection.title, host: connection.host, baseUrl },
      components: results,
    };
  }

  private async findConnection(
    host?: string,
  ): Promise<NexusConnection<NexusAuthMethod>> {
    let url: string;
    if (host) {
      url = toUrl(host);
    } else {
      const [first] = this.connections.list();
      if (!first) {
        throw new NotFoundError(
          'No Nexus Repository Manager connections are configured',
        );
      }
      url = `https://${first.host}`;
    }

    return this.connections.find({
      query: { url },
      authMethods: ['token', 'basic', 'none'],
    });
  }

  /**
   * Uses HEAD requests to get the size of maven assets, as Nexus doesn't
   * return it in the search API. Assets keep their size if this fails.
   */
  private async addFileSizes(
    component: NexusComponent,
    nexusFetch: Fetcher,
  ): Promise<NexusComponent> {
    if (component.format !== 'maven2' || !component.assets) {
      return component;
    }

    const assets = await Promise.all(
      component.assets.map(async asset => {
        if (!needsFileSize(asset)) {
          return asset;
        }
        try {
          const response = await nexusFetch(assetPath(asset), {
            method: 'HEAD',
          });
          return {
            ...asset,
            fileSize: Number(response.headers.get('Content-Length')) || 0,
          };
        } catch (error) {
          this.logger.warn(
            `Failed to load the size of Nexus asset ${asset.path}: ${error}`,
          );
          return asset;
        }
      }),
    );

    return { ...component, assets };
  }

  private async getDockerManifests(
    component: NexusComponent,
    nexusFetch: Fetcher,
  ): Promise<(DockerManifest | null)[]> {
    if (component.format !== 'docker') {
      return [];
    }

    return Promise.all(
      (component.assets ?? []).map(async asset => {
        try {
          const response = await nexusFetch(assetPath(asset), {
            headers: { Accept: DOCKER_MANIFEST_ACCEPT },
          });
          return (await response.json()) as DockerManifest;
        } catch (error) {
          this.logger.warn(
            `Failed to load the Docker manifest ${asset.path}: ${error}`,
          );
          return null;
        }
      }),
    );
  }
}
