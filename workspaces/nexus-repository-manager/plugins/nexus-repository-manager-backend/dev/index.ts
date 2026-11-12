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
import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

// Starts a minimal backend with mocked auth and a mocked catalog.
//
//   NEXUS_HOST=nexus.example.com NEXUS_TOKEN=... yarn start
//   curl 'http://localhost:7007/api/nexus-repository-manager/components?entityRef=component:default/sample'

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());
backend.add(
  mockServices.rootConfig.factory({
    data: {
      backend: {
        baseUrl: 'http://localhost:7007',
        listen: { port: 7007 },
      },
      nexusRepositoryManager: {
        experimentalAnnotations: true,
      },
      connections: [
        {
          type: 'nexus-repository-manager',
          host: process.env.NEXUS_HOST ?? 'localhost:8081',
          ...(process.env.NEXUS_HOST
            ? {}
            : { baseUrl: 'http://localhost:8081' }),
          auth: [
            process.env.NEXUS_TOKEN
              ? { method: 'token', token: process.env.NEXUS_TOKEN }
              : { method: 'none' },
          ],
        },
      ],
    },
  }),
);
backend.add(
  catalogServiceMock.factory({
    entities: [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'sample',
          annotations: {
            'nexus-repository-manager/docker.image-name':
              process.env.NEXUS_DOCKER_IMAGE ?? 'janus-idp/backstage-showcase',
          },
        },
        spec: { type: 'service', owner: 'me' },
      },
    ],
  }),
);

backend.add(import('../src'));

backend.start();
