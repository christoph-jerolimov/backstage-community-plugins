/*
 * Copyright 2025 The Backstage Authors
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
  BackstageUserPrincipal,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { NotFoundError, ServiceUnavailableError } from '@backstage/errors';
import { CatalogService } from '@backstage/plugin-catalog-node';

import { CodecovService } from './CodecovService';
import { resolveCodecovRepo } from '../lib/resolveCodecovRepo';
import {
  CODECOV_REPO_ANNOTATION,
  CodecovCoverage,
  CodecovRepoSlug,
  CodecovTotals,
} from '../types';

const DEFAULT_BASE_URL = 'https://api.codecov.io';

export type Options = {
  logger: LoggerService;
  config: RootConfigService;
  catalog: CatalogService;
};

/**
 * Default implementation of {@link CodecovService} that proxies requests to the
 * Codecov REST API, injecting the configured API token.
 */
export class CodecovServiceImpl implements CodecovService {
  private readonly logger: LoggerService;
  private readonly config: RootConfigService;
  private readonly catalog: CatalogService;

  constructor(options: Options) {
    this.logger = options.logger;
    this.config = options.config;
    this.catalog = options.catalog;
  }

  async getCoverage(
    entityRef: string,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<CodecovCoverage> {
    const entity = await this.catalog.getEntityByRef(entityRef, options);
    if (!entity) {
      throw new NotFoundError(`No entity found for ref '${entityRef}'`);
    }

    const slug = resolveCodecovRepo(entity);
    if (!slug) {
      throw new NotFoundError(
        `Entity '${entityRef}' is missing the '${CODECOV_REPO_ANNOTATION}' annotation`,
      );
    }

    const codecovConfig = this.config.getOptionalConfig('codecov');
    const baseUrl =
      codecovConfig?.getOptionalString('baseUrl')?.replace(/\/+$/, '') ??
      DEFAULT_BASE_URL;
    const token = codecovConfig?.getOptionalString('token');

    const { service, owner, repo } = slug;
    const url = `${baseUrl}/api/v2/${encodeURIComponent(
      service,
    )}/${encodeURIComponent(owner)}/repos/${encodeURIComponent(repo)}/`;

    this.logger.info('Fetching Codecov coverage', {
      entityRef,
      service,
      owner,
      repo,
      authenticated: token ? 'yes' : 'no',
    });

    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, { headers });
    } catch (error) {
      throw new ServiceUnavailableError(
        `Failed to reach Codecov API at '${baseUrl}': ${error}`,
      );
    }

    if (response.status === 404) {
      throw new NotFoundError(
        `Codecov has no data for '${service}/${owner}/${repo}'`,
      );
    }
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new ServiceUnavailableError(
        `Codecov API request failed with ${response.status} ${
          response.statusText
        }${body ? `: ${body}` : ''}`,
      );
    }

    const data = (await response.json()) as CodecovRepoApiResponse;
    return toCodecovCoverage(slug, data);
  }
}

/**
 * Partial shape of the Codecov `api/v2/{service}/{owner}/repos/{repo}` response.
 */
interface CodecovRepoApiResponse {
  language?: string | null;
  branch?: string | null;
  private?: boolean;
  totals?: {
    files?: number | string;
    lines?: number | string;
    hits?: number | string;
    misses?: number | string;
    partials?: number | string;
    coverage?: number | string;
    branches?: number | string;
    methods?: number | string;
  } | null;
}

function toNumber(value: number | string | undefined | null): number {
  const parsed = typeof value === 'string' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : 0;
}

function optionalNumber(
  value: number | string | undefined | null,
): number | undefined {
  return value === undefined || value === null ? undefined : toNumber(value);
}

function toTotals(
  totals: CodecovRepoApiResponse['totals'],
): CodecovTotals | null {
  if (!totals) {
    return null;
  }
  return {
    files: toNumber(totals.files),
    lines: toNumber(totals.lines),
    hits: toNumber(totals.hits),
    misses: toNumber(totals.misses),
    partials: toNumber(totals.partials),
    coverage: toNumber(totals.coverage),
    branches: optionalNumber(totals.branches),
    methods: optionalNumber(totals.methods),
  };
}

function toCodecovCoverage(
  slug: CodecovRepoSlug,
  data: CodecovRepoApiResponse,
): CodecovCoverage {
  const { service, owner, repo } = slug;
  return {
    service,
    owner,
    repo,
    branch: data.branch ?? undefined,
    language: data.language ?? undefined,
    private: data.private,
    webUrl: `https://app.codecov.io/${service}/${owner}/${repo}`,
    totals: toTotals(data.totals),
  };
}
