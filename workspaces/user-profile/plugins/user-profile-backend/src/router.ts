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
import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { UserProfileService } from './services/UserProfileService';

export async function createRouter({
  httpAuth,
  userProfileService,
}: {
  httpAuth: HttpAuthService;
  userProfileService: UserProfileService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/catalog/entities/:entityRef/profile', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });

    const userProfile = await userProfileService.getUserProfile(
      credentials,
      req.params.entityRef,
    );

    res.json(userProfile);
  });

  router.post('/catalog/entities/:entityRef/profile', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });

    // TODO: how can we verify that the body is a valid JSON object?
    const userProfile = await userProfileService.updateUserProfile(
      credentials,
      req.params.entityRef,
      req.body,
    );

    res.json(userProfile);
  });

  return router;
}
