/*
 * Copyright 2024 The Backstage Authors
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
import { createRouter } from './router';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';
import { ProwServiceMock } from './services/ProwServiceMock';

/**
 * prowPlugin backend plugin
 *
 * @public
 */
export const prowPlugin = createBackendPlugin({
  pluginId: 'prow',
  register(env) {
    env.registerInit({
      deps: {
        logger: coreServices.logger,
        auth: coreServices.auth,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
      },
      async init({ logger, auth, config, httpAuth, httpRouter, catalog }) {
        const prowService = new ProwServiceMock({
          logger,
          auth,
          config,
          catalog,
        });

        httpRouter.use(
          await createRouter({
            httpAuth,
            prowService,
          }),
        );
      },
    });
  },
});
