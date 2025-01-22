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
import { LoggerService } from '@backstage/backend-plugin-api';
import {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
  LocationSpec,
} from '@backstage/plugin-catalog-node';
import { Entity, stringifyEntityRef } from '@backstage/catalog-model';

import { Knex } from 'knex';

export type Options = {
  logger: LoggerService;
  dbClient: Knex;
};

// TODO: move into shared node package
interface ProfileTable {
  entity_ref: string;
  profile: string;
  created_at: Date;
  deleted_at: Date | null;
}

/**
 * @public
 */
export class UserProfileCatalogProcessor implements CatalogProcessor {
  private readonly logger: LoggerService;
  private readonly dbClient: Knex;

  constructor(options: Options) {
    this.logger = options.logger;
    this.dbClient = options.dbClient;
  }

  getProcessorName(): string {
    return 'UserProfileCatalogProcessor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    return entity.kind === 'User';
  }

  async preProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
    _originLocation: LocationSpec,
    _cache: CatalogProcessorCache,
  ): Promise<Entity> {
    const entityRef = stringifyEntityRef(entity);

    if (entity.kind !== 'User') {
      this.logger.info(
        `UserProfileCatalogProcessor unexpected entity!!!! ${entityRef}`,
      );
      return entity;
    }

    this.logger.info(
      `UserProfileCatalogProcessor preProcessEntity ${entityRef}`,
    );

    try {
      let profile: any;

      // TODO: why does this transaction doesn't work?
      await this.dbClient.transaction(async tx => {
        profile = await tx.table<ProfileTable>('profiles').select('*').where({
          entity_ref: entityRef,
          deleted_at: null,
        });
      });

      // const profile = await this.dbClient
      //   .table<ProfileTable>('profiles')
      //   .select('*')
      //   .where({
      //     entity_ref: entityRef,
      //     deleted_at: null,
      //   });

      if (!profile.length) {
        this.logger.info('UserProfileCatalogProcessor did not find a profile!');
        return entity;
      }

      const userProfile = JSON.parse(profile[0].profile);

      this.logger.info('UserProfileCatalogProcessor found profile!', {
        userProfile: JSON.stringify(userProfile),
      });

      return {
        ...entity,
        metadata: {
          ...entity.metadata,
          tags: [
            ...(entity.metadata.tags || []),
            ...(userProfile.more?.tags || []),
          ],
          links: [
            ...(entity.metadata.links || []),
            ...(userProfile.more?.links || []),
          ],
        },
        spec: {
          ...(entity.spec || {}),
          profile: {
            ...userProfile,
            ...((entity.spec?.profile || {}) as any),
            displayName:
              userProfile.about?.displayName ||
              (entity.spec?.profile as any)?.displayName,
          },
        },
      };
    } catch (error) {
      this.logger.error('UserProfileCatalogProcessor error', error);
      return entity;
    }
  }
}
