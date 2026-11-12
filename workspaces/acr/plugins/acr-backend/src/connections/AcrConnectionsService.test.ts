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

function create(connections: JsonValue | undefined, pluginId?: string) {
  return DefaultAcrConnectionsService.create({
    config: mockServices.rootConfig({
      data: connections === undefined ? {} : { acr: { connections } },
    }),
    logger: mockServices.logger.mock(),
    pluginId,
  });
}

describe('DefaultAcrConnectionsService', () => {
  it('reads connections in the connections config format', async () => {
    const service = create([
      {
        type: 'acr',
        host: 'one.azurecr.io',
        auth: [{ method: 'token', token: 'secret-token' }],
      },
      {
        type: 'acr',
        host: 'two.azurecr.io',
        name: 'two',
        title: 'Second',
        apiBaseUrl: 'http://localhost:1234/acr/v1',
        auth: [
          { method: 'none', match: { plugins: ['other'] } },
          { method: 'basic', username: 'user', password: 'pass' },
          { method: 'none', match: { plugins: ['acr'] } },
        ],
      },
      {
        type: 'acr',
        host: 'hidden.azurecr.io',
        match: { plugins: ['other'] },
        auth: [{ method: 'none' }],
      },
    ]);

    await expect(service.list()).resolves.toEqual([
      {
        type: 'acr',
        host: 'one.azurecr.io',
        title: 'Azure Container Registry (one.azurecr.io)',
      },
      {
        type: 'acr',
        host: 'two.azurecr.io',
        name: 'two',
        title: 'Second',
        apiBaseUrl: 'http://localhost:1234/acr/v1',
      },
    ]);

    await expect(
      service.find({
        type: 'acr',
        query: { url: 'https://one.azurecr.io/some/path' },
        authMethods: ['token'],
      }),
    ).resolves.toEqual({
      type: 'acr',
      host: 'one.azurecr.io',
      title: 'Azure Container Registry (one.azurecr.io)',
      auth: { method: 'token', title: 'Bearer Token', token: 'secret-token' },
    });

    // Auth methods that match the plugin are preferred over unmatched ones
    await expect(
      service.find({
        type: 'acr',
        query: { url: 'https://two.azurecr.io' },
        authMethods: ['none', 'basic'],
      }),
    ).resolves.toMatchObject({ auth: { method: 'none', title: 'None' } });

    await expect(
      service.find({ type: 'acr', query: { url: 'https://two.azurecr.io' } }),
    ).resolves.not.toHaveProperty('auth');

    await expect(
      service.find({
        type: 'acr',
        query: { url: 'https://one.azurecr.io' },
        authMethods: ['basic'],
      }),
    ).rejects.toThrow(
      'Connection not found for type "acr" with auth method "token"',
    );

    await expect(
      service.find({
        type: 'acr',
        query: { url: 'https://hidden.azurecr.io' },
      }),
    ).rejects.toThrow(
      'Connection not found for type "acr" and host "hidden.azurecr.io"',
    );
    await expect(
      service.find({ type: 'acr', query: { url: 'not a url' } }),
    ).rejects.toThrow('Invalid url "not a url"');
  });

  it('returns no connections without config', async () => {
    await expect(create(undefined).list()).resolves.toEqual([]);
  });

  it('rejects invalid config', () => {
    expect(() => create({ type: 'acr' })).toThrow(
      'Expected "acr.connections" config to be an array',
    );
    expect(() =>
      create([{ type: 'github', host: 'x', auth: [{ method: 'none' }] }]),
    ).toThrow('Unrecognised connection type "github" in acr.connections[0]');
    expect(() => create([{ type: 'acr', host: 'x', auth: [] }])).toThrow(
      'must configure at least one auth method',
    );
    expect(() =>
      create([{ type: 'acr', host: 'x', auth: [{ method: 'pat' }] }]),
    ).toThrow('Unknown auth method "pat" in acr.connections[0].auth[0]');
    expect(() =>
      create([{ type: 'acr', host: 'x', auth: [{ method: 'token' }] }]),
    ).toThrow('Invalid configuration for auth method "token"');
    expect(() =>
      create([
        { type: 'acr', host: 'x', unknown: 1, auth: [{ method: 'none' }] },
      ]),
    ).toThrow('Invalid configuration for connection type "acr"');
    expect(() =>
      create([
        { type: 'acr', host: 'x', auth: [{ method: 'none' }] },
        { type: 'acr', host: 'x', auth: [{ method: 'none' }] },
      ]),
    ).toThrow('Duplicate connection of type "acr" for host "x"');
  });
});
