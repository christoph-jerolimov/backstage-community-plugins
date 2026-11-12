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
   * connections service. This plugin reads the entries of type
   * `nexus` and leaves all others to Backstage.
   *
   * Entities select a Nexus Repository Manager connection with the
   * `nexus-repository-manager/host` annotation, and use the first one
   * otherwise.
   */
  connections?: Array<{
    /** The connection type, `nexus` for this plugin. */
    type: string;
    /** Display title, defaults to "Nexus Repository Manager". */
    title?: string;
    /** Restricts the connection to the given plugins. */
    match?: { plugins: string[] };
    /** The host of the Nexus instance, e.g. `nexus.example.com`. */
    host?: string;
    /** The base URL of the Nexus instance, defaults to `https://<host>`. */
    baseUrl?: string;
    /**
     * Auth methods for the instance. The first entry that is available to
     * the plugin is used, preferring entries that match the plugin.
     */
    auth?: Array<{
      /** `none`, `token` or `basic` for Nexus connections. */
      method: string;
      title?: string;
      /** Restricts the auth entry to the given plugins. */
      match?: { plugins: string[] };
      /**
       * For the `token` method, sent as `Authorization: Bearer <token>`.
       * @visibility secret
       */
      token?: string;
      /** For the `basic` method. */
      username?: string;
      /**
       * For the `basic` method.
       * @visibility secret
       */
      password?: string;
    }>;
  }>;
}
