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

// Reads and looks up JFrog Artifactory connections. This follows
// `buildConnectionsFromConfig` of `@backstage/connections/config` and the
// `DefaultConnectionsService` of `@backstage/connections-node`, limited to
// the JFrog Artifactory connection type and a plugin-scoped config key.

import {
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import {
  InputError,
  NotAllowedError,
  NotFoundError,
  toError,
} from '@backstage/errors';
import { JsonObject } from '@backstage/types';
import { z } from 'zod/v4';
import {
  JfrogArtifactoryAuthByMethod,
  JfrogArtifactoryAuthMethod,
  JfrogArtifactoryConnection,
  JfrogArtifactoryConnectionType,
} from './jfrogArtifactoryConnectionType';

/**
 * The config key that holds the JFrog Artifactory connections.
 *
 * @public
 */
export const JFROG_ARTIFACTORY_CONNECTIONS_CONFIG_KEY =
  'jfrogArtifactory.connections';

/**
 * Looks up JFrog Artifactory connections for a plugin.
 *
 * @remarks
 *
 * This has the same `find` signature and behavior as the `ConnectionsService`
 * of `@backstage/backend-plugin-api/alpha`, so that a plugin can switch to the
 * core connections service once it supports JFrog Artifactory connections.
 *
 * @public
 */
export interface JfrogArtifactoryConnectionsService {
  find<TAuthMethod extends JfrogArtifactoryAuthMethod>(options: {
    type: 'jfrog-artifactory';
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<JfrogArtifactoryConnection<TAuthMethod>>;

  find(options: {
    type: 'jfrog-artifactory';
    query: { url: string };
  }): Promise<Omit<JfrogArtifactoryConnection, 'auth'>>;
}

type ConfiguredAuth =
  JfrogArtifactoryAuthByMethod[JfrogArtifactoryAuthMethod] & {
    match?: { plugins: string[] };
  };

type ConfiguredConnection = Omit<JfrogArtifactoryConnection, 'auth'> & {
  match?: { plugins: string[] };
  auth: ConfiguredAuth[];
};

const matchSchema = z
  .object({ plugins: z.array(z.string()) })
  .strict()
  .optional();

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

function parseMatch(value: unknown, context: string) {
  try {
    return matchSchema.parse(value);
  } catch (cause) {
    throw new InputError(`Invalid "match" for ${context}`, cause);
  }
}

function validateConnection(connection: JsonObject): ConfiguredConnection {
  const connectionType = JfrogArtifactoryConnectionType;

  if (connection.type !== connectionType.type) {
    throw new InputError(
      `Unrecognised connection type ${connection.type}, expected "${connectionType.type}"`,
    );
  }

  const rawAuth = connection.auth;
  if (!Array.isArray(rawAuth) || rawAuth.length === 0) {
    throw new InputError(
      `Connection of type "${connection.type}" must configure at least one auth method`,
    );
  }

  const auth = (rawAuth as JsonObject[]).map(entry => {
    if (typeof entry?.method !== 'string') {
      throw new InputError(
        `Auth entry for connection type "${connection.type}" is missing a "method" field`,
      );
    }
    const authMethod = connectionType.authMethods.find(
      am => am.method === entry.method,
    );
    if (!authMethod) {
      throw new InputError(
        `Unknown auth method "${entry.method}" for connection type "${connection.type}"`,
      );
    }
    const { method: _, title, match, ...rest } = entry;
    return {
      ...authMethod.configSchema.parse(rest),
      method: authMethod.method,
      title: typeof title === 'string' ? title : authMethod.title,
      match: parseMatch(match, `auth method "${authMethod.method}"`),
    } as ConfiguredAuth;
  });

  const { type: _, auth: __, title, match, ...configFields } = connection;
  const parsed = connectionType.configSchema.parse(configFields);

  return {
    ...parsed,
    type: connectionType.type,
    title: typeof title === 'string' ? title : '',
    match: parseMatch(match, 'connection'),
    auth,
  };
}

/**
 * Reads the JFrog Artifactory connections from config, in the format of the
 * Backstage connections config.
 */
function buildConnectionsFromConfig(options: {
  config: RootConfigService;
  logger?: LoggerService;
}): ConfiguredConnection[] {
  const { config, logger } = options;
  const raw = config.getOptional(JFROG_ARTIFACTORY_CONNECTIONS_CONFIG_KEY);
  if (raw === undefined) {
    return [];
  }
  if (!Array.isArray(raw)) {
    throw new InputError(
      `Expected "${JFROG_ARTIFACTORY_CONNECTIONS_CONFIG_KEY}" config to be an array of connection objects`,
    );
  }

  const connections = (raw as JsonObject[]).map(entry => {
    try {
      return validateConnection(entry);
    } catch (e) {
      const type = typeof entry?.type === 'string' ? entry.type : 'unknown';
      throw new InputError(
        `Invalid connection of type "${type}" in ${JFROG_ARTIFACTORY_CONNECTIONS_CONFIG_KEY} config:\n${describeError(
          e,
        )}`,
      );
    }
  });

  const identitiesSeen = new Set<string>();
  for (const c of connections) {
    if (identitiesSeen.has(c.host)) {
      throw new InputError(
        `Duplicate connection of type "${c.type}" for host "${c.host}"`,
      );
    }
    identitiesSeen.add(c.host);
  }

  // Default titles, as assigned by the core connections config.
  for (const c of connections) {
    if (!c.title) {
      c.title =
        connections.length > 1
          ? `${JfrogArtifactoryConnectionType.title} (${c.host})`
          : JfrogArtifactoryConnectionType.title;
    }
  }

  logger?.debug(
    `Connections configuration resolved ${
      connections.length
    } JFrog Artifactory connection${connections.length === 1 ? '' : 's'}`,
  );

  return connections;
}

/**
 * A plugin-scoped view on the JFrog Artifactory connections.
 *
 * @public
 */
export class PluginJfrogArtifactoryConnectionsService
  implements JfrogArtifactoryConnectionsService
{
  readonly #logger: LoggerService;
  readonly #connections: ConfiguredConnection[];

  /** @internal */
  constructor(logger: LoggerService, connections: ConfiguredConnection[]) {
    this.#logger = logger;
    this.#connections = connections;
  }

  /**
   * Returns a URL of the first connection, used as the default when no
   * specific JFrog Artifactory instance is requested.
   */
  getDefaultUrl(): string | undefined {
    const connection = this.#connections[0];
    return connection ? `https://${connection.host}` : undefined;
  }

  find<TAuthMethod extends JfrogArtifactoryAuthMethod>(options: {
    type: 'jfrog-artifactory';
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<JfrogArtifactoryConnection<TAuthMethod>>;
  find(options: {
    type: 'jfrog-artifactory';
    query: { url: string };
  }): Promise<Omit<JfrogArtifactoryConnection, 'auth'>>;
  async find(options: {
    type: 'jfrog-artifactory';
    query: { url: string };
    authMethods?: readonly JfrogArtifactoryAuthMethod[];
  }): Promise<
    JfrogArtifactoryConnection | Omit<JfrogArtifactoryConnection, 'auth'>
  > {
    const { type, query, authMethods } = options;
    if (type !== JfrogArtifactoryConnectionType.type) {
      throw new InputError(`Unsupported connection type "${type}"`);
    }

    let host: string;
    try {
      host = new URL(query.url).host;
    } catch {
      throw new InputError(
        `Invalid url "${query.url}" passed to ConnectionsService.find`,
      );
    }

    this.#logger.debug(
      `Finding connection of type "${type}" matching host "${host}"`,
    );

    const connection = this.#connections.find(c => c.host === host);
    if (!connection) {
      throw new NotFoundError(`Connection not found for type "${type}"`);
    }

    const { auth: configuredAuth, match: _, ...info } = connection;
    if (!authMethods) {
      return info;
    }

    if (configuredAuth.length === 0) {
      throw new NotAllowedError(
        `Connection of type "${type}" for host "${host}" has no auth method available to this plugin`,
      );
    }

    const matchAuth = (JfrogArtifactoryConnectionType as any).matchAuth as
      | ((
          authMethods: ConfiguredAuth[],
          query: unknown,
        ) => ConfiguredAuth | undefined)
      | undefined;
    const selected = matchAuth
      ? matchAuth(configuredAuth, query)
      : configuredAuth[0];
    if (!selected) {
      throw new NotFoundError(`Connection not found for type "${type}"`);
    }

    // Like the core connections service, `authMethods` declares what the
    // caller can handle rather than filtering the configured auth entries.
    if (!(authMethods as readonly string[]).includes(selected.method)) {
      throw new NotAllowedError(
        `Connection not found for type "${type}" with auth method "${selected.method}"`,
      );
    }

    this.#logger.debug(
      `Selected connection of type "${type}" for host "${host}" using auth method "${selected.method}"`,
    );

    const { match: __, ...auth } = selected;
    return { ...info, auth } as JfrogArtifactoryConnection;
  }
}

/**
 * Loads JFrog Artifactory connections from config, and provides plugin-scoped
 * lookups like the core `DefaultConnectionsService`.
 *
 * @public
 */
export class DefaultJfrogArtifactoryConnectionsService {
  readonly #logger: LoggerService;
  readonly #connections: ConfiguredConnection[];

  static create(options: {
    logger: LoggerService;
    config: RootConfigService;
  }): DefaultJfrogArtifactoryConnectionsService {
    return new DefaultJfrogArtifactoryConnectionsService(
      options.logger,
      buildConnectionsFromConfig(options),
    );
  }

  private constructor(
    logger: LoggerService,
    connections: ConfiguredConnection[],
  ) {
    this.#logger = logger;
    this.#connections = connections;
  }

  forPlugin(
    pluginId: string,
    options?: { logger: LoggerService },
  ): PluginJfrogArtifactoryConnectionsService {
    // Filter connections and auth methods by plugin scope. Auth entries
    // explicitly matched to this plugin are ordered before unscoped entries
    // so that plugin-specific credentials take precedence.
    const connections = this.#connections.flatMap(connection => {
      if (connection.match && !connection.match.plugins.includes(pluginId)) {
        return [];
      }
      const pluginMatched = connection.auth.filter(a =>
        a.match?.plugins.includes(pluginId),
      );
      const unmatched = connection.auth.filter(a => !a.match);
      return [{ ...connection, auth: [...pluginMatched, ...unmatched] }];
    });

    return new PluginJfrogArtifactoryConnectionsService(
      options?.logger ?? this.#logger,
      connections,
    );
  }
}

/**
 * Returns the base URL of the JFrog Platform API for a connection.
 *
 * @internal
 */
export function getConnectionBaseUrl(
  connection: Pick<JfrogArtifactoryConnection, 'host' | 'baseUrl'>,
): string {
  return (connection.baseUrl ?? `https://${connection.host}`).replace(
    /\/+$/,
    '',
  );
}

/**
 * Returns the HTTP headers needed to authenticate with a connection.
 *
 * @internal
 */
export function getConnectionAuthHeaders(
  connection: JfrogArtifactoryConnection,
): Record<string, string> {
  const auth = connection.auth;
  switch (auth.method) {
    case 'token':
      return { Authorization: `Bearer ${auth.token}` };
    case 'basic':
      return {
        Authorization: `Basic ${Buffer.from(
          `${auth.username}:${auth.password}`,
        ).toString('base64')}`,
      };
    default:
      return {};
  }
}
