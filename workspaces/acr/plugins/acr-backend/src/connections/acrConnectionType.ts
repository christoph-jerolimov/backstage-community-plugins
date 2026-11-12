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

/**
 * The connection type key, following the naming of the built-in connection
 * types of `@backstage/connections`, such as `azure-blob-storage`.
 */
export const ACR_CONNECTION_TYPE = 'azure-container-registry';

type AcrConnectionTypeShape = {
  type: typeof ACR_CONNECTION_TYPE;
  cardinality: 'multiton';
  lookupStrategy: 'host';
  query: { url: string };
  configSchema: {
    host: string;
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
 * Defined like the built-in connection types of `@backstage/connections`.
 * Connection types can't be added to the core connections service from
 * plugins yet, see
 * https://backstage.io/docs/next/backend-system/core-services/connections/creating-a-connection-type
 */
export type AcrConnectionTypeDefinition =
  ConnectionTypeDefinition<AcrConnectionTypeShape>;

/** The auth methods supported by Azure Container Registry connections. */
export type AcrConnectionAuthMethod =
  AcrConnectionTypeDefinition['authMethods'][number]['method'];

/** A resolved Azure Container Registry connection with one selected auth method. */
export type AcrConnection<
  TAuthMethod extends AcrConnectionAuthMethod = AcrConnectionAuthMethod,
> = Connection<ConnectionTypeDefinition<AcrConnectionTypeShape>, TAuthMethod>;

// Same behavior as the internal createPortableSchema of @backstage/connections
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
          throw new InputError(errorMessage, cause);
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

function authMethod<TMethod extends string, TSchema extends z.ZodType>(
  method: TMethod,
  title: string,
  configSchema: TSchema,
) {
  return {
    method,
    title,
    configSchema: createPortableSchema(
      configSchema,
      `Invalid configuration for auth method "${method}" of connection type "${ACR_CONNECTION_TYPE}"`,
    ),
  };
}

/** The connection type for an Azure Container Registry. */
export const acrConnectionType: AcrConnectionTypeDefinition = {
  type: ACR_CONNECTION_TYPE,
  title: 'Azure Container Registry',
  cardinality: 'multiton',
  lookupStrategy: 'host',
  configSchema: createPortableSchema(
    z
      .object({
        host: z.string(),
        apiBaseUrl: z.string().optional(),
      })
      .strict(),
    `Invalid configuration for connection type "${ACR_CONNECTION_TYPE}"`,
  ),
  authMethods: [
    authMethod('none', 'None', z.object({})),
    authMethod('token', 'Token', z.object({ token: z.string() })),
    authMethod(
      'basic',
      'Basic',
      z.object({ username: z.string(), password: z.string() }),
    ),
  ],
};
