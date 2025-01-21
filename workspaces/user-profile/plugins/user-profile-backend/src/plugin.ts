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
  coreServices,
  createBackendPlugin,
  resolvePackagePath,
} from '@backstage/backend-plugin-api';
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
import { UserProfileService } from './services/UserProfileService';
import { UserProfileServiceImpl } from './services/UserProfileServiceImpl';

/**
 * userProfilePlugin backend plugin
 *
 * @public
 */
export const userProfilePlugin = createBackendPlugin({
  pluginId: 'user-profile',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        database: coreServices.database,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
      },
      async init({
        logger,
        auth,
        config,
        database,
        httpAuth,
        httpRouter,
        catalog,
      }) {
        const dbClient = await database.getClient();

        const migrationsDir = resolvePackagePath(
          '@backstage-community/plugin-user-profile-backend',
          'migrations',
        );
        if (!database.migrations?.skip) {
          await dbClient.migrate.latest({
            directory: migrationsDir,
          });
        }

        const userProfileService: UserProfileService =
          new UserProfileServiceImpl({
            logger,
            auth,
            config,
            catalog,
            dbClient,
          });

        httpRouter.use(
          await createRouter({
            httpAuth,
            userProfileService,
          }),
        );
      },
    });
  },
});
