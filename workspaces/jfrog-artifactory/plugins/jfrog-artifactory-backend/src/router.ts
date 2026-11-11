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
import { HttpAuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { JfrogArtifactoryService } from './service/JfrogArtifactoryService';

export async function createRouter(options: {
  httpAuth: HttpAuthService;
  jfrogArtifactory: JfrogArtifactoryService;
}): Promise<express.Router> {
  const { httpAuth, jfrogArtifactory } = options;
  const router = Router();
  router.use(express.json());

  router.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Returns the image tags of an entity, in the same shape as the JFrog
  // metadata GraphQL API response.
  router.get('/tags', async (req, res) => {
    const entityRef = req.query.entityRef;
    if (typeof entityRef !== 'string' || !entityRef) {
      throw new InputError('Missing required query parameter "entityRef"');
    }
    const result = await jfrogArtifactory.getTagsForEntityRef({
      entityRef,
      credentials: await httpAuth.credentials(req, {
        allow: ['user', 'service'],
      }),
    });
    res.json(result.tags);
  });

  return router;
}
