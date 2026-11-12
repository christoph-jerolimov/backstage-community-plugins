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
import type { JsonValue } from '@backstage/types';
import { DefaultAcrConnectionsService } from './AcrConnectionsService';

function create(connections: JsonValue | undefined) {
  return DefaultAcrConnectionsService.create({
    config: mockServices.rootConfig({
      data: connections === undefined ? {} : { acr: { connections } },
    }),
    logger: mockServices.logger.mock(),
  });
}

describe('DefaultAcrConnectionsService', () => {
  it('finds connections in the connections config format', async () => {
    const service = create([
      {
        type: 'azure-container-registry',
        host: 'one.azurecr.io',
        auth: [{ method: 'token', token: 'secret-token' }],
      },
      {
        type: 'azure-container-registry',
        host: 'two.azurecr.io',
        title: 'Second',
        apiBaseUrl: 'http://localhost:1234/acr/v1',
        auth: [
          { method: 'none', match: { plugins: ['other'] } },
          { method: 'basic', username: 'user', password: 'pass' },
          { method: 'none', title: 'Anonymous', match: { plugins: ['acr'] } },
        ],
      },
      {
        type: 'azure-container-registry',
        host: 'hidden.azurecr.io',
        match: { plugins: ['other'] },
        auth: [{ method: 'none' }],
      },
    ]);
    expect(service.getDefaultUrl()).toBe('https://one.azurecr.io');

    const connections = service.forPlugin('acr');

    await expect(
      connections.find({
        type: 'azure-container-registry',
        query: { url: 'https://one.azurecr.io/some/path' },
        authMethods: ['token'],
      }),
    ).resolves.toEqual({
      type: 'azure-container-registry',
      host: 'one.azurecr.io',
      title: 'Azure Container Registry (one.azurecr.io)',
      auth: { method: 'token', title: 'Token', token: 'secret-token' },
    });

    // Auth entries that match the plugin are preferred over unmatched ones
    await expect(
      connections.find({
        type: 'azure-container-registry',
        query: { url: 'https://two.azurecr.io' },
        authMethods: ['none', 'basic'],
      }),
    ).resolves.toMatchObject({
      title: 'Second',
      apiBaseUrl: 'http://localhost:1234/acr/v1',
      auth: { method: 'none', title: 'Anonymous' },
    });
    await expect(
      service.forPlugin('catalog').find({
        type: 'azure-container-registry',
        query: { url: 'https://two.azurecr.io' },
        authMethods: ['basic'],
      }),
    ).resolves.toMatchObject({
      auth: { method: 'basic', title: 'Basic', username: 'user' },
    });

    await expect(
      connections.find({
        type: 'azure-container-registry',
        query: { url: 'https://two.azurecr.io' },
      }),
    ).resolves.not.toHaveProperty('auth');

    await expect(
      connections.find({
        type: 'azure-container-registry',
        query: { url: 'https://one.azurecr.io' },
        authMethods: ['basic'],
      }),
    ).rejects.toThrow(
      'Connection not found for type "azure-container-registry" with auth method "token"',
    );
    await expect(
      connections.find({
        type: 'azure-container-registry',
        query: { url: 'https://hidden.azurecr.io' },
      }),
    ).rejects.toThrow(
      'Connection not found for type "azure-container-registry"',
    );
    await expect(
      service.forPlugin('other').find({
        type: 'azure-container-registry',
        query: { url: 'https://hidden.azurecr.io' },
      }),
    ).resolves.toMatchObject({ host: 'hidden.azurecr.io' });
    await expect(
      connections.find({
        type: 'azure-container-registry',
        query: { url: 'not a url' },
      }),
    ).rejects.toThrow('Invalid url "not a url"');
  });

  it('uses the type title for a single connection and handles missing config', async () => {
    const single = create([
      {
        type: 'azure-container-registry',
        host: 'one.azurecr.io',
        auth: [{ method: 'none' }],
      },
    ]);
    await expect(
      single.forPlugin('acr').find({
        type: 'azure-container-registry',
        query: { url: 'https://one.azurecr.io' },
      }),
    ).resolves.toMatchObject({ title: 'Azure Container Registry' });

    expect(create(undefined).getDefaultUrl()).toBeUndefined();
  });

  it('rejects invalid config', () => {
    expect(() => create({ type: 'azure-container-registry' })).toThrow(
      'Expected "acr.connections" config to be an array',
    );
    expect(() =>
      create([{ type: 'github', host: 'x', auth: [{ method: 'none' }] }]),
    ).toThrow(
      'Invalid connection of type "github" in acr.connections config:\nUnrecognised connection type github',
    );
    expect(() =>
      create([{ type: 'azure-container-registry', host: 'x', auth: [] }]),
    ).toThrow('must configure at least one auth method');
    expect(() =>
      create([
        {
          type: 'azure-container-registry',
          host: 'x',
          auth: [{ method: 'pat' }],
        },
      ]),
    ).toThrow(
      'Unknown auth method "pat" for connection type "azure-container-registry"',
    );
    expect(() =>
      create([
        {
          type: 'azure-container-registry',
          host: 'x',
          auth: [{ method: 'token' }],
        },
      ]),
    ).toThrow(
      'Invalid connection of type "azure-container-registry" in acr.connections config:\n✖ Invalid input: expected string, received undefined\n  → at token',
    );
    expect(() =>
      create([
        {
          type: 'azure-container-registry',
          host: 'x',
          name: 'legacy',
          auth: [{ method: 'none' }],
        },
      ]),
    ).toThrow('Unrecognized key: "name"');
    expect(() =>
      create([
        {
          type: 'azure-container-registry',
          host: 'x',
          auth: [{ method: 'none' }],
        },
        {
          type: 'azure-container-registry',
          host: 'x',
          auth: [{ method: 'none' }],
        },
      ]),
    ).toThrow(
      'Duplicate connection of type "azure-container-registry" for host "x"',
    );
  });
});
