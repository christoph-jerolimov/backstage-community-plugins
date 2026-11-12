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

// Development setup for the plugin, with mocked auth and a mocked catalog.
//
// Configure a connection in the workspace app-config.local.yaml, for example:
//
//   connections:
//     - type: jfrog-artifactory
//       host: mycompany.jfrog.io
//       auth:
//         - method: token
//           token: ${JFROG_TOKEN}
//
// Then start the backend with `yarn start` in this package and run:
//
//   curl 'http://localhost:7007/api/jfrog-artifactory/tags?entityRef=component:default/sample'

const backend = createBackend();

backend.add(mockServices.auth.factory());
backend.add(mockServices.httpAuth.factory());

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
            'jfrog-artifactory/image-name': 'sample-image',
          },
        },
        spec: {
          type: 'service',
          owner: 'me',
        },
      },
    ],
  }),
);

backend.add(import('../src'));

backend.start();
