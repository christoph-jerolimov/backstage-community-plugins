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
import { z } from 'zod/v4';
import { createConnectionType } from './createConnectionType';

/**
 * The JFrog Artifactory connection type, defined the same way as the
 * connection types that ship with `@backstage/connections`.
 *
 * @public
 */
export const JfrogArtifactoryConnectionType = createConnectionType({
  type: 'jfrog',
  title: 'JFrog Artifactory',
  configSchema: z.object({
    host: z.string(),
    baseUrl: z.string().optional(),
  }),
  authMethods: [
    {
      method: 'none',
      title: 'None',
      configSchema: z.object({}),
    },
    {
      method: 'token',
      title: 'Token',
      configSchema: z.object({
        token: z.string(),
      }),
    },
    {
      method: 'basic',
      title: 'Basic',
      configSchema: z.object({
        username: z.string(),
        password: z.string(),
      }),
    },
  ],
});

/**
 * The type definition of the JFrog Artifactory connection type.
 *
 * @public
 */
export type JfrogArtifactoryConnectionTypeDefinition =
  typeof JfrogArtifactoryConnectionType;

/**
 * The auth methods supported by JFrog Artifactory connections.
 *
 * @public
 */
export type JfrogArtifactoryAuthMethod =
  JfrogArtifactoryConnectionTypeDefinition['authMethods'][number]['method'];

/**
 * The auth entries of JFrog Artifactory connections, by method.
 *
 * @public
 */
export type JfrogArtifactoryAuthByMethod = {
  none: { method: 'none'; title: string };
  token: { method: 'token'; title: string; token: string };
  basic: { method: 'basic'; title: string; username: string; password: string };
};

/**
 * A JFrog Artifactory connection, as returned by `find`.
 *
 * @remarks
 *
 * This has the same shape as `Connection<'jfrog', TAuthMethod>`
 * would have if the type was part of `@backstage/connections`.
 *
 * @public
 */
export type JfrogArtifactoryConnection<
  TAuthMethod extends JfrogArtifactoryAuthMethod = JfrogArtifactoryAuthMethod,
> = {
  type: 'jfrog';
  title: string;
  host: string;
  baseUrl?: string;
  auth: JfrogArtifactoryAuthByMethod[TAuthMethod];
};
