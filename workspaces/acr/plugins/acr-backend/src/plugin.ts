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
  coreServices,
  createBackendPlugin,
} from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { catalogServiceRef } from '@backstage/plugin-catalog-node';
import { createGetImageTagsAction } from './actions/createGetImageTagsAction';
import { DefaultAcrConnectionsService } from './connections/AcrConnectionsService';
import { createRouter } from './router';
import { AcrImagesService } from './service/AcrImagesService';

/**
 * Azure Container Registry backend plugin.
 *
 * @public
 */
export const acrPlugin = createBackendPlugin({
  pluginId: 'acr',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        pluginMetadata: coreServices.pluginMetadata,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        config,
        logger,
        pluginMetadata,
        httpAuth,
        httpRouter,
        catalog,
        actionsRegistry,
      }) {
        const acrConnections = DefaultAcrConnectionsService.create({
          config,
          logger,
        });
        const images = new AcrImagesService({
          catalog,
          connections: acrConnections.forPlugin(pluginMetadata.getId(), {
            logger,
          }),
          defaultRegistryUrl: acrConnections.getDefaultUrl(),
          logger,
        });

        createGetImageTagsAction({ actionsRegistry, images });
        httpRouter.use(await createRouter({ httpAuth, images }));
      },
    });
  },
});
