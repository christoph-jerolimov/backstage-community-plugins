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
import { mockServices } from '@backstage/backend-test-utils';
import {
  DefaultJfrogArtifactoryConnectionsService,
  getConnectionAuthHeaders,
  getConnectionBaseUrl,
} from './JfrogArtifactoryConnectionsService';

function create(connections: unknown) {
  return DefaultJfrogArtifactoryConnectionsService.create({
    logger: mockServices.logger.mock(),
    config: mockServices.rootConfig({
      data: { jfrogArtifactory: { connections } } as any,
    }),
  });
}

describe('DefaultJfrogArtifactoryConnectionsService', () => {
  it('reads connections in the connections config format and finds them by host', async () => {
    const service = create([
      {
        type: 'jfrog-artifactory',
        host: 'acme.jfrog.io',
        auth: [{ method: 'token', token: 'secret-token' }],
      },
      {
        type: 'jfrog-artifactory',
        host: 'artifactory.example.com:8082',
        baseUrl: 'http://artifactory.example.com:8082/',
        title: 'Internal',
        auth: [
          {
            method: 'basic',
            title: 'Service account',
            username: 'user',
            password: 'pass',
          },
        ],
      },
    ]);
    const connections = service.forPlugin('jfrog-artifactory');

    expect(connections.getDefaultUrl()).toBe('https://acme.jfrog.io');

    const token = await connections.find({
      type: 'jfrog-artifactory',
      query: { url: 'https://acme.jfrog.io/some/path' },
      authMethods: ['token'],
    });
    expect(token).toEqual({
      type: 'jfrog-artifactory',
      title: 'JFrog Artifactory (acme.jfrog.io)',
      host: 'acme.jfrog.io',
      auth: { method: 'token', title: 'Token', token: 'secret-token' },
    });
    expect(getConnectionBaseUrl(token)).toBe('https://acme.jfrog.io');
    expect(getConnectionAuthHeaders(token)).toEqual({
      Authorization: 'Bearer secret-token',
    });

    const basic = await connections.find({
      type: 'jfrog-artifactory',
      query: { url: 'https://artifactory.example.com:8082' },
      authMethods: ['token', 'basic'],
    });
    expect(basic).toEqual({
      type: 'jfrog-artifactory',
      title: 'Internal',
      host: 'artifactory.example.com:8082',
      baseUrl: 'http://artifactory.example.com:8082/',
      auth: {
        method: 'basic',
        title: 'Service account',
        username: 'user',
        password: 'pass',
      },
    });
    expect(getConnectionBaseUrl(basic)).toBe(
      'http://artifactory.example.com:8082',
    );
    expect(getConnectionAuthHeaders(basic)).toEqual({
      Authorization: `Basic ${Buffer.from('user:pass').toString('base64')}`,
    });

    // Without auth methods, the connection is returned without credentials
    await expect(
      connections.find({
        type: 'jfrog-artifactory',
        query: { url: 'https://acme.jfrog.io' },
      }),
    ).resolves.toEqual({
      type: 'jfrog-artifactory',
      title: 'JFrog Artifactory (acme.jfrog.io)',
      host: 'acme.jfrog.io',
    });

    await expect(
      connections.find({
        type: 'jfrog-artifactory',
        query: { url: 'https://unknown.jfrog.io' },
        authMethods: ['token'],
      }),
    ).rejects.toThrow('Connection not found for type "jfrog-artifactory"');

    // Auth methods declare what the caller supports, they don't filter
    await expect(
      connections.find({
        type: 'jfrog-artifactory',
        query: { url: 'https://acme.jfrog.io' },
        authMethods: ['basic'],
      }),
    ).rejects.toThrow(
      'Connection not found for type "jfrog-artifactory" with auth method "token"',
    );

    await expect(
      connections.find({
        type: 'jfrog-artifactory',
        query: { url: 'not a url' },
        authMethods: ['token'],
      }),
    ).rejects.toThrow('Invalid url "not a url"');
  });

  it('uses a single default title and supports anonymous access', async () => {
    const connections = create([
      {
        type: 'jfrog-artifactory',
        host: 'acme.jfrog.io',
        auth: [{ method: 'none' }],
      },
    ]).forPlugin('jfrog-artifactory');

    const none = await connections.find({
      type: 'jfrog-artifactory',
      query: { url: 'https://acme.jfrog.io' },
      authMethods: ['token', 'none'],
    });
    expect(none).toEqual({
      type: 'jfrog-artifactory',
      title: 'JFrog Artifactory',
      host: 'acme.jfrog.io',
      auth: { method: 'none', title: 'None' },
    });
    expect(getConnectionAuthHeaders(none)).toEqual({});
  });

  it('scopes connections and auth methods to plugins', async () => {
    const service = create([
      {
        type: 'jfrog-artifactory',
        host: 'acme.jfrog.io',
        auth: [
          { method: 'token', token: 'shared-token' },
          {
            method: 'token',
            token: 'jfrog-token',
            match: { plugins: ['jfrog-artifactory'] },
          },
          {
            method: 'token',
            token: 'other-token',
            match: { plugins: ['other'] },
          },
        ],
      },
      {
        type: 'jfrog-artifactory',
        host: 'restricted.jfrog.io',
        match: { plugins: ['other'] },
        auth: [{ method: 'none' }],
      },
    ]);

    const jfrog = service.forPlugin('jfrog-artifactory');
    await expect(
      jfrog.find({
        type: 'jfrog-artifactory',
        query: { url: 'https://acme.jfrog.io' },
        authMethods: ['token'],
      }),
    ).resolves.toMatchObject({ auth: { token: 'jfrog-token' } });
    await expect(
      jfrog.find({
        type: 'jfrog-artifactory',
        query: { url: 'https://restricted.jfrog.io' },
        authMethods: ['none'],
      }),
    ).rejects.toThrow('Connection not found');

    const unrelated = service.forPlugin('catalog');
    await expect(
      unrelated.find({
        type: 'jfrog-artifactory',
        query: { url: 'https://acme.jfrog.io' },
        authMethods: ['token'],
      }),
    ).resolves.toMatchObject({ auth: { token: 'shared-token' } });
  });

  it('returns no connections when none are configured', () => {
    const service = DefaultJfrogArtifactoryConnectionsService.create({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
    });
    expect(service.forPlugin('jfrog-artifactory').getDefaultUrl()).toBe(
      undefined,
    );
  });

  it('rejects invalid configuration', () => {
    const valid = { type: 'jfrog-artifactory', host: 'acme.jfrog.io' };

    expect(() => create({})).toThrow(
      'Expected "jfrogArtifactory.connections" config to be an array of connection objects',
    );
    expect(() =>
      create([{ host: 'acme.jfrog.io', auth: [{ method: 'none' }] }]),
    ).toThrow('Unrecognised connection type undefined');
    expect(() =>
      create([{ ...valid, type: 'github', auth: [{ method: 'none' }] }]),
    ).toThrow('Invalid connection of type "github"');
    expect(() => create([{ ...valid, auth: [] }])).toThrow(
      'Connection of type "jfrog-artifactory" must configure at least one auth method',
    );
    expect(() => create([{ ...valid, auth: [{ token: 'x' }] }])).toThrow(
      'Auth entry for connection type "jfrog-artifactory" is missing a "method" field',
    );
    expect(() => create([{ ...valid, auth: [{ method: 'oauth' }] }])).toThrow(
      'Unknown auth method "oauth" for connection type "jfrog-artifactory"',
    );
    expect(() => create([{ ...valid, auth: [{ method: 'token' }] }])).toThrow(
      /expected string, received undefined[\s\S]*at token/,
    );
    expect(() =>
      create([{ ...valid, unknown: true, auth: [{ method: 'none' }] }]),
    ).toThrow(/Unrecognized key: "unknown"/);
    expect(() =>
      create([
        { ...valid, auth: [{ method: 'none' }] },
        { ...valid, auth: [{ method: 'none' }] },
      ]),
    ).toThrow(
      'Duplicate connection of type "jfrog-artifactory" for host "acme.jfrog.io"',
    );
  });
});
