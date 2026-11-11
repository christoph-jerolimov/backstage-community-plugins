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
import type { Config } from '@backstage/config';
import type { ConnectionAuthValue } from '@backstage/connections';
import { InputError, NotFoundError } from '@backstage/errors';
import type { JsonObject } from '@backstage/types';
import {
  type NexusAuthMethod,
  type NexusConnection,
  nexusConnectionType,
} from './nexusConnectionType';

/** The config key that holds the Nexus Repository Manager connections. */
export const NEXUS_CONNECTIONS_CONFIG_KEY =
  'nexusRepositoryManager.connections';

type NexusAuth = ConnectionAuthValue<
  (typeof nexusConnectionType)['auth'][number]
>;

type ResolvedConnection = NexusConnection & { auth: NexusAuth[] };

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseAuth(entry: JsonObject, location: string): NexusAuth {
  const { method, title, ...fields } = entry;
  const authMethod = nexusConnectionType.authMethods.find(
    m => m.method === method,
  );
  if (!authMethod) {
    const supported = nexusConnectionType.authMethods
      .map(m => m.method)
      .join(', ');
    throw new InputError(
      `Unknown auth method "${method}" at ${location}, expected one of ${supported}`,
    );
  }
  if (title !== undefined && typeof title !== 'string') {
    throw new InputError(`Invalid title at ${location}, must be a string`);
  }
  try {
    return {
      ...authMethod.configSchema.parse(fields),
      method: authMethod.method,
      title: title ?? authMethod.title,
    } as NexusAuth;
  } catch (error) {
    throw new InputError(
      `Invalid "${authMethod.method}" auth at ${location}: ${describeError(
        error,
      )}`,
    );
  }
}

function parseConnection(
  value: JsonObject,
  location: string,
): ResolvedConnection {
  const { type, title, auth, ...fields } = value;
  if (type !== undefined && type !== nexusConnectionType.type) {
    throw new InputError(
      `Invalid connection type "${type}" at ${location}, expected "${nexusConnectionType.type}"`,
    );
  }
  if (title !== undefined && typeof title !== 'string') {
    throw new InputError(`Invalid title at ${location}, must be a string`);
  }
  if (!Array.isArray(auth) || auth.length === 0) {
    throw new InputError(
      `Connection at ${location} must configure at least one auth method`,
    );
  }

  let config;
  try {
    config = nexusConnectionType.configSchema.parse(fields);
  } catch (error) {
    throw new InputError(
      `Invalid connection at ${location}: ${describeError(error)}`,
    );
  }

  return {
    ...config,
    type: nexusConnectionType.type,
    title: title ?? config.host,
    auth: auth.map((entry, index) =>
      parseAuth(entry as JsonObject, `${location}.auth[${index}]`),
    ),
  };
}

/**
 * Holds the configured Nexus Repository Manager connections.
 *
 * @remarks
 *
 * Connections use the same configuration format as the Backstage
 * `connections` config, but are read from `nexusRepositoryManager.connections`
 * because the root `connections` config only accepts the built-in connection
 * types.
 *
 * @public
 */
export class NexusConnections {
  static fromConfig(config: Config): NexusConnections {
    const entries = config.getOptionalConfigArray(NEXUS_CONNECTIONS_CONFIG_KEY);
    const connections = (entries ?? []).map((entry, index) =>
      parseConnection(
        entry.get<JsonObject>(),
        `${NEXUS_CONNECTIONS_CONFIG_KEY}[${index}]`,
      ),
    );

    const hosts = new Set<string>();
    for (const connection of connections) {
      const host = connection.host.toLocaleLowerCase('en-US');
      if (hosts.has(host)) {
        throw new InputError(
          `Duplicate Nexus Repository Manager connection for host "${connection.host}" in ${NEXUS_CONNECTIONS_CONFIG_KEY}`,
        );
      }
      hosts.add(host);
    }

    return new NexusConnections(connections);
  }

  private constructor(private readonly connections: ResolvedConnection[]) {}

  /**
   * Lists the configured connections, without their auth details.
   */
  list(): Array<Pick<NexusConnection, 'type' | 'title' | 'host' | 'baseUrl'>> {
    return this.connections.map(({ type, title, host, baseUrl }) => ({
      type,
      title,
      host,
      baseUrl,
    }));
  }

  /**
   * Finds the connection for the host of the given URL, along with the first
   * configured auth entry that uses one of the accepted methods.
   */
  async find<TAuthMethod extends NexusAuthMethod>(options: {
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<NexusConnection<TAuthMethod>> {
    let host: string;
    try {
      host = new URL(options.query.url).host.toLocaleLowerCase('en-US');
    } catch {
      throw new InputError(`Invalid URL "${options.query.url}"`);
    }

    const connection = this.connections.find(
      c => c.host.toLocaleLowerCase('en-US') === host,
    );
    if (!connection) {
      throw new NotFoundError(
        `No Nexus Repository Manager connection is configured for host "${host}"`,
      );
    }

    const accepted: readonly string[] = options.authMethods;
    const auth = connection.auth.find(a => accepted.includes(a.method));
    if (!auth) {
      throw new NotFoundError(
        `The Nexus Repository Manager connection for host "${host}" has no auth method of type ${options.authMethods.join(
          ', ',
        )}`,
      );
    }

    return { ...connection, auth } as NexusConnection<TAuthMethod>;
  }
}
