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
import type { HttpAuthService } from '@backstage/backend-plugin-api';
import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { z } from 'zod/v4';
import type { AcrImagesService } from './service/AcrImagesService';

const tagsQuerySchema = z.object({
  entityRef: z.string().min(1),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export async function createRouter(options: {
  httpAuth: HttpAuthService;
  images: AcrImagesService;
}): Promise<express.Router> {
  const { httpAuth, images } = options;
  const router = Router();
  router.use(express.json());

  router.get('/tags', async (req, res) => {
    const parsed = tagsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new InputError(z.prettifyError(parsed.error));
    }
    const credentials = await httpAuth.credentials(req, {
      allow: ['user', 'service'],
    });
    res.json(
      await images.getImageTags({
        entityRef: parsed.data.entityRef,
        limit: parsed.data.limit,
        credentials,
      }),
    );
  });

  return router;
}
