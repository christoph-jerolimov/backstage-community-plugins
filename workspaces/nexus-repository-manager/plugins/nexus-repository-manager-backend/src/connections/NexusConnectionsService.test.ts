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
import { DefaultNexusConnectionsService } from './NexusConnectionsService';
import { nexusConnectionType } from './nexusConnectionType';

function create(connections: unknown) {
  return DefaultNexusConnectionsService.create({
    config: mockServices.rootConfig({
      data: { nexusRepositoryManager: { connections } } as any,
    }),
    logger: mockServices.logger.mock(),
  });
}

describe('DefaultNexusConnectionsService', () => {
  it('finds connections with plugin scoping and default titles', async () => {
    const service = create([
      {
        type: 'nexus-repository-manager',
        title: 'Production',
        host: 'nexus.example.com',
        baseUrl: 'https://nexus.example.com/nexus',
        auth: [
          { method: 'none' },
          {
            method: 'token',
            token: 'plugin-token',
            match: { plugins: ['nexus-repository-manager'] },
          },
          {
            method: 'basic',
            username: 'u',
            password: 'p',
            match: { plugins: ['catalog'] },
          },
        ],
      },
      {
        type: 'nexus-repository-manager',
        host: 'internal.example.com',
        match: { plugins: ['catalog'] },
        auth: [{ method: 'none' }],
      },
    ]);

    const nexus = service.forPlugin('nexus-repository-manager');
    const catalog = service.forPlugin('catalog');

    // Auth entries that match the plugin come first
    await expect(
      nexus.find({
        type: 'nexus-repository-manager',
        query: { url: 'https://nexus.example.com/some/path' },
        authMethods: ['none', 'token', 'basic'],
      }),
    ).resolves.toEqual({
      type: 'nexus-repository-manager',
      title: 'Production',
      host: 'nexus.example.com',
      baseUrl: 'https://nexus.example.com/nexus',
      auth: { method: 'token', title: 'Token', token: 'plugin-token' },
    });
    await expect(
      catalog.find({
        type: 'nexus-repository-manager',
        query: { url: 'https://nexus.example.com' },
        authMethods: ['none', 'token', 'basic'],
      }),
    ).resolves.toMatchObject({ auth: { method: 'basic', title: 'Basic' } });

    // Like the connections service, the best auth entry must be supported
    await expect(
      nexus.find({
        type: 'nexus-repository-manager',
        query: { url: 'https://nexus.example.com' },
        authMethods: ['none'],
      }),
    ).rejects.toMatchObject({
      name: 'NotAllowedError',
      message:
        'Connection not found for type "nexus-repository-manager" with auth method "token"',
    });

    // Without auth methods, only the connection info is returned
    await expect(
      nexus.find({
        type: 'nexus-repository-manager',
        query: { url: 'https://nexus.example.com' },
      }),
    ).resolves.not.toHaveProperty('auth');

    // Connections scoped to other plugins are hidden
    await expect(
      catalog.find({
        type: 'nexus-repository-manager',
        query: { url: 'https://internal.example.com' },
        authMethods: ['none'],
      }),
    ).resolves.toMatchObject({
      title: 'Nexus Repository Manager (internal.example.com)',
      auth: { method: 'none', title: 'None' },
    });
    await expect(
      nexus.find({
        type: 'nexus-repository-manager',
        query: { url: 'https://internal.example.com' },
        authMethods: ['none'],
      }),
    ).rejects.toMatchObject({ name: 'NotFoundError' });
    await expect(
      nexus.find({
        type: 'nexus-repository-manager',
        query: { url: 'not a url' },
        authMethods: ['none'],
      }),
    ).rejects.toMatchObject({ name: 'InputError' });

    expect(nexus.getDefaultQuery()).toEqual({
      url: 'https://nexus.example.com',
    });
    expect(create(undefined).forPlugin('x').getDefaultQuery()).toBeUndefined();
  });

  it('rejects invalid configuration like the connections service', () => {
    expect(() =>
      create([{ host: 'a.com', auth: [{ method: 'none' }] }]),
    ).toThrow('Unrecognised connection type undefined');
    expect(() =>
      create([{ type: 'github', host: 'a.com', auth: [{ method: 'none' }] }]),
    ).toThrow('Unrecognised connection type github');
    expect(() =>
      create([{ type: 'nexus-repository-manager', host: 'a.com', auth: [] }]),
    ).toThrow('must configure at least one auth method');
    expect(() =>
      create([
        {
          type: 'nexus-repository-manager',
          host: 'a.com',
          unknown: true,
          auth: [{ method: 'none' }],
        },
      ]),
    ).toThrow(
      /Invalid connection of type "nexus-repository-manager" in nexusRepositoryManager.connections config:\n.*unknown/,
    );
    expect(() =>
      create([
        {
          type: 'nexus-repository-manager',
          host: 'a.com',
          auth: [{ method: 'oauth' }],
        },
      ]),
    ).toThrow('Unknown auth method "oauth"');
    expect(() =>
      create([
        {
          type: 'nexus-repository-manager',
          host: 'a.com',
          auth: [{ method: 'token' }],
        },
      ]),
    ).toThrow(/token/);
    expect(() =>
      create([
        {
          type: 'nexus-repository-manager',
          host: 'a.com',
          auth: [{ method: 'none' }],
        },
        {
          type: 'nexus-repository-manager',
          host: 'a.com',
          auth: [{ method: 'none' }],
        },
      ]),
    ).toThrow(
      'Duplicate connection of type "nexus-repository-manager" for host "a.com"',
    );
  });

  it('exposes JSON schemas like the built-in connection types', () => {
    expect(nexusConnectionType.configSchema.schema().schema).toMatchObject({
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['host'],
      additionalProperties: false,
    });
    expect(
      nexusConnectionType.authMethods.map(m => [
        m.method,
        m.title,
        m.configSchema.schema().schema.required,
      ]),
    ).toEqual([
      ['none', 'None', undefined],
      ['token', 'Token', ['token']],
      ['basic', 'Basic', ['username', 'password']],
    ]);
  });
});
