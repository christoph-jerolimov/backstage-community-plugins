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
import { CodecovCoverage } from '../types';

/**
 * API used by the Codecov frontend plugin to talk to the `codecov` backend.
 *
 * @public
 */
export interface CodecovApi {
  /**
   * Returns the Codecov coverage for the repository referenced by the entity.
   *
   * @param entityRef - Entity reference, e.g. `component:default/my-service`.
   */
  getCoverage(entityRef: string): Promise<CodecovCoverage>;
}
