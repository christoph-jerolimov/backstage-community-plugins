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
} from '@backstage/backend-plugin-api';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';

import { createRouter } from './router';
import { CodecovServiceImpl } from './services';

/**
 * The Codecov backend plugin.
 *
 * Acts as an authenticated proxy in front of the Codecov API: it reads the API
 * token from the app config and resolves the repository for an entity from the
 * catalog, so the token is never exposed to the frontend.
 *
 * @public
 */
export const codecovPlugin = createBackendPlugin({
  pluginId: 'codecov',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
      },
      async init({ logger, config, httpAuth, httpRouter, catalog }) {
        const codecov = new CodecovServiceImpl({ logger, config, catalog });

        httpRouter.use(
          await createRouter({
            httpAuth,
            codecov,
          }),
        );
      },
    });
  },
});
