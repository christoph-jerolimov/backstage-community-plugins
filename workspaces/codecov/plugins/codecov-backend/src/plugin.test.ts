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
import { mockServices, startTestBackend } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import request from 'supertest';

import { codecovPlugin } from './plugin';

const sampleComponent = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'my-service',
    namespace: 'default',
    annotations: {
      'codecov.io/repo': 'github/backstage/backstage',
    },
  },
  spec: {
    type: 'service',
    owner: 'me',
  },
};

describe('codecovPlugin', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  async function startBackend() {
    return startTestBackend({
      features: [
        codecovPlugin,
        mockServices.rootConfig.factory({
          data: { codecov: { token: 'secret-token' } },
        }),
        catalogServiceMock.factory({ entities: [sampleComponent] }),
      ],
    });
  }

  it('exposes a health endpoint', async () => {
    const { server } = await startBackend();

    const response = await request(server).get('/api/codecov/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('proxies Codecov coverage for an entity and injects the token', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        language: 'typescript',
        branch: 'master',
        private: false,
        totals: {
          files: 100,
          lines: 1000,
          hits: 850,
          misses: 100,
          partials: 50,
          coverage: 85,
        },
      }),
    } as Response);

    const { server } = await startBackend();

    const response = await request(server).get(
      '/api/codecov/entities/component:default%2Fmy-service/coverage',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      service: 'github',
      owner: 'backstage',
      repo: 'backstage',
      branch: 'master',
      language: 'typescript',
      private: false,
      webUrl: 'https://app.codecov.io/github/backstage/backstage',
      totals: {
        files: 100,
        lines: 1000,
        hits: 850,
        misses: 100,
        partials: 50,
        coverage: 85,
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.codecov.io/api/v2/github/backstage/repos/backstage/',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret-token',
        }),
      }),
    );
  });

  it('returns 404 when the entity has no Codecov annotation', async () => {
    const { server } = await startTestBackend({
      features: [
        codecovPlugin,
        mockServices.rootConfig.factory({
          data: { codecov: { token: 'secret-token' } },
        }),
        catalogServiceMock.factory({
          entities: [
            {
              apiVersion: 'backstage.io/v1alpha1',
              kind: 'Component',
              metadata: { name: 'no-annotation', namespace: 'default' },
              spec: { type: 'service', owner: 'me' },
            },
          ],
        }),
      ],
    });

    const response = await request(server).get(
      '/api/codecov/entities/component:default%2Fno-annotation/coverage',
    );

    expect(response.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
