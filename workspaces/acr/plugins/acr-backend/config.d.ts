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
  acr?: {
    /**
     * Azure Container Registry connections, in the same format as the
     * top-level `connections` configuration of the Backstage connections
     * service. The first connection is used for entities without a
     * `azure-container-registry/registry-name` annotation.
     */
    connections?: Array<{
      /** Must be `acr`. */
      type: 'acr';
      /** The registry host, for example `myregistry.azurecr.io`. */
      host: string;
      /**
       * Optional short name that is matched against the
       * `azure-container-registry/registry-name` entity annotation.
       */
      name?: string;
      /** Defaults to `https://<host>/acr/v1`. */
      apiBaseUrl?: string;
      title?: string;
      match?: {
        plugins: string[];
      };
      auth: Array<
        | {
            method: 'none';
            title?: string;
            match?: { plugins: string[] };
          }
        | {
            method: 'token';
            /** @visibility secret */
            token: string;
            title?: string;
            match?: { plugins: string[] };
          }
        | {
            method: 'basic';
            username: string;
            /** @visibility secret */
            password: string;
            title?: string;
            match?: { plugins: string[] };
          }
      >;
    }>;
  };
}
