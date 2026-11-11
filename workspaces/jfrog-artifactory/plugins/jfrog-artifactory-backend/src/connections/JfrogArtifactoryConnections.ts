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
import { Config } from '@backstage/config';
import { InputError, NotFoundError } from '@backstage/errors';
import { JsonObject } from '@backstage/types';
import {
  JfrogArtifactoryAuthMethod,
  JfrogArtifactoryConnection,
  jfrogArtifactoryConnectionType,
} from './jfrogArtifactoryConnectionType';

const CONFIG_KEY = 'jfrogArtifactory.connections';

/**
 * Looks up configured JFrog Artifactory connections.
 *
 * @remarks
 *
 * Mirrors the `find` method of the Backstage `ConnectionsService`, scoped to
 * the JFrog Artifactory connection type.
 *
 * @public
 */
export interface JfrogArtifactoryConnectionsService {
  /**
   * Finds the connection for the given URL, using the first configured auth
   * entry that matches one of the requested auth methods.
   */
  find<TAuthMethod extends JfrogArtifactoryAuthMethod>(options: {
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<JfrogArtifactoryConnection<TAuthMethod>>;

  /**
   * Returns the host of the first configured connection, used when an entity
   * does not select a specific instance.
   */
  getDefaultHost(): string | undefined;
}

/**
 * Reads JFrog Artifactory connections from the `jfrogArtifactory.connections`
 * configuration, using the Backstage connections configuration format.
 *
 * @public
 */
export class JfrogArtifactoryConnections
  implements JfrogArtifactoryConnectionsService
{
  static fromConfig(config: Config): JfrogArtifactoryConnections {
    const raw = config.getOptional(CONFIG_KEY);
    if (raw === undefined) {
      return new JfrogArtifactoryConnections([]);
    }
    if (!Array.isArray(raw)) {
      throw new InputError(
        `Expected "${CONFIG_KEY}" config to be an array of connection objects`,
      );
    }

    const connections = raw.map((entry, index) => {
      try {
        return parseConnection(entry as JsonObject);
      } catch (error) {
        throw new InputError(
          `Invalid JFrog Artifactory connection at ${CONFIG_KEY}[${index}]: ${
            (error as Error).message
          }`,
        );
      }
    });

    const seen = new Set<string>();
    for (const connection of connections) {
      const key = connection.host.toLocaleLowerCase('en-US');
      if (seen.has(key)) {
        throw new InputError(
          `Duplicate JFrog Artifactory connection for host "${connection.host}"`,
        );
      }
      seen.add(key);
    }

    return new JfrogArtifactoryConnections(connections);
  }

  private constructor(
    private readonly connections: ConfiguredJfrogArtifactoryConnection[],
  ) {}

  async find<TAuthMethod extends JfrogArtifactoryAuthMethod>(options: {
    query: { url: string };
    authMethods: readonly [TAuthMethod, ...TAuthMethod[]];
  }): Promise<JfrogArtifactoryConnection<TAuthMethod>> {
    const host = hostFromUrl(options.query.url);
    const connection = this.connections.find(
      c =>
        c.host.toLocaleLowerCase('en-US') === host.toLocaleLowerCase('en-US'),
    );
    if (!connection) {
      throw new NotFoundError(
        `No JFrog Artifactory connection configured for host "${host}"`,
      );
    }

    const auth = connection.auth.find(a =>
      (options.authMethods as readonly string[]).includes(a.method),
    );
    if (!auth) {
      throw new NotFoundError(
        `JFrog Artifactory connection for host "${host}" has no auth method of type ${options.authMethods
          .map(m => `"${m}"`)
          .join(', ')}`,
      );
    }

    // The auth entry is narrowed to the requested methods by the check above.
    return {
      ...connection,
      auth: auth as JfrogArtifactoryConnection<TAuthMethod>['auth'],
    };
  }

  getDefaultHost(): string | undefined {
    return this.connections[0]?.host;
  }
}

/** A connection as read from config, with all of its auth entries. */
type ConfiguredJfrogArtifactoryConnection = Omit<
  JfrogArtifactoryConnection,
  'auth'
> & {
  auth: JfrogArtifactoryConnection['auth'][];
};

function parseConnection(
  entry: JsonObject,
): ConfiguredJfrogArtifactoryConnection {
  if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
    throw new InputError('Expected a connection object');
  }
  const { type, title, match: _match, auth: rawAuth, ...fields } = entry;
  if (type !== undefined && type !== jfrogArtifactoryConnectionType.type) {
    throw new InputError(
      `Unexpected connection type "${type}", expected "${jfrogArtifactoryConnectionType.type}"`,
    );
  }
  if (!Array.isArray(rawAuth) || rawAuth.length === 0) {
    throw new InputError('Must configure at least one auth method');
  }

  const parsed = jfrogArtifactoryConnectionType.configSchema.parse(fields);

  const auth = rawAuth.map((rawEntry): JfrogArtifactoryConnection['auth'] => {
    const {
      method,
      title: authTitle,
      match: _authMatch,
      ...rest
    } = (rawEntry ?? {}) as JsonObject;
    const authMethod = jfrogArtifactoryConnectionType.authMethods.find(
      am => am.method === method,
    );
    if (!authMethod) {
      throw new InputError(`Unknown auth method "${method}"`);
    }
    return {
      ...authMethod.configSchema.parse(rest),
      method: authMethod.method,
      title: typeof authTitle === 'string' ? authTitle : authMethod.title,
    } as JfrogArtifactoryConnection['auth'];
  });

  return {
    ...parsed,
    type: jfrogArtifactoryConnectionType.type,
    title:
      typeof title === 'string'
        ? title
        : `${jfrogArtifactoryConnectionType.title} (${parsed.host})`,
    auth,
  };
}

function hostFromUrl(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    throw new InputError(`Invalid JFrog Artifactory URL "${url}"`);
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
 * Returns the HTTP headers needed to authenticate against a connection.
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
