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
import { NexusConnections } from './NexusConnections';
import { nexusConnectionType } from './nexusConnectionType';

function fromConfig(connections: unknown) {
  return NexusConnections.fromConfig(
    mockServices.rootConfig({
      data: { nexusRepositoryManager: { connections } } as any,
    }),
  );
}

describe('NexusConnections', () => {
  it('resolves connections in the connections config format', async () => {
    const connections = fromConfig([
      {
        type: 'nexus-repository-manager',
        title: 'Production',
        host: 'nexus.example.com',
        baseUrl: 'https://nexus.example.com/nexus',
        auth: [
          { method: 'none' },
          { method: 'token', title: 'CI token', token: 't0k3n' },
        ],
      },
      { host: 'Other.example.com', auth: [{ method: 'none' }] },
    ]);

    expect(connections.list()).toEqual([
      {
        type: 'nexus-repository-manager',
        title: 'Production',
        host: 'nexus.example.com',
        baseUrl: 'https://nexus.example.com/nexus',
      },
      {
        type: 'nexus-repository-manager',
        title: 'Other.example.com',
        host: 'Other.example.com',
        baseUrl: undefined,
      },
    ]);

    await expect(
      connections.find({
        query: { url: 'https://nexus.example.com/some/path' },
        authMethods: ['token'],
      }),
    ).resolves.toMatchObject({
      title: 'Production',
      auth: { method: 'token', title: 'CI token', token: 't0k3n' },
    });
    await expect(
      connections.find({
        query: { url: 'https://nexus.example.com' },
        authMethods: ['basic', 'none'],
      }),
    ).resolves.toMatchObject({
      auth: { method: 'none', title: 'Anonymous' },
    });
    await expect(
      connections.find({
        query: { url: 'http://other.EXAMPLE.com' },
        authMethods: ['none'],
      }),
    ).resolves.toMatchObject({ host: 'Other.example.com' });

    await expect(
      connections.find({
        query: { url: 'https://nexus.example.com' },
        authMethods: ['basic'],
      }),
    ).rejects.toThrow('has no auth method of type basic');
    await expect(
      connections.find({
        query: { url: 'https://unknown.example.com' },
        authMethods: ['none'],
      }),
    ).rejects.toThrow('No Nexus Repository Manager connection is configured');
    await expect(
      connections.find({ query: { url: 'not a url' }, authMethods: ['none'] }),
    ).rejects.toThrow('Invalid URL');
  });

  it('rejects invalid configuration', () => {
    expect(fromConfig(undefined).list()).toEqual([]);
    expect(() =>
      fromConfig([
        { type: 'github', host: 'a.com', auth: [{ method: 'none' }] },
      ]),
    ).toThrow('Invalid connection type "github"');
    expect(() => fromConfig([{ host: 'a.com', auth: [] }])).toThrow(
      'must configure at least one auth method',
    );
    expect(() =>
      fromConfig([{ host: 'https://a.com', auth: [{ method: 'none' }] }]),
    ).toThrow('Invalid connection at nexusRepositoryManager.connections[0]');
    expect(() =>
      fromConfig([{ host: 'a.com', auth: [{ method: 'oauth' }] }]),
    ).toThrow('Unknown auth method "oauth"');
    expect(() =>
      fromConfig([{ host: 'a.com', auth: [{ method: 'token' }] }]),
    ).toThrow(
      'Invalid "token" auth at nexusRepositoryManager.connections[0].auth[0]',
    );
    expect(() =>
      fromConfig([
        { host: 'a.com', auth: [{ method: 'none' }] },
        { host: 'A.com', auth: [{ method: 'none' }] },
      ]),
    ).toThrow('Duplicate Nexus Repository Manager connection for host "A.com"');
  });

  it('exposes JSON schemas for the connection type', () => {
    expect(nexusConnectionType.configSchema.schema().schema).toMatchObject({
      type: 'object',
      required: ['host'],
    });
    expect(
      nexusConnectionType.authMethods.map(m => [
        m.method,
        m.configSchema.schema().schema.required,
      ]),
    ).toEqual([
      ['none', undefined],
      ['token', ['token']],
      ['basic', ['username', 'password']],
    ]);
  });
});
