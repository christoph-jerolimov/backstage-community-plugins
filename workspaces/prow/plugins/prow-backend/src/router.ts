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
import { HttpAuthService } from '@backstage/backend-plugin-api';
import express from 'express';
import Router from 'express-promise-router';
import { ProwService } from './services/ProwService';

export async function createRouter({
  httpAuth,
  prowService,
}: {
  httpAuth: HttpAuthService;
  prowService: ProwService;
}): Promise<express.Router> {
  const router = Router();
  router.use(express.json());

  router.get('/:entityRef/builds', async (req, res) => {
    const entityRef = req.params.entityRef;
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const builds = await prowService.getBuilds(entityRef, {
      credentials,
    });
    res.json(builds);
  });

  return router;
}
