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
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import type { ConfiguredConnection } from '@backstage/connections/config';
import {
  InputError,
  NotAllowedError,
  NotFoundError,
  toError,
} from '@backstage/errors';
import { z } from 'zod/v4';
import {
  ACR_CONNECTION_TYPE,
  AcrConnection,
  AcrConnectionAuthMethod,
  AcrConnectionTypeDefinition,
  acrConnectionType,
} from './acrConnectionType';

/**
 * The root configuration key of the Backstage connections service. This
 * plugin reads the entries of type `azure-container-registry` from it and
 * leaves all other types to the core connections service.
 */
export const CONNECTIONS_CONFIG_KEY = 'connections';

type AcrConfiguredConnection =
  ConfiguredConnection<AcrConnectionTypeDefinition>;

/**
 * A plugin-scoped lookup of Azure Container Registry connections, with the
 * same `find` contract as the `ConnectionsService` of `@backstage/connections`.
 */
export interface AcrConnectionsService {
  find<TAuthMethod extends AcrConnectionAuthMethod>(options: {
    type: typeof ACR_CONNECTION_TYPE;
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<AcrConnection<TAuthMethod>>;
  find(options: {
    type: typeof ACR_CONNECTION_TYPE;
    query: { url: string };
  }): Promise<Omit<AcrConnection, 'auth'>>;
}

// Mirrors describeError in @backstage/connections/config
function describeError(error: unknown): string {
  const e = toError(error);
  if (e.name === 'ZodError') {
    return z.prettifyError(e as unknown as z.ZodError);
  }
  if (e.cause !== undefined) {
    const cause = toError(e.cause);
    if (cause.name === 'ZodError') {
      return z.prettifyError(cause as unknown as z.ZodError);
    }
  }
  return e.message;
}

function validateMatch(match: unknown) {
  if (match === undefined) {
    return undefined;
  }
  const plugins = (match as { plugins?: unknown } | null)?.plugins;
  if (!Array.isArray(plugins) || !plugins.every(p => typeof p === 'string')) {
    throw new InputError('Expected "match.plugins" to be an array of strings');
  }
  return { plugins: plugins as string[] };
}

// Mirrors validateConnection in @backstage/connections/config
function validateConnection(
  connection: Record<string, unknown>,
): AcrConnectionsConfigEntry {
  const rawAuth = connection.auth;
  if (!Array.isArray(rawAuth) || rawAuth.length === 0) {
    throw new InputError(
      `Connection of type "${ACR_CONNECTION_TYPE}" must configure at least one auth method`,
    );
  }
  const auth = rawAuth.map((entry: Record<string, unknown>) => {
    if (typeof entry?.method !== 'string') {
      throw new InputError(
        `Auth entry for connection type "${ACR_CONNECTION_TYPE}" is missing a "method" field`,
      );
    }
    const definition = acrConnectionType.authMethods.find(
      am => am.method === entry.method,
    );
    if (!definition) {
      throw new InputError(
        `Unknown auth method "${entry.method}" for connection type "${ACR_CONNECTION_TYPE}"`,
      );
    }
    const { method, title, match, ...rest } = entry;
    return {
      ...definition.configSchema.parse(rest),
      method,
      title: (title as string | undefined) ?? definition.title,
      match: validateMatch(match),
    };
  });
  const {
    type: _type,
    auth: _auth,
    title,
    match,
    ...configFields
  } = connection;
  return {
    ...acrConnectionType.configSchema.parse(configFields),
    type: ACR_CONNECTION_TYPE,
    title: title as string | undefined,
    match: validateMatch(match),
    auth,
  } as AcrConnectionsConfigEntry;
}

type AcrConnectionsConfigEntry = AcrConfiguredConnection;

/**
 * Reads and validates the `azure-container-registry` entries of the root
 * `connections` config, with the same rules as `buildConnectionsFromConfig`
 * from `@backstage/connections/config`. Entries of other types are ignored.
 */
export function buildAcrConnectionsFromConfig(
  config: RootConfigService,
): AcrConfiguredConnection[] {
  const raw = config.getOptional(CONNECTIONS_CONFIG_KEY);
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new InputError(
      `Expected "${CONNECTIONS_CONFIG_KEY}" config to be an array of connection objects`,
    );
  }

  const isAcrEntry = (entry: unknown) =>
    typeof entry === 'object' &&
    entry !== null &&
    !Array.isArray(entry) &&
    (entry as { type?: unknown }).type === ACR_CONNECTION_TYPE;

  const connections = raw.filter(isAcrEntry).map(entry => {
    try {
      return validateConnection(entry as Record<string, unknown>);
    } catch (e) {
      const type =
        typeof (entry as { type?: unknown })?.type === 'string'
          ? (entry as { type: string }).type
          : 'unknown';
      throw new InputError(
        `Invalid connection of type "${type}" in ${CONNECTIONS_CONFIG_KEY} config:\n${describeError(
          e,
        )}`,
      );
    }
  });

  const hosts = new Set<string>();
  for (const c of connections) {
    if (hosts.has(c.host)) {
      throw new InputError(
        `Duplicate connection of type "${ACR_CONNECTION_TYPE}" for host "${c.host}"`,
      );
    }
    hosts.add(c.host);
  }

  for (const c of connections) {
    c.title ??=
      connections.length > 1
        ? `${acrConnectionType.title} (${c.host})`
        : acrConnectionType.title;
  }

  return connections;
}

class PluginAcrConnectionsService implements AcrConnectionsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly connections: AcrConfiguredConnection[],
  ) {}

  find<TAuthMethod extends AcrConnectionAuthMethod>(options: {
    type: typeof ACR_CONNECTION_TYPE;
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<AcrConnection<TAuthMethod>>;
  find(options: {
    type: typeof ACR_CONNECTION_TYPE;
    query: { url: string };
  }): Promise<Omit<AcrConnection, 'auth'>>;
  async find({
    type,
    query,
    authMethods,
  }: {
    type: typeof ACR_CONNECTION_TYPE;
    query: { url: string };
    authMethods?: readonly AcrConnectionAuthMethod[];
  }): Promise<AcrConnection | Omit<AcrConnection, 'auth'>> {
    let host: string;
    try {
      host = new URL(query.url).host;
    } catch {
      throw new InputError(
        `Invalid url "${query.url}" passed to ConnectionsService.find`,
      );
    }

    this.logger.debug(
      `Finding connection of type "${type}" matching host "${host}"`,
    );
    const connection = this.connections.find(c => c.host === host);
    if (!connection) {
      throw new NotFoundError(`Connection not found for type "${type}"`);
    }

    if (!authMethods) {
      const { auth: _, ...info } = connection;
      return info as Omit<AcrConnection, 'auth'>;
    }

    const selected = connection.auth[0];
    if (!selected) {
      throw new NotAllowedError(
        `Connection of type "${type}" for host "${host}" has no auth method available to this plugin`,
      );
    }
    if (!authMethods.includes(selected.method)) {
      throw new NotAllowedError(
        `Connection not found for type "${type}" with auth method "${selected.method}"`,
      );
    }
    this.logger.debug(
      `Selected connection of type "${type}" for host "${host}" using auth method "${selected.method}"`,
    );
    return { ...connection, auth: selected } as AcrConnection;
  }
}

/**
 * Loads Azure Container Registry connections from configuration and hands out
 * plugin-scoped lookups, mirroring the default connections service of the
 * Backstage backend.
 */
export class DefaultAcrConnectionsService {
  static create(options: {
    config: RootConfigService;
    logger: LoggerService;
  }): DefaultAcrConnectionsService {
    const connections = buildAcrConnectionsFromConfig(options.config);
    if (connections.length > 0) {
      options.logger.info(
        `Loaded ${connections.length} connection${
          connections.length === 1 ? '' : 's'
        } of type "${ACR_CONNECTION_TYPE}" from configuration`,
      );
    }
    return new DefaultAcrConnectionsService(options.logger, connections);
  }

  private constructor(
    private readonly logger: LoggerService,
    private readonly connections: AcrConfiguredConnection[],
  ) {}

  forPlugin(
    pluginId: string,
    options?: { logger?: LoggerService },
  ): AcrConnectionsService {
    const connections = this.connections.flatMap(connection => {
      if (connection.match && !connection.match.plugins.includes(pluginId)) {
        return [];
      }
      const pluginMatched = connection.auth.filter(a =>
        a.match?.plugins.includes(pluginId),
      );
      const unmatched = connection.auth.filter(a => !a.match);
      return [{ ...connection, auth: [...pluginMatched, ...unmatched] }];
    });
    return new PluginAcrConnectionsService(
      options?.logger ?? this.logger,
      connections,
    );
  }

  /**
   * The URL of the first configured connection, used for entities that don't
   * select a registry.
   */
  getDefaultUrl(): string | undefined {
    const first = this.connections[0];
    return first ? `https://${first.host}` : undefined;
  }
}
