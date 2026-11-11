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
  mockServices,
  registerMswTestHooks,
  startTestBackend,
} from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import {
  createNexusHandlers,
  type RecordedRequest,
  dockerManifest,
  testConfig,
  testEntities,
} from './__testUtils__/nexus';
import { nexusRepositoryManagerPlugin } from './plugin';

describe('nexusRepositoryManagerPlugin', () => {
  const server = setupServer();
  registerMswTestHooks(server);

  const requests: RecordedRequest[] = [];
  beforeEach(() => {
    requests.length = 0;
    server.use(
      ...createNexusHandlers(requests),
      // Let supertest reach the test backend
      rest.all('http://127.0.0.1*', req => req.passthrough()),
    );
  });

  async function startBackend() {
    const { server: backend } = await startTestBackend({
      features: [
        nexusRepositoryManagerPlugin,
        mockServices.rootConfig.factory({ data: testConfig }),
        catalogServiceMock.factory({ entities: testEntities }),
      ],
    });
    return backend;
  }

  it('loads the components of an entity from the default connection', async () => {
    const backend = await startBackend();

    const res = await request(backend)
      .get('/api/nexus-repository-manager/components')
      .query({ entityRef: 'Component:docker-image' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      entityRef: 'component:default/docker-image',
      title: 'org/app',
      connection: {
        title: 'Main Nexus',
        host: 'nexus.example.com',
        baseUrl: 'https://nexus.example.com',
      },
      components: [
        {
          component: expect.objectContaining({ id: 'docker-1' }),
          dockerManifests: [dockerManifest, null],
        },
        {
          component: expect.objectContaining({
            id: 'maven-1',
            assets: [
              expect.objectContaining({
                maven2: { extension: 'jar' },
                fileSize: 1234,
              }),
              expect.objectContaining({
                maven2: { extension: 'pom' },
                fileSize: 0,
              }),
            ],
          }),
          dockerManifests: [],
        },
      ],
    });

    const searches = requests.filter(r => r.url.includes('/v1/search'));
    expect(searches.map(r => new URL(r.url).search)).toEqual([
      '?docker.imageName=org%2Fapp&sort=version',
      '?docker.imageName=org%2Fapp&sort=version&continuationToken=page-2',
    ]);
    expect(requests).toHaveLength(5);
    for (const req of requests) {
      expect(req.authorization).toBe('Bearer secret-token');
    }
  });

  it('uses the connection from the host annotation and the title annotation', async () => {
    const backend = await startBackend();

    const res = await request(backend)
      .get('/api/nexus-repository-manager/components')
      .query({ entityRef: 'component:default/maven-artifact' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      entityRef: 'component:default/maven-artifact',
      title: 'My library',
      connection: {
        title: 'other-nexus.example.com:8443',
        host: 'other-nexus.example.com:8443',
        baseUrl: 'https://other-nexus.example.com:8443',
      },
      components: [],
    });
    expect(requests).toHaveLength(1);
    expect(new URL(requests[0].url).search).toBe(
      '?docker.imageTag=latest&sort=version',
    );
    expect(requests[0].authorization).toBe(
      `Basic ${Buffer.from('user:pass').toString('base64')}`,
    );
  });

  it('rejects invalid requests', async () => {
    const backend = await startBackend();
    const get = (query: object) =>
      request(backend)
        .get('/api/nexus-repository-manager/components')
        .query(query);

    await expect(get({})).resolves.toMatchObject({ status: 400 });
    await expect(get({ entityRef: 'component:' })).resolves.toMatchObject({
      status: 400,
    });
    await expect(
      get({ entityRef: 'component:default/missing' }),
    ).resolves.toMatchObject({ status: 404 });
    await expect(
      get({ entityRef: 'component:default/no-annotations' }),
    ).resolves.toMatchObject({
      status: 400,
      body: {
        error: {
          message:
            'Entity "component:default/no-annotations" has no Nexus Repository Manager annotations',
        },
      },
    });
    expect(requests).toHaveLength(0);

    await request(backend)
      .get('/api/nexus-repository-manager/health')
      .set('Authorization', 'Bearer mock-none-token')
      .expect(200, { status: 'ok' });
  });
});
