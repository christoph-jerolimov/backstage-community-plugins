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
import type {
  ConnectionTypeDefinition,
  PortableSchema,
} from '@backstage/connections';
import { InputError } from '@backstage/errors';
import { JsonObject } from '@backstage/types';
import { z } from 'zod';

function createPortableSchema<TOutput>(
  schema: z.ZodType<TOutput>,
  errorMessage: string,
): PortableSchema<TOutput, unknown> {
  let cachedJsonSchema: JsonObject | undefined;
  return {
    parse(input) {
      const result = schema.safeParse(input);
      if (!result.success) {
        throw new InputError(
          `${errorMessage}: ${z.prettifyError(result.error)}`,
        );
      }
      return result.data;
    },
    schema() {
      cachedJsonSchema ??= z.toJSONSchema(schema, {
        target: 'draft-07',
        io: 'input',
      }) as JsonObject;
      return { schema: structuredClone(cachedJsonSchema) };
    },
  };
}

/**
 * The auth entries supported by JFrog Artifactory connections, by method.
 *
 * @public
 */
export type JfrogArtifactoryAuthByMethod = {
  none: { method: 'none' };
  token: { method: 'token'; token: string };
  basic: { method: 'basic'; username: string; password: string };
};

/**
 * The auth methods supported by JFrog Artifactory connections.
 *
 * @public
 */
export type JfrogArtifactoryAuthMethod = keyof JfrogArtifactoryAuthByMethod;

/**
 * An auth entry of a JFrog Artifactory connection.
 *
 * @public
 */
export type JfrogArtifactoryAuth =
  JfrogArtifactoryAuthByMethod[JfrogArtifactoryAuthMethod];

/**
 * Definition of the JFrog Artifactory connection type.
 *
 * @remarks
 *
 * This follows the shape of the connection types that ship with
 * `@backstage/connections`, so that configuration can move to the
 * framework-level `connections` config once a JFrog Artifactory connection
 * type is available there.
 *
 * @public
 */
export type JfrogArtifactoryConnectionTypeDefinition =
  ConnectionTypeDefinition<{
    type: 'jfrog-artifactory';
    cardinality: 'multiton';
    lookupStrategy: 'host';
    query: { url: string };
    configSchema: { host: string; baseUrl?: string };
    auth: readonly JfrogArtifactoryAuth[];
  }>;

/**
 * A resolved JFrog Artifactory connection, with a single auth entry.
 *
 * @remarks
 *
 * This has the same shape as the `Connection` type of `@backstage/connections`
 * for its built-in connection types. It is declared explicitly because
 * `Connection` can only resolve the auth types of built-in connection types.
 *
 * @public
 */
export type JfrogArtifactoryConnection<
  TAuthMethod extends JfrogArtifactoryAuthMethod = JfrogArtifactoryAuthMethod,
> = {
  type: 'jfrog-artifactory';
  title: string;
  host: string;
  baseUrl?: string;
  auth: JfrogArtifactoryAuthByMethod[TAuthMethod] & { title: string };
};

/**
 * The JFrog Artifactory connection type.
 *
 * @public
 */
export const jfrogArtifactoryConnectionType: JfrogArtifactoryConnectionTypeDefinition =
  {
    type: 'jfrog-artifactory',
    title: 'JFrog Artifactory',
    cardinality: 'multiton',
    lookupStrategy: 'host',
    configSchema: createPortableSchema(
      z
        .object({
          host: z.string().min(1),
          baseUrl: z.url().optional(),
        })
        .strict(),
      'Invalid configuration for connection type "jfrog-artifactory"',
    ),
    authMethods: [
      {
        method: 'none',
        title: 'No authentication',
        configSchema: createPortableSchema(
          z.object({}),
          'Invalid configuration for auth method "none" of connection type "jfrog-artifactory"',
        ),
      },
      {
        method: 'token',
        title: 'Access token',
        configSchema: createPortableSchema(
          z.object({ token: z.string().min(1) }),
          'Invalid configuration for auth method "token" of connection type "jfrog-artifactory"',
        ),
      },
      {
        method: 'basic',
        title: 'Username and password',
        configSchema: createPortableSchema(
          z.object({
            username: z.string().min(1),
            password: z.string().min(1),
          }),
          'Invalid configuration for auth method "basic" of connection type "jfrog-artifactory"',
        ),
      },
    ],
  };
