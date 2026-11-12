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
import type { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import {
  ACR_ANNOTATION_REGISTRY_NAME,
  ACR_ANNOTATION_REPOSITORY_NAME,
  AcrImagesService,
  DEFAULT_TAGS_LIMIT,
} from '../service/AcrImagesService';

export function createGetImageTagsAction(options: {
  actionsRegistry: ActionsRegistryService;
  images: AcrImagesService;
}) {
  const { actionsRegistry, images } = options;

  actionsRegistry.register({
    name: 'get-image-tags',
    title: 'Get Azure Container Registry image tags',
    description: `Returns the container image tags from Azure Container Registry for a catalog entity, newest first. The entity must have the "${ACR_ANNOTATION_REPOSITORY_NAME}" annotation and can select a registry with the "${ACR_ANNOTATION_REGISTRY_NAME}" annotation.`,
    attributes: {
      readOnly: true,
      destructive: false,
      idempotent: true,
    },
    schema: {
      input: z =>
        z.object({
          entityRef: z
            .string()
            .describe(
              'The entity reference of the catalog entity, for example "component:default/my-service"',
            ),
          limit: z
            .number()
            .int()
            .min(1)
            .max(1000)
            .optional()
            .describe(
              `The maximum number of tags to return, defaults to ${DEFAULT_TAGS_LIMIT}`,
            ),
        }),
      output: z =>
        z.object({
          registry: z.string().describe('The registry host'),
          imageName: z.string().describe('The repository (image) name'),
          tags: z.array(
            z.object({
              name: z.string(),
              digest: z.string(),
              createdTime: z.string(),
              lastUpdateTime: z.string(),
              signed: z.boolean().optional(),
              changeableAttributes: z
                .object({
                  deleteEnabled: z.boolean().optional(),
                  listEnabled: z.boolean().optional(),
                  readEnabled: z.boolean().optional(),
                  writeEnabled: z.boolean().optional(),
                })
                .optional(),
            }),
          ),
        }),
    },
    action: async ({ input, credentials }) => {
      const output = await images.getImageTags({
        entityRef: input.entityRef,
        limit: input.limit,
        credentials,
      });
      return { output };
    },
  });
}
