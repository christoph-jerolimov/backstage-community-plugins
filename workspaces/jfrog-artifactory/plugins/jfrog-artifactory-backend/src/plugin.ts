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
import { DefaultJfrogArtifactoryConnectionsService } from './connections/JfrogArtifactoryConnectionsService';
import { createRouter } from './router';
import { JfrogArtifactoryService } from './service/JfrogArtifactoryService';

/**
 * The JFrog Artifactory backend plugin.
 *
 * @public
 */
export const jfrogArtifactoryPlugin = createBackendPlugin({
  pluginId: 'jfrog-artifactory',
  register(env) {
    env.registerInit({
      deps: {
        config: coreServices.rootConfig,
        logger: coreServices.logger,
        httpAuth: coreServices.httpAuth,
        httpRouter: coreServices.httpRouter,
        catalog: catalogServiceRef,
        actionsRegistry: actionsRegistryServiceRef,
      },
      async init({
        config,
        logger,
        httpAuth,
        httpRouter,
        catalog,
        actionsRegistry,
      }) {
        const jfrogArtifactory = new JfrogArtifactoryService({
          config,
          logger,
          catalog,
          connections: DefaultJfrogArtifactoryConnectionsService.create({
            config,
            logger,
          }).forPlugin('jfrog-artifactory', { logger }),
        });

        httpRouter.use(await createRouter({ httpAuth, jfrogArtifactory }));
        httpRouter.addAuthPolicy({ path: '/health', allow: 'unauthenticated' });

        createGetImageTagsAction({ actionsRegistry, jfrogArtifactory });
      },
    });
  },
});
