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
export interface Config {
  codecov?: {
    /**
     * Base URL of the Codecov API.
     *
     * Defaults to `https://api.codecov.io` (Codecov SaaS). Override this when
     * you run a self-hosted Codecov instance.
     */
    baseUrl?: string;
    /**
     * API token used to authenticate against the Codecov API.
     *
     * The token is only used by the backend and is never exposed to the
     * frontend. Create one in the Codecov UI under "Settings > Access".
     *
     * @visibility secret
     */
    token?: string;
  };
}
