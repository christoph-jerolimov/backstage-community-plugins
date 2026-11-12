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

// Mirrors the internal `createPortableSchema` of `@backstage/connections`,
// which isn't exported for plugins.
function createPortableSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  errorMessage: string,
): PortableSchema<z.infer<TSchema>, unknown> {
  let cachedJsonSchema: JsonObject | undefined;
  return {
    parse(input: unknown) {
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
      if (!cachedJsonSchema) {
        cachedJsonSchema = schema.toJSONSchema({
          target: 'draft-07',
          io: 'input',
        }) as JsonObject;
      }
      return { schema: structuredClone(cachedJsonSchema) };
    },
  };
}

const TYPE = 'nexus-repository-manager';

/**
 * The connection type for Nexus Repository Manager instances.
 *
 * @remarks
 *
 * Defined the same way as the built-in connection types of
 * `@backstage/connections`, such as `bitbucket-server`. Connections are looked
 * up by the host of a URL, and requests go to `baseUrl`, which defaults to
 * `https://<host>`.
 *
 * @public
 */
export const nexusConnectionType: ConnectionTypeDefinition<{
  type: 'nexus-repository-manager';
  cardinality: 'multiton';
  lookupStrategy: 'host';
  query: { url: string };
  configSchema: { host: string; baseUrl?: string };
  auth: readonly (
    | { method: 'none' }
    | { method: 'token'; token: string }
    | { method: 'basic'; username: string; password: string }
  )[];
}> = {
  type: TYPE,
  title: 'Nexus Repository Manager',
  cardinality: 'multiton',
  lookupStrategy: 'host',
  configSchema: createPortableSchema(
    z
      .object({
        host: z.string(),
        baseUrl: z.string().optional(),
      })
      .strict(),
    `Invalid configuration for connection type "${TYPE}"`,
  ),
  authMethods: [
    {
      method: 'none',
      title: 'None',
      configSchema: createPortableSchema(
        z.object({}),
        `Invalid configuration for auth method "none" of connection type "${TYPE}"`,
      ),
    },
    {
      method: 'token',
      title: 'Token',
      configSchema: createPortableSchema(
        z.object({ token: z.string() }),
        `Invalid configuration for auth method "token" of connection type "${TYPE}"`,
      ),
    },
    {
      method: 'basic',
      title: 'Basic',
      configSchema: createPortableSchema(
        z.object({ username: z.string(), password: z.string() }),
        `Invalid configuration for auth method "basic" of connection type "${TYPE}"`,
      ),
    },
  ],
};

/**
 * An auth method supported by Nexus Repository Manager connections.
 *
 * @public
 */
export type NexusAuthMethod =
  (typeof nexusConnectionType)['authMethods'][number]['method'];

/**
 * A Nexus Repository Manager connection as returned by a connection lookup,
 * with `auth` narrowed to the selected method.
 *
 * @public
 */
export type NexusConnection<TAuthMethod extends string = string> = Connection<
  typeof nexusConnectionType,
  TAuthMethod
>;
