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

import { Knex } from 'knex';

import { UserProfile, UserProfileService } from './UserProfileService';
import { ProfileTable } from '../types';

export type Options = {
  logger: LoggerService;
  auth: AuthService;
  config: RootConfigService;
  catalog: typeof catalogServiceRef.T;
  dbClient: Knex;
};

export class UserProfileServiceImpl implements UserProfileService {
  private readonly logger: LoggerService;
  private readonly auth: AuthService;
  private readonly config: RootConfigService;
  private readonly catalog: typeof catalogServiceRef.T;
  private readonly dbClient: Knex;

  constructor(options: Options) {
    this.logger = options.logger;
    this.auth = options.auth;
    this.config = options.config;
    this.catalog = options.catalog;
    this.dbClient = options.dbClient;
  }

  async getUserProfile(
    credentials: BackstageCredentials<BackstageUserPrincipal>,
    entityRef: string,
  ): Promise<UserProfile> {
    await this.checkEntityReadAccess(credentials, entityRef);

    const profile = await this.dbClient
      .table<ProfileTable>('profiles')
      .select('*')
      .where({
        entity_ref: entityRef,
        deleted_at: null,
      });

    if (!profile.length) {
      return {};
    }

    return JSON.parse(profile[0].profile);
  }

  async updateUserProfile(
    credentials: BackstageCredentials<BackstageUserPrincipal>,
    entityRef: string,
    userProfile: UserProfile,
  ): Promise<UserProfile> {
    this.logger.info('Update user profile', {
      entityRef,
      userProfile: JSON.stringify(userProfile),
    });
    await this.checkEntityReadAccess(credentials, entityRef);

    // TODO: why does this transaction doesn't work?
    await this.dbClient.transaction(async tx => {
      await tx<ProfileTable>('profiles')
        .where({
          entity_ref: entityRef,
          deleted_at: null,
        })
        .update({
          deleted_at: new Date(),
        });
      await tx<ProfileTable>('profiles').insert({
        entity_ref: entityRef,
        profile: JSON.stringify(userProfile),
      });
    });

    await this.refreshEntity(entityRef);

    return userProfile;
  }

  private async checkEntityReadAccess(
    credentials: BackstageCredentials<BackstageUserPrincipal>,
    entityRef: string,
  ) {
    this.logger.info('Get user profile', { entityRef });
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'catalog',
    });
    const entity = await this.catalog.getEntityByRef(entityRef, {
      token,
    });
    if (!entity) {
      throw new NotFoundError(`No entity found for ref '${entityRef}'`);
    }
  }

  private async refreshEntity(entityRef: string) {
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: await this.auth.getOwnServiceCredentials(),
      targetPluginId: 'catalog',
    });
    await this.catalog.refreshEntity(entityRef, { token });
  }
}
