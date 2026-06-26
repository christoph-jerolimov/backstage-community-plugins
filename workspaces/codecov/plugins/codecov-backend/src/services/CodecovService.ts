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
import {
  BackstageCredentials,
  BackstageUserPrincipal,
} from '@backstage/backend-plugin-api';
import { CodecovCoverage } from '../types';

/**
 * Looks up code coverage information from Codecov for catalog entities.
 *
 * @public
 */
export interface CodecovService {
  /**
   * Returns the coverage for the repository referenced by the given entity.
   *
   * @param entityRef - Entity reference, e.g. `component:default/my-service`.
   */
  getCoverage(
    entityRef: string,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<CodecovCoverage>;
}
