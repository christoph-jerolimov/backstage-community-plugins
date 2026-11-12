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
import type { LoggerService } from '@backstage/backend-plugin-api';
import type { Config } from '@backstage/config';
import type { ConfiguredConnection } from '@backstage/connections/config';
import {
  InputError,
  NotAllowedError,
  NotFoundError,
  toError,
} from '@backstage/errors';
import type { JsonObject } from '@backstage/types';
import { z } from 'zod/v4';
import {
  type NexusAuthMethod,
  type NexusConnection,
  nexusConnectionType,
} from './nexusConnectionType';

/**
 * The root config key of the Backstage connections, which also holds the
 * Nexus Repository Manager connections.
 */
const CONNECTIONS_CONFIG_KEY = 'connections';

type NexusConfiguredConnection = ConfiguredConnection<
  typeof nexusConnectionType
>;

/**
 * Looks up Nexus Repository Manager connections. Mirrors `find` of the
 * `ConnectionsService` from `@backstage/connections`.
 *
 * @internal
 */
export interface NexusConnectionsService {
  find<TAuthMethod extends NexusAuthMethod>(options: {
    type: 'nexus-repository-manager';
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<NexusConnection<TAuthMethod>>;

  find(options: {
    type: 'nexus-repository-manager';
    query: { url: string };
  }): Promise<Omit<NexusConnection, 'auth'>>;
}

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

// The validation follows `buildConnectionsFromConfig` of
// `@backstage/connections`, limited to the Nexus connection type.
function validateConnection(connection: JsonObject): NexusConfiguredConnection {
  if (connection.type !== nexusConnectionType.type) {
    throw new InputError(`Unrecognised connection type ${connection.type}`);
  }

  const rawAuth = connection.auth;
  if (!Array.isArray(rawAuth) || rawAuth.length === 0) {
    throw new InputError(
      `Connection of type "${connection.type}" must configure at least one auth method`,
    );
  }

  const auth = (rawAuth as JsonObject[]).map(entry => {
    if (typeof entry.method !== 'string') {
      throw new InputError(
        `Auth entry for connection type "${connection.type}" is missing a "method" field`,
      );
    }
    const authMethod = nexusConnectionType.authMethods.find(
      am => am.method === entry.method,
    );
    if (!authMethod) {
      throw new InputError(
        `Unknown auth method "${entry.method}" for connection type "${connection.type}"`,
      );
    }
    const { method, title, match, ...rest } = entry;
    return {
      ...authMethod.configSchema.parse(rest),
      method,
      title: title as string | undefined,
      match: match as { plugins: string[] } | undefined,
    } as NexusConfiguredConnection['auth'][number];
  });

  const {
    type: _type,
    auth: _auth,
    title,
    match,
    ...configFields
  } = connection;
  const parsed = nexusConnectionType.configSchema.parse(configFields);

  return {
    ...parsed,
    type: nexusConnectionType.type,
    title: title as string | undefined,
    match: match as { plugins: string[] } | undefined,
    auth,
  };
}

function buildConnectionsFromConfig(
  config: Config,
): NexusConfiguredConnection[] {
  const raw = config.getOptional(CONNECTIONS_CONFIG_KEY);
  if (raw !== undefined && !Array.isArray(raw)) {
    throw new InputError(
      `Expected "${CONNECTIONS_CONFIG_KEY}" config to be an array of connection objects`,
    );
  }

  // Connections of other types belong to the Backstage connections service.
  const nexusEntries = ((raw as JsonObject[] | undefined) ?? []).filter(
    v => v.type === nexusConnectionType.type,
  );

  const connections = nexusEntries.map(v => {
    try {
      return validateConnection(v);
    } catch (e) {
      const type = typeof v.type === 'string' ? v.type : 'unknown';
      throw new InputError(
        `Invalid connection of type "${type}" in ${CONNECTIONS_CONFIG_KEY} config:\n${describeError(
          e,
        )}`,
      );
    }
  });

  const hostsSeen = new Set<string>();
  for (const c of connections) {
    if (hostsSeen.has(c.host)) {
      throw new InputError(
        `Duplicate connection of type "${c.type}" for host "${c.host}"`,
      );
    }
    hostsSeen.add(c.host);
  }

  for (const c of connections) {
    c.title ??=
      connections.length > 1
        ? `${nexusConnectionType.title} (${c.host})`
        : nexusConnectionType.title;
    for (const auth of c.auth) {
      auth.title ??= nexusConnectionType.authMethods.find(
        am => am.method === auth.method,
      )!.title;
    }
  }

  return connections;
}

class PluginNexusConnectionsService implements NexusConnectionsService {
  constructor(
    private readonly logger: LoggerService,
    private readonly connections: NexusConfiguredConnection[],
  ) {}

  /**
   * The query for the first connection that is available to the plugin, used
   * when an entity doesn't select a connection itself.
   */
  getDefaultQuery(): { url: string } | undefined {
    const [first] = this.connections;
    return first ? { url: `https://${first.host}` } : undefined;
  }

  async find(options: {
    type: 'nexus-repository-manager';
    query: { url: string };
    authMethods?: readonly [NexusAuthMethod, ...NexusAuthMethod[]];
  }): Promise<any> {
    const { type, query, authMethods } = options;
    if (type !== nexusConnectionType.type) {
      throw new InputError(`Unrecognised connection type ${type}`);
    }

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
      const { auth: _, match: _match, ...info } = connection;
      return info;
    }

    if (connection.auth.length === 0) {
      throw new NotAllowedError(
        `Connection of type "${type}" for host "${host}" has no auth method available to this plugin`,
      );
    }

    // Nexus connections have no custom auth matching, so the first eligible
    // auth entry is selected, the same as the default of the connections
    // service.
    const { match: _match, ...selected } = connection.auth[0];
    if (!(authMethods as readonly string[]).includes(selected.method)) {
      throw new NotAllowedError(
        `Connection not found for type "${type}" with auth method "${selected.method}"`,
      );
    }

    this.logger.debug(
      `Selected connection of type "${type}" for host "${host}" using auth method "${selected.method}"`,
    );

    const { match: _connectionMatch, ...rest } = connection;
    return { ...rest, auth: selected };
  }
}

/**
 * Loads the Nexus Repository Manager connections from config and hands out
 * plugin-scoped lookups. Mirrors the `DefaultConnectionsService` of the
 * Backstage connections framework.
 *
 * @internal
 */
export class DefaultNexusConnectionsService {
  static create(options: {
    config: Config;
    logger: LoggerService;
  }): DefaultNexusConnectionsService {
    return new DefaultNexusConnectionsService(
      options.logger,
      buildConnectionsFromConfig(options.config),
    );
  }

  private constructor(
    private readonly logger: LoggerService,
    private readonly connections: NexusConfiguredConnection[],
  ) {
    if (connections.length > 0) {
      logger.info(
        `Loaded ${connections.length} Nexus Repository Manager connection${
          connections.length === 1 ? '' : 's'
        } from configuration`,
      );
    }
  }

  /**
   * Returns the connections for a plugin. Connections and auth entries whose
   * `match.plugins` exclude the plugin are left out, and auth entries that
   * explicitly match the plugin come first.
   */
  forPlugin(
    pluginId: string,
    options?: { logger: LoggerService },
  ): NexusConnectionsService & {
    getDefaultQuery(): { url: string } | undefined;
  } {
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

    return new PluginNexusConnectionsService(
      options?.logger ?? this.logger,
      connections,
    );
  }
}
