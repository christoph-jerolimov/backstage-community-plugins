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
     * Each entry follows the Backstage connections configuration format
     * (`host`, optional `title`, and a list of `auth` methods).
     */
    connections?: Array<{
      /**
       * The host name of the JFrog Artifactory instance, for example
       * `mycompany.jfrog.io` or `artifactory.example.com:8082`.
       */
      host: string;
      /**
       * The base URL of the JFrog Platform API. Defaults to `https://<host>`.
       */
      baseUrl?: string;
      /** A human readable title for this connection. */
      title?: string;
      /** Auth methods for this connection. The first matching one is used. */
      auth: Array<
        | {
            method: 'none';
            title?: string;
          }
        | {
            method: 'token';
            title?: string;
            /**
             * An access token or identity token, sent as a Bearer token.
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
