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
  mockCredentials,
  mockErrorHandler,
  mockServices,
} from '@backstage/backend-test-utils';
import express from 'express';
import request from 'supertest';

import {
  ProwBuild,
  ProwBuildState,
} from '@backstage-community/plugin-prow-common';

import { createRouter } from './router';
import { ProwService } from './services/ProwService';

const createBuildState = (i: number) => {
  if (i < 2) return ProwBuildState.PENDING;
  if (i === 5) return ProwBuildState.FAILED;
  return ProwBuildState.SUCCEEDED;
};

const mockBuilds: ProwBuild[] = Array.from({ length: 10 }, (_, i) => ({
  id: (i + 3143241324).toString(),
  state: createBuildState(i),
  repository: '-',
  job: '-',
  scheduled: '2024-....',
  duration: '12 minutes',
}));

// Testing the router directly allows you to write a unit test that mocks the provided options.
describe('createRouter', () => {
  let app: express.Express;
  let prowService: jest.Mocked<ProwService>;

  beforeEach(async () => {
    prowService = {
      getBuilds: jest.fn(),
    };
    const router = await createRouter({
      httpAuth: mockServices.httpAuth(),
      prowService,
    });
    app = express();
    app.use(router);
    app.use(mockErrorHandler());
  });

  it('should return mocked data', async () => {
    prowService.getBuilds.mockResolvedValue(mockBuilds);

    const response = await request(app).get('/my-entity/builds');

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockBuilds);
  });

  it('should not allow unauthenticated requests', async () => {
    prowService.getBuilds.mockResolvedValue(mockBuilds);

    const response = await request(app)
      .get('/anohter-entity/builds')
      .set('Authorization', mockCredentials.none.header());

    expect(response.status).toBe(401);
  });
});
