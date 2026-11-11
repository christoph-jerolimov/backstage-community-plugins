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
import { ConfigReader } from '@backstage/config';
import {
  getConnectionAuthHeaders,
  getConnectionBaseUrl,
  JfrogArtifactoryConnections,
} from './JfrogArtifactoryConnections';

function fromConnections(connections: unknown) {
  return JfrogArtifactoryConnections.fromConfig(
    new ConfigReader({ jfrogArtifactory: { connections } } as any),
  );
}

describe('JfrogArtifactoryConnections', () => {
  it('reads connections and finds them by host and auth method', async () => {
    const connections = fromConnections([
      {
        host: 'acme.jfrog.io',
        auth: [{ method: 'token', token: 'secret-token' }],
      },
      {
        host: 'artifactory.example.com:8082',
        baseUrl: 'http://artifactory.example.com:8082/',
        title: 'Internal',
        auth: [
          { method: 'none' },
          { method: 'basic', username: 'user', password: 'pass' },
        ],
      },
    ]);

    expect(connections.getDefaultHost()).toBe('acme.jfrog.io');

    const token = await connections.find({
      query: { url: 'https://ACME.jfrog.io/some/path' },
      authMethods: ['token'],
    });
    expect(token).toEqual({
      type: 'jfrog-artifactory',
      title: 'JFrog Artifactory (acme.jfrog.io)',
      host: 'acme.jfrog.io',
      auth: { method: 'token', title: 'Access token', token: 'secret-token' },
    });
    expect(getConnectionBaseUrl(token)).toBe('https://acme.jfrog.io');
    expect(getConnectionAuthHeaders(token)).toEqual({
      Authorization: 'Bearer secret-token',
    });

    const basic = await connections.find({
      query: { url: 'https://artifactory.example.com:8082' },
      authMethods: ['token', 'basic'],
    });
    expect(basic.title).toBe('Internal');
    expect(basic.auth).toEqual({
      method: 'basic',
      title: 'Username and password',
      username: 'user',
      password: 'pass',
    });
    expect(getConnectionBaseUrl(basic)).toBe(
      'http://artifactory.example.com:8082',
    );
    expect(getConnectionAuthHeaders(basic)).toEqual({
      Authorization: `Basic ${Buffer.from('user:pass').toString('base64')}`,
    });

    const none = await connections.find({
      query: { url: 'https://artifactory.example.com:8082' },
      authMethods: ['none', 'basic'],
    });
    expect(none.auth.method).toBe('none');
    expect(getConnectionAuthHeaders(none)).toEqual({});

    await expect(
      connections.find({
        query: { url: 'https://unknown.jfrog.io' },
        authMethods: ['token'],
      }),
    ).rejects.toThrow(
      'No JFrog Artifactory connection configured for host "unknown.jfrog.io"',
    );
    await expect(
      connections.find({
        query: { url: 'https://acme.jfrog.io' },
        authMethods: ['basic'],
      }),
    ).rejects.toThrow('has no auth method of type "basic"');
  });

  it('returns no connections when none are configured', () => {
    const connections = JfrogArtifactoryConnections.fromConfig(
      new ConfigReader({}),
    );
    expect(connections.getDefaultHost()).toBeUndefined();
  });

  it('rejects invalid configuration', () => {
    expect(() =>
      fromConnections([{ host: 'acme.jfrog.io', auth: [] }]),
    ).toThrow('Must configure at least one auth method');
    expect(() =>
      fromConnections([{ host: 'acme.jfrog.io', auth: [{ method: 'oauth' }] }]),
    ).toThrow('Unknown auth method "oauth"');
    expect(() =>
      fromConnections([{ host: 'acme.jfrog.io', auth: [{ method: 'token' }] }]),
    ).toThrow('Invalid configuration for auth method "token"');
    expect(() =>
      fromConnections([
        { host: 'acme.jfrog.io', unknown: true, auth: [{ method: 'none' }] },
      ]),
    ).toThrow('Invalid configuration for connection type "jfrog-artifactory"');
    expect(() =>
      fromConnections([
        { type: 'github', host: 'acme.jfrog.io', auth: [{ method: 'none' }] },
      ]),
    ).toThrow('Unexpected connection type "github"');
    expect(() =>
      fromConnections([
        { host: 'acme.jfrog.io', auth: [{ method: 'none' }] },
        { host: 'ACME.jfrog.io', auth: [{ method: 'none' }] },
      ]),
    ).toThrow(
      'Duplicate JFrog Artifactory connection for host "ACME.jfrog.io"',
    );
  });
});
