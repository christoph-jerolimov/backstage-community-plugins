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
import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';

import { CodecovApi } from './CodecovApi';
import { CodecovCoverage } from '../types';

/**
 * Options for the {@link CodecovClient}.
 *
 * @public
 */
export type CodecovClientOptions = {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
};

/**
 * Default {@link CodecovApi} implementation that talks to the `codecov`
 * backend plugin, which proxies the authenticated Codecov API.
 *
 * @public
 */
export class CodecovClient implements CodecovApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: CodecovClientOptions) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async getCoverage(entityRef: string): Promise<CodecovCoverage> {
    const baseUrl = await this.discoveryApi.getBaseUrl('codecov');
    const url = `${baseUrl}/entities/${encodeURIComponent(entityRef)}/coverage`;

    const response = await this.fetchApi.fetch(url);
    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    return (await response.json()) as CodecovCoverage;
  }
}
