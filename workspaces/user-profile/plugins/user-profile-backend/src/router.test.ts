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
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { UserProfileService } from './services/UserProfileService';

// TEMPLATE NOTE:
// Testing the router directly allows you to write a unit test that mocks the provided options.
describe('createRouter', () => {
  let app: express.Express;
  let userProfileService: jest.Mocked<UserProfileService>;

  beforeEach(async () => {
    userProfileService = {
      updateUserProfile: jest.fn(),
      getUserProfile: jest.fn(),
    };
    const router = await createRouter({
      httpAuth: mockServices.httpAuth(),
      userProfileService,
    });
    app = express();
    app.use(router);
    app.use(mockErrorHandler());
  });

  it('should create a user profile', async () => {
    userProfileService.updateUserProfile.mockResolvedValue({ description: '' });

    const response = await request(app).post('/user-ref').send({
      description: 'This is my new profile bio!',
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ description: '' });
  });

  it('should not allow unauthenticated requests to create a TODO', async () => {
    const response = await request(app)
      .post('/user-ref')
      .set('Authorization', mockCredentials.none.header())
      .send({
        description: 'This is my new profile bio!',
      });

    expect(response.status).toBe(401);
  });
});
