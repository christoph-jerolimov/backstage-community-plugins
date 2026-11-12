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
import { mockServices } from '@backstage/backend-test-utils';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { registerMswTestHooks } from '@backstage/backend-test-utils';
import { setupServer } from 'msw/node';
import {
  createNexusHandlers,
  dockerManifest,
  testConfig,
  testEntities,
} from '../__testUtils__/nexus';
import { DefaultNexusConnectionsService } from '../connections/NexusConnectionsService';
import { NexusRepositoryManagerService } from '../service/NexusRepositoryManagerService';
import { createGetEntityComponentsAction } from './createGetEntityComponentsAction';

describe('createGetEntityComponentsAction', () => {
  const server = setupServer();
  registerMswTestHooks(server);

  it('loads the components of an entity', async () => {
    server.use(...createNexusHandlers());

    const config = mockServices.rootConfig({ data: testConfig });
    const logger = mockServices.logger.mock();
    const actionsRegistry = actionsRegistryServiceMock();
    createGetEntityComponentsAction({
      actionsRegistry,
      nexusService: NexusRepositoryManagerService.create({
        config,
        catalog: catalogServiceMock({ entities: testEntities }),
        connections: DefaultNexusConnectionsService.create({
          config,
          logger,
        }).forPlugin('nexus-repository-manager'),
        logger,
      }),
    });

    const { actions } = await actionsRegistry.list();
    expect(actions).toEqual([
      expect.objectContaining({
        id: 'test:get-entity-components',
        attributes: { readOnly: true, destructive: false, idempotent: true },
      }),
    ]);

    // Invoking validates the input and output against the action schemas
    const { output } = await actionsRegistry.invoke({
      id: 'test:get-entity-components',
      input: { entityRef: 'component:default/docker-image' },
    });

    expect(output).toMatchObject({
      entityRef: 'component:default/docker-image',
      title: 'org/app',
      connection: { host: 'nexus.example.com' },
      components: [
        {
          component: { id: 'docker-1' },
          dockerManifests: [dockerManifest, null],
        },
        { component: { id: 'maven-1' }, dockerManifests: [] },
      ],
    });

    await expect(
      actionsRegistry.invoke({
        id: 'test:get-entity-components',
        input: { entityRef: 'component:default/missing' },
      }),
    ).rejects.toThrow('Entity "component:default/missing" not found');
  });
});
