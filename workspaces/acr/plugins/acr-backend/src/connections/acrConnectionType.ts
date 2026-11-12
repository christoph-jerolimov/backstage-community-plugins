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
  Connection,
  ConnectionTypeDefinition,
  PortableSchema,
} from '@backstage/connections';
import { InputError } from '@backstage/errors';
import type { JsonObject } from '@backstage/types';
import { z } from 'zod/v4';

type AcrConnectionTypeShape = {
  type: 'acr';
  cardinality: 'multiton';
  lookupStrategy: 'host';
  query: { url: string };
  configSchema: {
    host: string;
    name?: string;
    apiBaseUrl?: string;
  };
  auth: readonly (
    | { method: 'none' }
    | { method: 'token'; token: string }
    | { method: 'basic'; username: string; password: string }
  )[];
};

/**
 * The connection type definition for an Azure Container Registry.
 *
 * @remarks
 *
 * This follows the format of the connection types that are built into
 * `@backstage/connections`. The connection type registry of the core
 * connections service is not extensible yet, so ACR connections are read from
 * the `acr.connections` configuration instead of the top-level `connections`.
 *
 * @public
 */
export type AcrConnectionTypeDefinition =
  ConnectionTypeDefinition<AcrConnectionTypeShape>;

/**
 * The auth methods supported by ACR connections.
 *
 * @public
 */
export type AcrConnectionAuthMethod =
  AcrConnectionTypeDefinition['authMethods'][number]['method'];

/**
 * A resolved ACR connection, including the selected auth method.
 *
 * @public
 */
export type AcrConnection<TAuthMethod extends string = string> = Connection<
  ConnectionTypeDefinition<AcrConnectionTypeShape>,
  TAuthMethod
>;

function createPortableSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  errorMessage: string,
): PortableSchema<z.output<TSchema>, unknown> {
  let cachedJsonSchema: JsonObject | undefined;
  return {
    parse(input) {
      try {
        return schema.parse(input);
      } catch (cause) {
        if (cause instanceof z.ZodError) {
          throw new InputError(
            `${errorMessage}: ${z.prettifyError(cause)}`,
            cause,
          );
        }
        throw cause;
      }
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
 * The connection type for an Azure Container Registry.
 *
 * @public
 */
export const acrConnectionType: AcrConnectionTypeDefinition = {
  type: 'acr',
  title: 'Azure Container Registry',
  cardinality: 'multiton',
  lookupStrategy: 'host',
  configSchema: createPortableSchema(
    z
      .object({
        host: z.string().min(1),
        name: z.string().min(1).optional(),
        apiBaseUrl: z.url().optional(),
      })
      .strict(),
    'Invalid configuration for connection type "acr"',
  ),
  authMethods: [
    {
      method: 'none',
      title: 'None',
      configSchema: createPortableSchema(
        z.object({}),
        'Invalid configuration for auth method "none" of connection type "acr"',
      ),
    },
    {
      method: 'token',
      title: 'Bearer Token',
      configSchema: createPortableSchema(
        z.object({ token: z.string().min(1) }),
        'Invalid configuration for auth method "token" of connection type "acr"',
      ),
    },
    {
      method: 'basic',
      title: 'Username and Password',
      configSchema: createPortableSchema(
        z.object({
          username: z.string().min(1),
          password: z.string().min(1),
        }),
        'Invalid configuration for auth method "basic" of connection type "acr"',
      ),
    },
  ],
};
