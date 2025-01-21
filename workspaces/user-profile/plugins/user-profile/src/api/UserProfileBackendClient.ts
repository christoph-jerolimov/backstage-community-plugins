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

import { UserProfile, UserProfileBackendApi } from './UserProfileBackendApi';

export type Options = {
  discoveryApi: DiscoveryApi;
  fetchApi: FetchApi;
};

export class UserProfileBackendClient implements UserProfileBackendApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;

  constructor(options: Options) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
  }

  async getUserProfile(entityRef: string): Promise<any> {
    const baseUrl = await this.discoveryApi.getBaseUrl('user-profile');
    const url = `${baseUrl}/catalog/entities/${encodeURIComponent(
      entityRef,
    )}/profile`;
    const response = await this.fetchApi.fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });
    // TODO: use backstage error handling
    if (!response.ok) {
      throw new Error(
        `Unexpected status code: ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  }

  async updateUserProfile(
    entityRef: string,
    userProfile: UserProfile,
  ): Promise<UserProfile> {
    const baseUrl = await this.discoveryApi.getBaseUrl('user-profile');
    const url = `${baseUrl}/catalog/entities/${encodeURIComponent(
      entityRef,
    )}/profile`;
    const response = await this.fetchApi.fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(userProfile),
    });
    // TODO: use backstage error handling
    if (!response.ok) {
      throw new Error(
        `Unexpected status code: ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  }
}
