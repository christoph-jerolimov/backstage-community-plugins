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
import { ActionsRegistryService } from '@backstage/backend-plugin-api/alpha';
import { JfrogArtifactoryService } from '../service/JfrogArtifactoryService';

/**
 * Registers the `get-image-tags` action.
 *
 * @internal
 */
export function createGetImageTagsAction(options: {
  actionsRegistry: ActionsRegistryService;
  jfrogArtifactory: JfrogArtifactoryService;
}) {
  const { actionsRegistry, jfrogArtifactory } = options;

  actionsRegistry.register({
    name: 'get-image-tags',
    title: 'Get JFrog Artifactory image tags',
    description: `Returns the container image tags stored in JFrog Artifactory for a catalog entity.

The entity must have the "jfrog-artifactory/image-name" annotation. The optional "jfrog-artifactory/repo-filter" annotation limits the repositories that are searched, and the optional "jfrog-artifactory/host" annotation selects the JFrog Artifactory instance.
Each tag includes its creation and modification dates, size, download count, repositories, licenses, vulnerability counts and files.`,
    attributes: {
      readOnly: true,
      destructive: false,
      idempotent: true,
    },
    examples: [
      {
        title: 'Get the image tags of a component',
        input: { entityRef: 'component:default/my-service' },
      },
    ],
    schema: {
      input: z =>
        z.object({
          entityRef: z
            .string()
            .describe(
              'The ref of the catalog entity, for example "component:default/my-service"',
            ),
        }),
      output: z =>
        z.object({
          entityRef: z.string().describe('The ref of the entity'),
          imageName: z.string().describe('The image name that was looked up'),
          host: z
            .string()
            .describe('The JFrog Artifactory instance that was queried'),
          repoFilter: z
            .string()
            .optional()
            .describe('The repository filter that was applied'),
          hasMore: z
            .boolean()
            .describe('Whether more tags exist than were returned'),
          tags: z.array(
            z.object({
              name: z.string(),
              created: z.string(),
              modified: z.string(),
              packageId: z.string(),
              size: z.string().describe('Size in bytes'),
              downloadCount: z.number(),
              repositories: z.array(
                z.object({
                  name: z.string(),
                  type: z.string(),
                  leadFilePath: z.string(),
                }),
              ),
              licenses: z.array(
                z.object({ name: z.string(), source: z.string() }),
              ),
              vulnerabilities: z
                .object({
                  critical: z.number(),
                  high: z.number(),
                  medium: z.number(),
                  low: z.number(),
                  info: z.number(),
                  unknown: z.number(),
                  skipped: z.number(),
                })
                .nullable(),
              files: z.array(
                z.object({
                  name: z.string(),
                  lead: z.boolean(),
                  size: z.string(),
                  md5: z.string(),
                  sha1: z.string(),
                  sha256: z.string(),
                  mimeType: z.string().nullable(),
                }),
              ),
            }),
          ),
        }),
    },
    async action({ input, credentials }) {
      const result = await jfrogArtifactory.getTagsForEntityRef({
        entityRef: input.entityRef,
        credentials,
      });
      const { edges, pageInfo } = result.tags.data.versions;

      return {
        output: {
          entityRef: result.entityRef,
          imageName: result.imageName,
          host: result.host,
          repoFilter: result.repoFilter,
          hasMore: pageInfo.hasNextPage,
          tags: edges.map(({ node }) => ({
            name: node.name,
            created: node.created,
            modified: node.modified,
            packageId: node.package.id,
            size: node.size,
            downloadCount: node.stats.downloadCount,
            repositories: node.repos,
            licenses: node.licenses,
            vulnerabilities: node.vulnerabilities,
            files: node.files,
          })),
        },
      };
    },
  });
}
