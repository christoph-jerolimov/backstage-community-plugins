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

/**
 * Annotation used to point an entity at a Codecov repository.
 *
 * The value is a slash separated `service/owner/repo` tuple, e.g.
 * `github/backstage/backstage`. When only `owner/repo` is given the `github`
 * service is assumed.
 *
 * @public
 */
export const CODECOV_REPO_ANNOTATION = 'codecov.io/repo';

/**
 * Well known annotation used as a fallback to locate the repository.
 *
 * @public
 */
export const PROJECT_SLUG_ANNOTATION = 'github.com/project-slug';

/**
 * Returns `true` when the entity carries enough information for the Codecov
 * card to look up coverage. Used to conditionally render the entity card.
 *
 * @public
 */
export function isCodecovAvailable(entity: Entity): boolean {
  const annotations = entity.metadata.annotations ?? {};
  return Boolean(
    annotations[CODECOV_REPO_ANNOTATION] ||
      annotations[PROJECT_SLUG_ANNOTATION],
  );
}
