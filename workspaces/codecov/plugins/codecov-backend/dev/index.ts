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
import { createBackend } from '@backstage/backend-defaults';
import { mockServices } from '@backstage/backend-test-utils';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';

// This is the development setup for the Codecov backend plugin. Start it with
// `yarn start` in this package directory and then try, for example:
//
//   curl http://localhost:7007/api/codecov/health
//   curl http://localhost:7007/api/codecov/entities/component:default%2Fsample/coverage
//
// Configure the Codecov API token via app-config under `codecov.token`.

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

// Use a mock catalog with a sample component that points at a Codecov repo.
backend.add(
  catalogServiceMock.factory({
    entities: [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Component',
        metadata: {
          name: 'sample',
          title: 'Sample Component',
          annotations: {
            'codecov.io/repo': 'github/backstage/backstage',
          },
        },
        spec: {
          type: 'service',
        },
      },
    ],
  }),
);

backend.add(import('../src'));

backend.start();
