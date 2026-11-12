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
import { InputError, NotAllowedError, NotFoundError } from '@backstage/errors';
import type { JsonObject } from '@backstage/types';
import {
  AcrConnection,
  AcrConnectionAuthMethod,
  acrConnectionType,
} from './acrConnectionType';

const CONFIG_KEY = 'acr.connections';

type ConfiguredAuth = AcrConnection['auth'] & {
  match?: { plugins: string[] };
};

type ConfiguredConnection = Omit<AcrConnection, 'auth'> & {
  match?: { plugins: string[] };
  auth: ConfiguredAuth[];
};

/**
 * Looks up Azure Container Registry connections.
 *
 * @remarks
 *
 * Mirrors the `find` method of the `ConnectionsService` from
 * `@backstage/connections`, so that it can be replaced by the core service
 * once it supports connection types that are provided by plugins.
 *
 * @public
 */
export interface AcrConnectionsService {
  /**
   * Finds the connection for the registry host of the given URL, including
   * the first auth method that is available to this plugin.
   */
  find<TAuthMethod extends AcrConnectionAuthMethod>(options: {
    type: 'acr';
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<AcrConnection<TAuthMethod>>;
  /**
   * Finds the connection for the registry host of the given URL, without
   * any auth information.
   */
  find(options: {
    type: 'acr';
    query: { url: string };
  }): Promise<Omit<AcrConnection, 'auth'>>;

  /**
   * Lists all connections that are available to this plugin, without any
   * auth information. The first connection is the default connection.
   */
  list(): Promise<Omit<AcrConnection, 'auth'>[]>;
}

function asObject(value: unknown, what: string): JsonObject {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new InputError(`Expected ${what} to be an object`);
  }
  return value as JsonObject;
}

function parseMatch(value: unknown, what: string) {
  if (value === undefined) {
    return undefined;
  }
  const { plugins } = asObject(value, `"match" of ${what}`);
  if (
    !Array.isArray(plugins) ||
    !plugins.every(plugin => typeof plugin === 'string')
  ) {
    throw new InputError(
      `Expected "match.plugins" of ${what} to be an array of strings`,
    );
  }
  return { plugins: plugins as string[] };
}

function parseConnection(raw: unknown, index: number): ConfiguredConnection {
  const what = `${CONFIG_KEY}[${index}]`;
  const {
    type,
    title,
    match,
    auth: rawAuth,
    ...configFields
  } = asObject(raw, what);

  if (type !== acrConnectionType.type) {
    throw new InputError(
      `Unrecognised connection type ${JSON.stringify(
        type,
      )} in ${what}, expected "${acrConnectionType.type}"`,
    );
  }
  if (title !== undefined && typeof title !== 'string') {
    throw new InputError(`Expected "title" of ${what} to be a string`);
  }
  if (!Array.isArray(rawAuth) || rawAuth.length === 0) {
    throw new InputError(
      `Connection ${what} must configure at least one auth method`,
    );
  }

  const config = acrConnectionType.configSchema.parse(configFields);

  const auth = rawAuth.map((rawEntry, authIndex) => {
    const authWhat = `${what}.auth[${authIndex}]`;
    const {
      method,
      title: authTitle,
      match: authMatch,
      ...rest
    } = asObject(rawEntry, authWhat);
    const authMethod = acrConnectionType.authMethods.find(
      am => am.method === method,
    );
    if (!authMethod) {
      throw new InputError(
        `Unknown auth method ${JSON.stringify(method)} in ${authWhat}`,
      );
    }
    if (authTitle !== undefined && typeof authTitle !== 'string') {
      throw new InputError(`Expected "title" of ${authWhat} to be a string`);
    }
    return {
      ...authMethod.configSchema.parse(rest),
      method: authMethod.method,
      title: authTitle ?? authMethod.title,
      match: parseMatch(authMatch, authWhat),
    } as ConfiguredAuth;
  });

  return {
    ...config,
    type: acrConnectionType.type,
    title: title ?? `${acrConnectionType.title} (${config.host})`,
    match: parseMatch(match, what),
    auth,
  };
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    throw new InputError(`Invalid url "${url}" passed to find`);
  }
}

function withoutAuth(
  connection: ConfiguredConnection,
): Omit<AcrConnection, 'auth'> {
  const { auth: _auth, match: _match, ...info } = connection;
  return info;
}

/**
 * Default implementation of the {@link AcrConnectionsService} that reads
 * connections from the `acr.connections` configuration.
 *
 * @public
 */
export class DefaultAcrConnectionsService implements AcrConnectionsService {
  static create(options: {
    config: RootConfigService;
    logger: LoggerService;
    pluginId?: string;
  }): DefaultAcrConnectionsService {
    const pluginId = options.pluginId ?? 'acr';
    const raw = options.config.getOptional(CONFIG_KEY) ?? [];
    if (!Array.isArray(raw)) {
      throw new InputError(
        `Expected "${CONFIG_KEY}" config to be an array of connection objects`,
      );
    }

    const connections = raw.map(parseConnection);

    const seenHosts = new Set<string>();
    for (const connection of connections) {
      if (seenHosts.has(connection.host)) {
        throw new InputError(
          `Duplicate connection of type "acr" for host "${connection.host}"`,
        );
      }
      seenHosts.add(connection.host);
    }

    const pluginConnections = connections.flatMap(connection => {
      if (connection.match && !connection.match.plugins.includes(pluginId)) {
        return [];
      }
      const matched = connection.auth.filter(a =>
        a.match?.plugins.includes(pluginId),
      );
      const unmatched = connection.auth.filter(a => !a.match);
      return [{ ...connection, auth: [...matched, ...unmatched] }];
    });

    options.logger.info(
      `Loaded ${pluginConnections.length} Azure Container Registry connection${
        pluginConnections.length === 1 ? '' : 's'
      } from configuration`,
    );

    return new DefaultAcrConnectionsService(pluginConnections);
  }

  private constructor(private readonly connections: ConfiguredConnection[]) {}

  async list(): Promise<Omit<AcrConnection, 'auth'>[]> {
    return this.connections.map(withoutAuth);
  }

  find<TAuthMethod extends AcrConnectionAuthMethod>(options: {
    type: 'acr';
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<AcrConnection<TAuthMethod>>;
  find(options: {
    type: 'acr';
    query: { url: string };
  }): Promise<Omit<AcrConnection, 'auth'>>;
  async find(options: {
    type: 'acr';
    query: { url: string };
    authMethods?: readonly string[];
  }): Promise<AcrConnection | Omit<AcrConnection, 'auth'>> {
    const host = hostFromUrl(options.query.url);
    const connection = this.connections.find(c => c.host === host);
    if (!connection) {
      throw new NotFoundError(
        `Connection not found for type "acr" and host "${host}"`,
      );
    }
    if (!options.authMethods) {
      return withoutAuth(connection);
    }

    const selected = connection.auth[0];
    if (!selected) {
      throw new NotAllowedError(
        `Connection of type "acr" for host "${host}" has no auth method available to this plugin`,
      );
    }
    if (!options.authMethods.includes(selected.method)) {
      throw new NotAllowedError(
        `Connection not found for type "acr" with auth method "${selected.method}"`,
      );
    }
    const { match: _match, ...auth } = selected;
    return { ...withoutAuth(connection), auth } as AcrConnection;
  }
}
