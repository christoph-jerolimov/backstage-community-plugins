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

// A copy of the internal `createConnectionType` helper of
// `@backstage/connections`, which is not exported from that package. It is
// kept as close as possible to the original so that the JFrog Artifactory
// connection type definition can move into `@backstage/connections` as is.

import { z } from 'zod/v4';
import { InputError } from '@backstage/errors';
import type { Expand, JsonObject } from '@backstage/types';
import type {
  ConnectionTypeDefinition,
  PortableSchema,
} from '@backstage/connections';

type ConnectionAuthMethodSchema<
  TMethod extends string = string,
  TConfigSchema extends z.ZodObject = z.ZodObject,
> = {
  method: TMethod;
  title: string;
  configSchema: TConfigSchema;
};

type ConfigFromSchema<TConfigSchema extends z.ZodObject> =
  z.infer<TConfigSchema> extends Record<string, never>
    ? Record<never, never>
    : z.infer<TConfigSchema>;

type ConfiguredConnectionAuthFromSchema<
  TAuthMethod extends ConnectionAuthMethodSchema,
> = TAuthMethod extends ConnectionAuthMethodSchema<
  infer TMethod,
  infer TConfigSchema
>
  ? Expand<{ method: TMethod } & ConfigFromSchema<TConfigSchema>>
  : never;

/**
 * A resolved auth entry of a connection type, as passed to `matchAuth`.
 */
export type MatchableConnectionAuth<
  TAuthMethods extends readonly ConnectionAuthMethodSchema[],
> = Expand<
  ConfiguredConnectionAuthFromSchema<TAuthMethods[number]> & { title: string }
>;

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

export function createConnectionType<
  TType extends string,
  TConfigSchema extends z.ZodObject,
  const TAuthMethods extends readonly ConnectionAuthMethodSchema[],
>({
  configSchema,
  type,
  title,
  authMethods,
  matchAuth,
}: {
  type: TType;
  title: string;
  configSchema: TConfigSchema;
  authMethods: TAuthMethods;
  matchAuth?: (
    authMethods: MatchableConnectionAuth<TAuthMethods>[],
    query: { url: string },
  ) => MatchableConnectionAuth<TAuthMethods> | undefined;
}): ConnectionTypeDefinition<{
  type: TType;
  cardinality: 'multiton';
  lookupStrategy: 'host';
  query: { url: string };
  configSchema: ConfigFromSchema<TConfigSchema>;
  auth: readonly ConfiguredConnectionAuthFromSchema<TAuthMethods[number]>[];
}> {
  if (authMethods.length < 1) {
    throw new InputError(
      `Connection type "${type}" must declare at least one auth method`,
    );
  }

  return {
    type,
    title,
    cardinality: 'multiton',
    lookupStrategy: 'host',
    authMethods: authMethods.map(
      ({ method, title: authTitle, configSchema: authConfigSchema }) => ({
        method,
        title: authTitle,
        configSchema: createPortableSchema(
          authConfigSchema,
          `Invalid configuration for auth method "${method}" of connection type "${type}"`,
        ),
      }),
    ),
    configSchema: createPortableSchema(
      configSchema.strict(),
      `Invalid configuration for connection type "${type}"`,
    ),
    matchAuth,
  } as unknown as ConnectionTypeDefinition<{
    type: TType;
    cardinality: 'multiton';
    lookupStrategy: 'host';
    query: { url: string };
    configSchema: ConfigFromSchema<TConfigSchema>;
    auth: readonly ConfiguredConnectionAuthFromSchema<TAuthMethods[number]>[];
  }>;
}
