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
import { createGetEntityComponentsAction } from './actions/createGetEntityComponentsAction';
import { DefaultNexusConnectionsService } from './connections/NexusConnectionsService';
import { createRouter } from './router';
import { NexusRepositoryManagerService } from './service/NexusRepositoryManagerService';

/**
 * Backend plugin that loads Nexus Repository Manager components for catalog
 * entities, through an HTTP API and the actions registry.
 *
 * @public
 */
export const nexusRepositoryManagerPlugin = createBackendPlugin({
  pluginId: 'nexus-repository-manager',
  register(env) {
    env.registerInit({
      deps: {
        actionsRegistry: actionsRegistryServiceRef,
        catalog: catalogServiceRef,
        config: coreServices.rootConfig,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        logger: coreServices.logger,
      },
      async init({
        actionsRegistry,
        catalog,
        config,
        httpAuth,
        httpRouter,
        logger,
      }) {
        const connections = DefaultNexusConnectionsService.create({
          config,
          logger,
        }).forPlugin('nexus-repository-manager');
        const nexusService = NexusRepositoryManagerService.create({
          config,
          catalog,
          connections,
          logger,
        });

        httpRouter.use(await createRouter({ httpAuth, nexusService }));
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });

        createGetEntityComponentsAction({ actionsRegistry, nexusService });
      },
    });
  },
});
