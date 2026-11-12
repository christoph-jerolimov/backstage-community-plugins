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
  /**
   * Connections to external services, in the format of the Backstage
   * connections config.
   *
   * @remarks
   *
   * This schema only describes what the JFrog Artifactory backend plugin needs
   * to know about the `jfrog-artifactory` entries, and accepts connections of
   * any other type. It marks the credentials of the `token` and `basic` auth
   * methods as secret, so that they are redacted from logs.
   */
  connections?: Array<{
    /** The connection type, `jfrog-artifactory` for JFrog Artifactory. */
    type: string;
    /** A human readable title for this connection. */
    title?: string;
    /**
     * The host of the service, including the port if it is not the default
     * one, for example `mycompany.jfrog.io`.
     */
    host?: string;
    /**
     * For JFrog Artifactory: the base URL of the JFrog Platform API.
     * Defaults to `https://<host>`.
     */
    baseUrl?: string;
    /** Restricts this connection to specific plugins. */
    match?: {
      plugins: string[];
    };
    /** Auth methods for this connection. */
    auth?: Array<{
      /** The auth method, `none`, `token` or `basic` for JFrog Artifactory. */
      method: string;
      title?: string;
      /** Restricts this auth method to specific plugins. */
      match?: {
        plugins: string[];
      };
      /**
       * An access or identity token, sent as a Bearer token.
       * @visibility secret
       */
      token?: string;
      /** The username of the `basic` auth method. */
      username?: string;
      /**
       * The password of the `basic` auth method.
       * @visibility secret
       */
      password?: string;
    }>;
  }>;
}
