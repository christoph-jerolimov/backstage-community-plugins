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
import { createServiceFactory } from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import {
  mockCredentials,
  mockServices,
  startTestBackend,
} from '@backstage/backend-test-utils';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import request from 'supertest';
import { acrPlugin } from './plugin';

const tagsResponse = {
  registry: 'one.azurecr.io',
  imageName: 'team/app',
  tags: [
    {
      name: 'latest',
      digest: 'sha256:abc',
      createdTime: '2024-01-01T00:00:00Z',
      lastUpdateTime: '2024-01-02T00:00:00Z',
      signed: false,
      changeableAttributes: {
        deleteEnabled: true,
        listEnabled: true,
        readEnabled: true,
        writeEnabled: true,
      },
    },
  ],
};

function entity(name: string, annotations: Record<string, string>) {
  return {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name, namespace: 'default', annotations },
    spec: { type: 'service' },
  };
}

describe('acrPlugin', () => {
  const fetchMock = jest.spyOn(global, 'fetch');

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      async () =>
        new Response(JSON.stringify(tagsResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );
  });

  afterAll(() => {
    fetchMock.mockRestore();
  });

  async function startBackend() {
    const actionsRegistry = actionsRegistryServiceMock();
    const { server } = await startTestBackend({
      features: [
        acrPlugin,
        mockServices.rootConfig.factory({
          data: {
            acr: {
              connections: [
                {
                  type: 'azure-container-registry',
                  host: 'one.azurecr.io',
                  auth: [{ method: 'token', token: 'secret-token' }],
                },
                {
                  type: 'azure-container-registry',
                  host: 'two.azurecr.io',
                  auth: [
                    { method: 'basic', username: 'user', password: 'pass' },
                  ],
                },
              ],
            },
          },
        }),
        catalogServiceMock.factory({
          entities: [
            entity('app', {
              'azure-container-registry/repository-name': 'team/app',
            }),
            entity('other-app', {
              'azure-container-registry/repository-name': 'other-app',
              'azure-container-registry/registry-name': 'two',
            }),
            entity('unknown-registry', {
              'azure-container-registry/repository-name': 'app',
              'azure-container-registry/registry-name': 'unknown',
            }),
            entity('no-annotation', {}),
          ],
        }),
        createServiceFactory({
          service: actionsRegistryServiceRef,
          deps: {},
          factory: () => actionsRegistry,
        }),
      ],
    });
    return { server, actionsRegistry };
  }

  it('loads image tags for an entity from the configured connection', async () => {
    const { server } = await startBackend();

    const res = await request(server).get(
      '/api/acr/tags?entityRef=component:default/app',
    );
    expect(res.status).toBe(200);
    expect(res.body).toEqual(tagsResponse);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://one.azurecr.io/acr/v1/team/app/_tags?orderby=timedesc&n=100',
      {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer secret-token',
        },
      },
    );

    const other = await request(server).get(
      '/api/acr/tags?entityRef=component:default/other-app&limit=5',
    );
    expect(other.status).toBe(200);
    expect(fetchMock).toHaveBeenLastCalledWith(
      'https://two.azurecr.io/acr/v1/other-app/_tags?orderby=timedesc&n=5',
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Basic ${Buffer.from('user:pass').toString('base64')}`,
        },
      },
    );
  });

  it('returns errors for invalid requests', async () => {
    const { server } = await startBackend();

    const missingRef = await request(server).get('/api/acr/tags');
    expect(missingRef.status).toBe(400);

    const badLimit = await request(server).get(
      '/api/acr/tags?entityRef=component:default/app&limit=0',
    );
    expect(badLimit.status).toBe(400);

    const notFound = await request(server).get(
      '/api/acr/tags?entityRef=component:default/missing',
    );
    expect(notFound.status).toBe(404);

    const noAnnotation = await request(server).get(
      '/api/acr/tags?entityRef=component:default/no-annotation',
    );
    expect(noAnnotation.status).toBe(400);
    expect(noAnnotation.body.error.message).toContain(
      'azure-container-registry/repository-name',
    );

    const unknownRegistry = await request(server).get(
      '/api/acr/tags?entityRef=component:default/unknown-registry',
    );
    expect(unknownRegistry.status).toBe(404);
    expect(unknownRegistry.body.error.message).toContain(
      'https://unknown.azurecr.io',
    );

    fetchMock.mockResolvedValueOnce(new Response('', { status: 404 }));
    const missingRepo = await request(server).get(
      '/api/acr/tags?entityRef=component:default/app',
    );
    expect(missingRepo.status).toBe(404);

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('registers an action that loads image tags for an entity', async () => {
    const { actionsRegistry } = await startBackend();

    const { actions } = await actionsRegistry.list();
    expect(actions).toEqual([
      expect.objectContaining({
        name: 'get-image-tags',
        attributes: { readOnly: true, destructive: false, idempotent: true },
      }),
    ]);

    await expect(
      actionsRegistry.invoke({
        id: 'test:get-image-tags',
        input: { entityRef: 'component:default/app', limit: 10 },
        credentials: mockCredentials.user(),
      }),
    ).resolves.toEqual({ output: tagsResponse });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://one.azurecr.io/acr/v1/team/app/_tags?orderby=timedesc&n=10',
      expect.anything(),
    );
  });
});
