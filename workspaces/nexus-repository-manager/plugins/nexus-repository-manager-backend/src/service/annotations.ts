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
import type { Entity } from '@backstage/catalog-model';

const PREFIX = 'nexus-repository-manager/';

/** Overrides the title that is derived from the search annotations. */
export const NEXUS_TITLE_ANNOTATION = `${PREFIX}config.title`;

/**
 * Selects the connection, by host or URL, when more than one Nexus Repository
 * Manager connection is configured.
 */
export const NEXUS_HOST_ANNOTATION = `${PREFIX}host`;

/**
 * Maps the supported annotations (without prefix) to the query parameter of
 * the Nexus Repository Manager search API.
 */
const ANNOTATIONS: Record<string, string> = {
  'docker.image-name': 'docker.imageName',
  'docker.image-tag': 'docker.imageTag',
  'docker.layer-id': 'docker.layerId',
  'docker.content-digest': 'docker.contentDigest',
};

const EXPERIMENTAL_ANNOTATIONS: Record<string, string> = {
  keyword: 'q',
  repository: 'repository',
  format: 'format',
  group: 'group',
  name: 'name',
  version: 'version',
  prerelease: 'prerelease',
  md5: 'md5',
  sha1: 'sha1',
  sha256: 'sha256',
  sha512: 'sha512',
  'conan.base-version': 'conan.baseVersion',
  'conan.channel': 'conan.channel',
  'conan.revision': 'conan.revision',
  'conan.package-id': 'conan.packageId',
  'conan.package-revision': 'conan.packageRevision',
  'maven.group-id': 'maven.groupId',
  'maven.artifact-id': 'maven.artifactId',
  'maven.base-version': 'maven.baseVersion',
  'maven.extension': 'maven.extension',
  'maven.classifier': 'maven.classifier',
  gavec: 'gavec',
  'npm.scope': 'npm.scope',
  'npm.author': 'npm.author',
  'npm.description': 'npm.description',
  'npm.keywords': 'npm.keywords',
  'npm.license': 'npm.license',
  'npm.tagged-is': 'npm.tagged_is',
  'npm.tagged-not': 'npm.tagged_not',
  'nuget.id': 'nuget.id',
  'nuget.tags': 'nuget.tags',
  'nuget.title': 'nuget.title',
  'nuget.authors': 'nuget.authors',
  'nuget.description': 'nuget.description',
  'nuget.summary': 'nuget.summary',
  'p2.plugin-name': 'p2.pluginName',
  'pypi.classifiers': 'pypi.classifiers',
  'pypi.description': 'pypi.description',
  'pypi.keywords': 'pypi.keywords',
  'pypi.summary': 'pypi.summary',
  'rubygems.description': 'rubygems.description',
  'rubygems.platform': 'rubygems.platform',
  'rubygems.summary': 'rubygems.summary',
  'yum.architecture': 'yum.architecture',
  'yum.name': 'yum.name',
};

/**
 * The search derived from the annotations of an entity.
 */
export type EntitySearch = {
  /** A display title, either from `config.title` or the annotation values. */
  title: string;
  /** The query parameters for the Nexus Repository Manager search API. */
  query: Record<string, string>;
  /** The value of the host annotation, if set. */
  host?: string;
};

/**
 * Builds the Nexus Repository Manager search for an entity, or returns
 * `undefined` if the entity has none of the supported annotations.
 */
export function getEntitySearch(
  entity: Entity,
  options: { experimentalAnnotations: boolean },
): EntitySearch | undefined {
  const annotations = entity.metadata.annotations ?? {};
  const mapping = options.experimentalAnnotations
    ? { ...ANNOTATIONS, ...EXPERIMENTAL_ANNOTATIONS }
    : ANNOTATIONS;

  const values: string[] = [];
  const query: Record<string, string> = {};
  for (const [annotation, parameter] of Object.entries(mapping)) {
    const value = annotations[`${PREFIX}${annotation}`];
    if (value) {
      values.push(value);
      query[parameter] = value;
    }
  }

  if (values.length === 0) {
    return undefined;
  }

  return {
    title: annotations[NEXUS_TITLE_ANNOTATION] || values.join(' | '),
    query: { ...query, sort: 'version' },
    host: annotations[NEXUS_HOST_ANNOTATION] || undefined,
  };
}
