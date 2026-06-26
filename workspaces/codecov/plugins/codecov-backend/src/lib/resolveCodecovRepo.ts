/*
 * Copyright 2025 The Backstage Authors
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
import { Entity } from '@backstage/catalog-model';
import { CODECOV_REPO_ANNOTATION, CodecovRepoSlug } from '../types';

/**
 * Resolves the Codecov repository for an entity.
 *
 * Reads the `codecov.io/repo` annotation first and falls back to the well
 * known `github.com/project-slug` annotation, assuming the `github` service in
 * that case. Returns `undefined` when no usable annotation is present.
 */
export function resolveCodecovRepo(
  entity: Entity,
): CodecovRepoSlug | undefined {
  const annotations = entity.metadata.annotations ?? {};

  const codecov = annotations[CODECOV_REPO_ANNOTATION]?.trim();
  if (codecov) {
    const parts = codecov.split('/').filter(Boolean);
    if (parts.length === 3) {
      const [service, owner, repo] = parts;
      return { service, owner, repo };
    }
    if (parts.length === 2) {
      const [owner, repo] = parts;
      return { service: 'github', owner, repo };
    }
  }

  const projectSlug = annotations['github.com/project-slug']?.trim();
  if (projectSlug) {
    const parts = projectSlug.split('/').filter(Boolean);
    if (parts.length === 2) {
      const [owner, repo] = parts;
      return { service: 'github', owner, repo };
    }
  }

  return undefined;
}
