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
export interface Config {
  nexusRepositoryManager?: {
    /**
     * Connections to Nexus Repository Manager instances, in the same format as
     * the Backstage `connections` configuration. Entities select an instance
     * with the `nexus-repository-manager/host` annotation, and use the first
     * connection otherwise.
     */
    connections?: Array<{
      /** Optional, must be `nexus-repository-manager` if set. */
      type?: 'nexus-repository-manager';
      /** Display title, defaults to the host. */
      title?: string;
      /** The host of the instance, e.g. `nexus.example.com`. */
      host: string;
      /** The base URL of the instance, defaults to `https://<host>`. */
      baseUrl?: string;
      /**
       * Auth methods for the instance. The first entry is used.
       */
      auth: Array<
        | {
            method: 'none';
            title?: string;
          }
        | {
            method: 'token';
            title?: string;
            /**
             * Sent as `Authorization: Bearer <token>`.
             * @visibility secret
             */
            token: string;
          }
        | {
            method: 'basic';
            title?: string;
            username: string;
            /**
             * @visibility secret
             */
            password: string;
          }
      >;
    }>;
  };
}
