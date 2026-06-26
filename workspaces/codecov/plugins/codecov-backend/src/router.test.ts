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
import {
  mockCredentials,
  mockErrorHandler,
  mockServices,
} from '@backstage/backend-test-utils';
import { NotFoundError } from '@backstage/errors';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { CodecovService } from './services';
import { CodecovCoverage } from './types';

const mockCoverage: CodecovCoverage = {
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
};

describe('createRouter', () => {
  let app: express.Express;
  let codecov: jest.Mocked<CodecovService>;

  beforeEach(async () => {
    codecov = {
      getCoverage: jest.fn(),
    };
    const router = await createRouter({
      httpAuth: mockServices.httpAuth(),
      codecov,
    });
    app = express();
    app.use(router);
    app.use(mockErrorHandler());
  });

  it('responds to health checks', async () => {
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('returns coverage for an entity', async () => {
    codecov.getCoverage.mockResolvedValue(mockCoverage);

    const response = await request(app).get(
      '/entities/component:default%2Fmy-service/coverage',
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockCoverage);
    expect(codecov.getCoverage).toHaveBeenCalledWith(
      'component:default/my-service',
      expect.objectContaining({ credentials: expect.anything() }),
    );
  });

  it('forwards not found errors from the service', async () => {
    codecov.getCoverage.mockRejectedValue(new NotFoundError('nope'));

    const response = await request(app).get(
      '/entities/component:default%2Fmissing/coverage',
    );

    expect(response.status).toBe(404);
  });

  it('rejects unauthenticated requests', async () => {
    codecov.getCoverage.mockResolvedValue(mockCoverage);

    const response = await request(app)
      .get('/entities/component:default%2Fmy-service/coverage')
      .set('Authorization', mockCredentials.none.header());

    expect(response.status).toBe(401);
  });
});
