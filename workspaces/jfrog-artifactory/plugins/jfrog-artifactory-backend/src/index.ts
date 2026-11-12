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

/**
 * JFrog Artifactory backend plugin, which loads image information for catalog
 * entities and provides it through an API and the actions registry.
 *
 * @packageDocumentation
 */

export { jfrogArtifactoryPlugin as default } from './plugin';
export {
  JfrogArtifactoryConnectionType,
  type JfrogArtifactoryAuthByMethod,
  type JfrogArtifactoryAuthMethod,
  type JfrogArtifactoryConnection,
  type JfrogArtifactoryConnectionTypeDefinition,
} from './connections/jfrogArtifactoryConnectionType';
export {
  DefaultJfrogArtifactoryConnectionsService,
  JFROG_ARTIFACTORY_CONNECTIONS_CONFIG_KEY,
  PluginJfrogArtifactoryConnectionsService,
  type JfrogArtifactoryConnectionsService,
} from './connections/JfrogArtifactoryConnectionsService';
export type { EntityTagsResult } from './service/JfrogArtifactoryService';
export * from './types';
