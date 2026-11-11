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
import {
  BackstageCredentials,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { InputError, NotFoundError } from '@backstage/errors';
import { CatalogService } from '@backstage/plugin-catalog-node';
import {
  getConnectionAuthHeaders,
  getConnectionBaseUrl,
  JfrogArtifactoryConnectionsService,
} from '../connections/JfrogArtifactoryConnections';
import {
  JfrogArtifactoryTagEdge,
  JFROG_ARTIFACTORY_ANNOTATION_HOST,
  JFROG_ARTIFACTORY_ANNOTATION_IMAGE_NAME,
  JFROG_ARTIFACTORY_ANNOTATION_REPO_FILTER,
  JfrogArtifactoryPageInfo,
  JfrogArtifactoryTagsResponse,
} from '../types';

const MAX_PAGE_SIZE = 200;
const DEFAULT_PAGE_LIMIT = 100;

const VERSIONS_QUERY =
  'query ($filter: VersionFilter!, $first: Int, $after: ID, $orderBy: VersionOrder) { versions (filter: $filter, first: $first, after: $after, orderBy: $orderBy) { edges { node { name, created, modified, package { id }, repos { name, type, leadFilePath }, licenses { name, source }, size, stats { downloadCount }, vulnerabilities { critical, high, medium, low, info, unknown, skipped }, files { name, lead, size, md5, sha1, sha256, mimeType } } } pageInfo { hasNextPage, endCursor } } }';

/**
 * The result of loading the image tags of an entity.
 *
 * @public
 */
export interface EntityTagsResult {
  entityRef: string;
  imageName: string;
  host: string;
  repoFilter?: string;
  tags: JfrogArtifactoryTagsResponse;
}

/**
 * Loads JFrog Artifactory information for catalog entities.
 *
 * @internal
 */
export class JfrogArtifactoryService {
  constructor(
    private readonly options: {
      config: RootConfigService;
      logger: LoggerService;
      catalog: CatalogService;
      connections: JfrogArtifactoryConnectionsService;
    },
  ) {}

  /**
   * Loads the entity with the given ref from the catalog, on behalf of the
   * given credentials, and returns the image tags for it.
   */
  async getTagsForEntityRef(options: {
    entityRef: string;
    credentials: BackstageCredentials;
  }): Promise<EntityTagsResult> {
    let entityRef: string;
    try {
      entityRef = stringifyEntityRef(
        parseEntityRef(options.entityRef, { defaultKind: 'component' }),
      );
    } catch (error) {
      throw new InputError(`Invalid entity ref "${options.entityRef}"`);
    }

    const entity = await this.options.catalog.getEntityByRef(entityRef, {
      credentials: options.credentials,
    });
    if (!entity) {
      throw new NotFoundError(`Entity "${entityRef}" not found`);
    }
    return this.getTagsForEntity(entity);
  }

  /** Returns the image tags for the given entity, based on its annotations. */
  async getTagsForEntity(entity: Entity): Promise<EntityTagsResult> {
    const entityRef = stringifyEntityRef(entity);
    const annotations = entity.metadata.annotations ?? {};

    const imageName = annotations[JFROG_ARTIFACTORY_ANNOTATION_IMAGE_NAME];
    if (!imageName) {
      throw new InputError(
        `Entity "${entityRef}" is missing the "${JFROG_ARTIFACTORY_ANNOTATION_IMAGE_NAME}" annotation`,
      );
    }

    const host =
      annotations[JFROG_ARTIFACTORY_ANNOTATION_HOST] ??
      this.options.connections.getDefaultHost();
    if (!host) {
      throw new NotFoundError(
        'No JFrog Artifactory connection is configured in jfrogArtifactory.connections',
      );
    }

    const repoFilter =
      annotations[JFROG_ARTIFACTORY_ANNOTATION_REPO_FILTER] ??
      this.options.config.getOptionalString('jfrogArtifactory.repoFilter');

    const tags = await this.getTags({ host, imageName, repoFilter });
    return { entityRef, imageName, host, repoFilter, tags };
  }

  private async getTags(options: {
    host: string;
    imageName: string;
    repoFilter?: string;
  }): Promise<JfrogArtifactoryTagsResponse> {
    const connection = await this.options.connections.find({
      query: {
        url: options.host.includes('://')
          ? options.host
          : `https://${options.host}`,
      },
      authMethods: ['token', 'basic', 'none'],
    });
    const url = `${getConnectionBaseUrl(connection)}/metadata/api/v1/query`;
    const headers = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getConnectionAuthHeaders(connection),
    };

    const pageLimit = this.getPageLimit();
    const filter: Record<string, unknown> = {
      packageId: `docker://${options.imageName}`,
      name: '*',
      ignorePreRelease: false,
    };
    if (options.repoFilter) {
      filter.repositoriesIn = { name: options.repoFilter };
    }

    const edges: JfrogArtifactoryTagEdge[] = [];
    let pageInfo: JfrogArtifactoryPageInfo = {
      hasNextPage: false,
      endCursor: null,
    };
    let after: string | undefined;

    do {
      this.options.logger.debug(
        `Loading tags of image ${options.imageName} from ${connection.host}`,
      );
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: VERSIONS_QUERY,
          variables: {
            filter,
            first: Math.min(MAX_PAGE_SIZE, pageLimit - edges.length),
            after,
            orderBy: { field: this.getSortField(), direction: 'DESC' },
          },
        }),
      });
      if (!response.ok) {
        throw new Error(
          `Failed to load tags from JFrog Artifactory ${connection.host}, status ${response.status}: ${response.statusText}`,
        );
      }
      const body = (await response.json()) as JfrogArtifactoryTagsResponse & {
        errors?: { message: string }[];
      };
      if (!body.data?.versions) {
        const message = body.errors?.map(e => e.message).join(', ');
        throw new Error(
          `Unexpected response from JFrog Artifactory ${connection.host}${
            message ? `: ${message}` : ''
          }`,
        );
      }

      edges.push(
        ...body.data.versions.edges.slice(0, pageLimit - edges.length),
      );
      pageInfo = body.data.versions.pageInfo;
      after = pageInfo.endCursor ?? undefined;
    } while (edges.length < pageLimit && pageInfo.hasNextPage && after);

    return { data: { versions: { edges, pageInfo } } };
  }

  private getSortField(): string {
    const sortField = this.options.config.getOptionalString(
      'jfrogArtifactory.sortField',
    );
    return sortField === 'MODIFIED' ? 'MODIFIED' : 'NAME_SEMVER';
  }

  private getPageLimit(): number {
    return (
      this.options.config.getOptionalNumber('jfrogArtifactory.pageLimit') ??
      DEFAULT_PAGE_LIMIT
    );
  }
}
