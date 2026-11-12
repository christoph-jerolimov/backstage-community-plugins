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
   * Connections of the Backstage connections service. This plugin reads the
   * entries of type `azure-container-registry`; other types are handled by the
   * core connections service. Only the fields used by this plugin are
   * declared, so that entries of other types stay valid.
   */
  connections?: Array<{
    /** The connection type, `azure-container-registry` for this plugin. */
    type: string;
    /** The registry host, for example `myregistry.azurecr.io`. */
    host?: string;
    /** Defaults to `https://<host>/acr/v1`. */
    apiBaseUrl?: string;
    title?: string;
    match?: {
      plugins: string[];
    };
    auth: Array<{
      /** `none`, `token` or `basic` for `azure-container-registry` connections. */
      method: string;
      title?: string;
      match?: { plugins: string[] };
      /** @visibility secret */
      token?: string;
      username?: string;
      /** @visibility secret */
      password?: string;
    }>;
  }>;
}
