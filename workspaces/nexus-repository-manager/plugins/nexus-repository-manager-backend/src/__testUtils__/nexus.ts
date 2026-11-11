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
import type { Entity } from '@backstage/catalog-model';
import { rest, type RestRequest } from 'msw';

export const NEXUS_URL = 'https://nexus.example.com';
export const OTHER_NEXUS_URL = 'https://other-nexus.example.com:8443';

export const testConfig = {
  nexusRepositoryManager: {
    connections: [
      {
        title: 'Main Nexus',
        host: 'nexus.example.com',
        auth: [{ method: 'token', token: 'secret-token' }],
      },
      {
        host: 'other-nexus.example.com:8443',
        auth: [{ method: 'basic', username: 'user', password: 'pass' }],
      },
    ],
  },
};

export const testEntities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'docker-image',
      annotations: {
        'nexus-repository-manager/docker.image-name': 'org/app',
      },
    },
    spec: { type: 'service', owner: 'me' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'maven-artifact',
      annotations: {
        'nexus-repository-manager/config.title': 'My library',
        'nexus-repository-manager/host': 'other-nexus.example.com:8443',
        'nexus-repository-manager/docker.image-tag': 'latest',
      },
    },
    spec: { type: 'library', owner: 'me' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'no-annotations' },
    spec: { type: 'service', owner: 'me' },
  },
];

export const dockerManifest = {
  schemaVersion: 2,
  mediaType: 'application/vnd.docker.distribution.manifest.v2+json',
  config: { mediaType: 'config', size: 10, digest: 'sha256:abc' },
  layers: [{ mediaType: 'layer', size: 100, digest: 'sha256:def' }],
};

export type RecordedRequest = {
  method: string;
  url: string;
  authorization: string | null;
};

/** Records the requests that reach the mocked Nexus instances. */
export function createNexusHandlers(requests: RecordedRequest[] = []) {
  const record = (req: RestRequest) =>
    requests.push({
      method: req.method,
      url: req.url.toString(),
      authorization: req.headers.get('authorization'),
    });

  return [
    rest.get(`${NEXUS_URL}/service/rest/v1/search`, (req, res, ctx) => {
      record(req);
      if (!req.url.searchParams.get('continuationToken')) {
        return res(
          ctx.json({
            items: [
              {
                id: 'docker-1',
                repository: 'docker-hosted',
                format: 'docker',
                name: 'org/app',
                version: '1.0.0',
                assets: [
                  {
                    path: '/v2/org/app/manifests/1.0.0',
                    repository: 'docker-hosted',
                    format: 'docker',
                  },
                  {
                    path: 'v2/org/app/manifests/broken',
                    repository: 'docker-hosted',
                    format: 'docker',
                  },
                ],
              },
            ],
            continuationToken: 'page-2',
          }),
        );
      }
      return res(
        ctx.json({
          items: [
            {
              id: 'maven-1',
              repository: 'maven-releases',
              format: 'maven2',
              group: 'com.example',
              name: 'lib',
              version: '2.0.0',
              assets: [
                {
                  path: 'com/example/lib/2.0.0/lib-2.0.0.jar',
                  repository: 'maven-releases',
                  format: 'maven2',
                  fileSize: 0,
                  maven2: { extension: 'jar' },
                },
                {
                  path: 'com/example/lib/2.0.0/lib-2.0.0.pom',
                  repository: 'maven-releases',
                  format: 'maven2',
                  fileSize: 0,
                  maven2: { extension: 'pom' },
                },
              ],
            },
            {
              id: 'checksums-only',
              format: 'maven2',
              assets: [{ format: 'maven2', maven2: { extension: 'jar.sha1' } }],
            },
          ],
          continuationToken: null,
        }),
      );
    }),
    rest.get(
      `${NEXUS_URL}/repository/docker-hosted/v2/org/app/manifests/1.0.0`,
      (req, res, ctx) => {
        record(req);
        return res(ctx.json(dockerManifest));
      },
    ),
    rest.get(
      `${NEXUS_URL}/repository/docker-hosted/v2/org/app/manifests/broken`,
      (req, res, ctx) => {
        record(req);
        return res(ctx.status(500));
      },
    ),
    rest.head(
      `${NEXUS_URL}/repository/maven-releases/com/example/lib/2.0.0/lib-2.0.0.jar`,
      (req, res, ctx) => {
        record(req);
        return res(ctx.set('Content-Length', '1234'));
      },
    ),
    rest.get(`${OTHER_NEXUS_URL}/service/rest/v1/search`, (req, res, ctx) => {
      record(req);
      return res(ctx.json({ items: [], continuationToken: null }));
    }),
  ];
}
