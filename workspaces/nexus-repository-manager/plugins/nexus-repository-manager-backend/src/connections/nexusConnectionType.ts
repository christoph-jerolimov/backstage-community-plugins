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
  ConnectionType,
  PortableSchema,
} from '@backstage/connections';
import type { JsonObject } from '@backstage/types';
import { z } from 'zod';

function portableSchema<TSchema extends z.ZodType>(
  schema: TSchema,
): PortableSchema<z.output<TSchema>, unknown> {
  return {
    parse: input => schema.parse(input),
    schema: () => ({ schema: z.toJSONSchema(schema) as JsonObject }),
  };
}

const configSchema = z.strictObject({
  host: z
    .string()
    .min(1)
    .refine(host => !host.includes('/'), {
      message: 'Must be a host name, without a scheme or path',
    }),
  baseUrl: z.url().optional(),
});

const authSchemas = {
  none: z.strictObject({}),
  token: z.strictObject({ token: z.string().min(1) }),
  basic: z.strictObject({
    username: z.string().min(1),
    password: z.string().min(1),
  }),
};

/**
 * The connection type for Nexus Repository Manager instances, defined with the
 * same shape and portable schemas as the built-in Backstage connection types.
 *
 * @remarks
 *
 * Each connection is identified by its `host`. Requests go to `baseUrl`, which
 * defaults to `https://<host>`.
 *
 * @public
 */
export const nexusConnectionType: ConnectionType<{
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
  type: 'nexus-repository-manager',
  title: 'Nexus Repository Manager',
  cardinality: 'multiton',
  lookupStrategy: 'host',
  configSchema: portableSchema(configSchema),
  authMethods: [
    {
      method: 'none',
      title: 'Anonymous',
      configSchema: portableSchema(authSchemas.none),
    },
    {
      method: 'token',
      title: 'Bearer token',
      configSchema: portableSchema(authSchemas.token),
    },
    {
      method: 'basic',
      title: 'Username and password',
      configSchema: portableSchema(authSchemas.basic),
    },
  ],
  // Type-level accessors only, mirroring the built-in connection types.
  query: undefined as unknown as { url: string },
  auth: [],
};

/**
 * An auth method supported by Nexus Repository Manager connections.
 *
 * @public
 */
export type NexusAuthMethod =
  (typeof nexusConnectionType)['authMethods'][number]['method'];

/**
 * A resolved Nexus Repository Manager connection.
 *
 * @public
 */
export type NexusConnection<TAuthMethod extends string = string> = Connection<
  typeof nexusConnectionType,
  TAuthMethod
>;
