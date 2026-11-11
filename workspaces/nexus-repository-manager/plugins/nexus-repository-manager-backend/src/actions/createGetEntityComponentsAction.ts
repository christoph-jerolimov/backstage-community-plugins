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
import type { NexusRepositoryManagerService } from '../service/NexusRepositoryManagerService';

/**
 * Registers the `nexus-repository-manager:get-entity-components` action.
 */
export function createGetEntityComponentsAction(options: {
  actionsRegistry: ActionsRegistryService;
  nexusService: NexusRepositoryManagerService;
}) {
  const { actionsRegistry, nexusService } = options;

  actionsRegistry.register({
    name: 'get-entity-components',
    title: 'Get Nexus Repository Manager components for an entity',
    description: `Loads the components (artifacts and images) from Nexus Repository Manager that belong to a catalog entity.

The components are found with the entity's nexus-repository-manager/* annotations, for example nexus-repository-manager/docker.image-name. Each component lists its assets with download URL, size, checksums and last modified date. Docker components also include their image manifests.`,
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
              'The entity ref of the catalog entity, for example component:default/my-service',
            ),
        }),
      output: z =>
        z.object({
          entityRef: z.string(),
          title: z.string().describe('Display title of the search'),
          connection: z
            .object({
              title: z.string(),
              host: z.string(),
              baseUrl: z.string(),
            })
            .describe('The Nexus Repository Manager instance that was used'),
          components: z.array(
            z.object({
              component: z
                .object({
                  id: z.string().optional(),
                  repository: z.string().optional(),
                  format: z.string().optional(),
                  group: z.string().optional(),
                  name: z.string().optional(),
                  version: z.string().optional(),
                  assets: z
                    .array(
                      z
                        .object({
                          downloadUrl: z.string().optional(),
                          path: z.string().optional(),
                          contentType: z.string().optional(),
                          lastModified: z.string().optional(),
                          fileSize: z.number().optional(),
                          checksum: z.record(z.unknown()).optional(),
                        })
                        .passthrough(),
                    )
                    .optional(),
                })
                .passthrough(),
              dockerManifests: z
                .array(z.record(z.unknown()).nullable())
                .describe(
                  'Manifests of Docker components, null if one could not be loaded',
                ),
            }),
          ),
        }),
    },
    async action({ input, credentials }) {
      const output = await nexusService.getEntityComponents({
        entityRef: input.entityRef,
        credentials,
      });
      return { output };
    },
  });
}
