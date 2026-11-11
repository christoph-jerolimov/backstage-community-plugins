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
 * Annotation with the docker image name to look up in JFrog Artifactory.
 *
 * @public
 */
export const JFROG_ARTIFACTORY_ANNOTATION_IMAGE_NAME =
  'jfrog-artifactory/image-name';

/**
 * Annotation with an optional repository filter, for example
 * `*-prod-federated`.
 *
 * @public
 */
export const JFROG_ARTIFACTORY_ANNOTATION_REPO_FILTER =
  'jfrog-artifactory/repo-filter';

/**
 * Annotation that selects the configured JFrog Artifactory connection by its
 * host (or a URL on that host). Defaults to the first configured connection.
 *
 * @public
 */
export const JFROG_ARTIFACTORY_ANNOTATION_HOST = 'jfrog-artifactory/host';

/** @public */
export interface JfrogArtifactoryTagsResponse {
  data: {
    versions: {
      edges: JfrogArtifactoryTagEdge[];
      pageInfo: JfrogArtifactoryPageInfo;
    };
  };
}

/** @public */
export interface JfrogArtifactoryPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}

/** @public */
export interface JfrogArtifactoryTagEdge {
  node: JfrogArtifactoryTag;
}

/** @public */
export interface JfrogArtifactoryTag {
  name: string;
  created: string;
  modified: string;
  package: { id: string };
  repos: JfrogArtifactoryTagRepo[];
  licenses: { name: string; source: string }[];
  size: string;
  stats: { downloadCount: number };
  vulnerabilities: JfrogArtifactoryVulnerabilities | null;
  files: JfrogArtifactoryTagFile[];
}

/** @public */
export interface JfrogArtifactoryTagFile {
  name: string;
  lead: boolean;
  size: string;
  md5: string;
  sha1: string;
  sha256: string;
  mimeType: null | string;
}

/** @public */
export interface JfrogArtifactoryTagRepo {
  name: string;
  type: string;
  leadFilePath: string;
}

/** @public */
export interface JfrogArtifactoryVulnerabilities {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
  unknown: number;
  skipped: number;
}
