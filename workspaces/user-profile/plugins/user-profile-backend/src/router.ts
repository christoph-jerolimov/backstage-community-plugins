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
import { InputError } from '@backstage/errors';
import { z } from 'zod';
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

  const userProfileSchema = z.object({
    description: z.string(),
  });

  router.post('/:entityRef', async (req, res) => {
    const parsed = userProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new InputError(parsed.error.toString());
    }
    const userProfile = await userProfileService.updateUserProfile(
      req.params.entityRef,
      parsed.data,
      {
        credentials: await httpAuth.credentials(req, { allow: ['user'] }),
      },
    );
    res.json(userProfile);
  });

  router.get('/:entityRef', async (req, res) => {
    const userProfile = await userProfileService.getUserProfile(
      req.params.entityRef,
      {
        credentials: await httpAuth.credentials(req, { allow: ['user'] }),
      },
    );
    res.json(userProfile);
  });

  return router;
}
