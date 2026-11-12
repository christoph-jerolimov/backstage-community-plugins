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
  /** Configuration for the JFrog Artifactory plugin */
  jfrogArtifactory?: {
    /**
     * JFrog Artifactory instances the backend can talk to.
     *
     * Each entry uses the format of the Backstage connections config
     * (`type`, `title`, `match`, `auth`), so that it can move to the top-level
     * `connections` config once it supports JFrog Artifactory connections.
     */
    connections?: Array<{
      /** The connection type, must be `jfrog-artifactory`. */
      type: 'jfrog-artifactory';
      /** A human readable title for this connection. */
      title?: string;
      /**
       * The host of the JFrog Artifactory instance, including the port if it
       * is not the default one, for example `mycompany.jfrog.io`.
       */
      host: string;
      /**
       * The base URL of the JFrog Platform API. Defaults to `https://<host>`.
       */
      baseUrl?: string;
      /** Restricts this connection to specific plugins. */
      match?: {
        plugins: string[];
      };
      /**
       * Auth methods for this connection. Entries that match the plugin are
       * preferred, otherwise the first entry is used.
       */
      auth: Array<
        | {
            method: 'none';
            title?: string;
            match?: { plugins: string[] };
          }
        | {
            method: 'token';
            title?: string;
            match?: { plugins: string[] };
            /**
             * An access token or identity token, sent as a Bearer token.
             * @visibility secret
             */
            token: string;
          }
        | {
            method: 'basic';
            title?: string;
            match?: { plugins: string[] };
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
