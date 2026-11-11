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
 * An asset as returned by the Nexus Repository Manager search API.
 *
 * @public
 */
export type NexusAsset = {
  downloadUrl?: string;
  path?: string;
  id?: string;
  repository?: string;
  format?: string;
  checksum?: Record<string, unknown>;
  contentType?: string;
  lastModified?: string;
  lastDownloaded?: string;
  uploader?: string;
  uploaderIp?: string;
  fileSize?: number;
  maven2?: {
    artifactId?: string;
    groupId?: string;
    version?: string;
    extension?: string;
    classifier?: string;
    baseVersion?: string;
    asset_kind?: string;
  };
};

/**
 * A component as returned by the Nexus Repository Manager search API.
 *
 * @public
 */
export type NexusComponent = {
  id?: string;
  repository?: string;
  format?: string;
  group?: string;
  name?: string;
  version?: string;
  assets?: NexusAsset[];
};

/**
 * A Docker image manifest, either schema 1 or schema 2.
 *
 * @see {@link https://distribution.github.io/distribution/spec/manifest-v2-2/ | Image Manifest Version 2, Schema 2}
 * @public
 */
export type DockerManifest =
  | {
      schemaVersion: 1;
      name: string;
      tag: string;
      architecture: string;
      fsLayers: { blobSum: string }[];
      history: { v1Compatibility: string }[];
    }
  | {
      schemaVersion: 2;
      mediaType: string;
      config: { mediaType: string; size: number; digest: string };
      layers: { mediaType: string; size: number; digest: string }[];
    };

/**
 * The Nexus Repository Manager components that belong to an entity.
 *
 * @public
 */
export type EntityComponentsResponse = {
  entityRef: string;
  /** A display title, from the `config.title` annotation or the search values. */
  title: string;
  /** The connection that was used, without auth details. */
  connection: {
    title: string;
    host: string;
    baseUrl: string;
  };
  components: {
    component: NexusComponent;
    /**
     * The manifests of Docker components, one per asset. An entry is `null`
     * if the manifest could not be loaded.
     */
    dockerManifests: (DockerManifest | null)[];
  }[];
};
