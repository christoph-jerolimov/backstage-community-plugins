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
  // mockCredentials,
  startTestBackend,
} from '@backstage/backend-test-utils';
import request from 'supertest';

import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

import { ProwBuild } from '@backstage-community/plugin-prow-common';
import { prowPlugin } from './plugin';

describe('plugin', () => {
  it('should return builds', async () => {
    const { server } = await startTestBackend({
      features: [
        prowPlugin,
        catalogServiceMock.factory({
          entities: [
            {
              apiVersion: 'backstage.io/v1alpha1',
              kind: 'Component',
              metadata: {
                name: 'my-component',
                namespace: 'default',
                title: 'My Component',
              },
              spec: {
                type: 'service',
                owner: 'me',
              },
            },
          ],
        }),
      ],
    });

    const entityRef = 'component:default/my-component';
    const response = await request(server).get(
      `/api/prow/${encodeURIComponent(entityRef)}/builds`,
    );

    const expectedBuilds: ProwBuild[] = Array.from({ length: 10 }, (_, i) => ({
      id: expect.any(String),
      state: expect.any(String),
      repository: '-',
      job: '-',
      scheduled: '2024-....',
      duration: '12 minutes',
    }));

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expectedBuilds);
  });
});
