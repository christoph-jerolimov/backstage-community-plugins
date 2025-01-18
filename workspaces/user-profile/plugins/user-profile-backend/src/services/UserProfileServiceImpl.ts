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
  AuthService,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';

import { UserProfile, UserProfileService } from './UserProfileService';

export type Options = {
  logger: LoggerService;
  auth: AuthService;
  config: RootConfigService;
  // TODO update CatalogService
  catalog: typeof catalogServiceRef.T;
};

export class UserProfileServiceImpl implements UserProfileService {
  private readonly logger: LoggerService;
  private readonly auth: AuthService;
  private readonly config: RootConfigService;
  private readonly catalog: typeof catalogServiceRef.T;

  constructor(options: Options) {
    this.logger = options.logger;
    this.auth = options.auth;
    this.config = options.config;
    this.catalog = options.catalog;
  }

  async updateUserProfile(
    entityRef: string,
    userProfile: UserProfile,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<UserProfile> {
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: options.credentials,
      targetPluginId: 'catalog',
    });
    const entity = await this.catalog.getEntityByRef(entityRef, {
      token,
    });
    if (!entity) {
      throw new NotFoundError(`No entity found for ref '${entityRef}'`);
    }
    return { description: '' };
  }

  async getUserProfile(
    entityRef: string,
    options: {
      credentials: BackstageCredentials<BackstageUserPrincipal>;
    },
  ): Promise<UserProfile> {
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: options.credentials,
      targetPluginId: 'catalog',
    });
    const entity = await this.catalog.getEntityByRef(entityRef, {
      token,
    });
    if (!entity) {
      throw new NotFoundError(`No entity found for ref '${entityRef}'`);
    }
    return { description: '' };
  }
}
