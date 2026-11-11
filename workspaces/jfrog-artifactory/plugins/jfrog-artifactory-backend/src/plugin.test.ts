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
import {
  mockServices,
  registerMswTestHooks,
  startTestBackend,
} from '@backstage/backend-test-utils';
import { actionsRegistryServiceMock } from '@backstage/backend-test-utils/alpha';
import { createServiceFactory } from '@backstage/backend-plugin-api';
import { actionsRegistryServiceRef } from '@backstage/backend-plugin-api/alpha';
import { Entity } from '@backstage/catalog-model';
import { catalogServiceMock } from '@backstage/plugin-catalog-node/testUtils';
import { http, HttpResponse, passthrough } from 'msw';
import { setupServer } from 'msw/node';
import request from 'supertest';
import { jfrogArtifactoryPlugin } from './plugin';
import { JfrogArtifactoryTagsResponse } from './types';

const node = {
  name: '1.0.0',
  created: '2026-01-01T10:00:00.000Z',
  modified: '2026-01-02T10:00:00.000Z',
  package: { id: 'docker://my-image' },
  repos: [
    {
      name: 'docker-prod-federated',
      type: 'local',
      leadFilePath: 'my-image/1.0.0/manifest.json',
    },
  ],
  licenses: [],
  size: '1024',
  stats: { downloadCount: 7 },
  vulnerabilities: {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 0,
    unknown: 0,
    skipped: 0,
  },
  files: [
    {
      name: 'manifest.json',
      lead: true,
      size: '512',
      md5: 'md5',
      sha1: 'sha1',
      sha256: 'sha256',
      mimeType: 'application/json',
    },
  ],
};

const tagsResponse: JfrogArtifactoryTagsResponse = {
  data: {
    versions: {
      edges: [{ node }],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
  },
};

const entities: Entity[] = [
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'with-image',
      annotations: {
        'jfrog-artifactory/image-name': 'my-image',
        'jfrog-artifactory/repo-filter': '*-prod-federated',
      },
    },
    spec: { type: 'service', owner: 'me' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'other-host',
      annotations: {
        'jfrog-artifactory/image-name': 'other-image',
        'jfrog-artifactory/host': 'artifactory.example.com',
      },
    },
    spec: { type: 'service', owner: 'me' },
  },
  {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: { name: 'without-image' },
    spec: { type: 'service', owner: 'me' },
  },
];

const config = {
  jfrogArtifactory: {
    sortField: 'MODIFIED',
    pageLimit: 50,
    connections: [
      {
        host: 'acme.jfrog.io',
        auth: [{ method: 'token', token: 'acme-token' }],
      },
      {
        host: 'artifactory.example.com',
        auth: [{ method: 'basic', username: 'user', password: 'pass' }],
      },
    ],
  },
};

describe('jfrogArtifactoryPlugin', () => {
  const server = setupServer();
  registerMswTestHooks(server);

  const requests: { url: string; authorization: string | null; body: any }[] =
    [];

  beforeEach(() => {
    requests.length = 0;
    server.use(
      http.post(
        'https://:host/metadata/api/v1/query',
        async ({ request: req }) => {
          requests.push({
            url: req.url,
            authorization: req.headers.get('authorization'),
            body: await req.json(),
          });
          return HttpResponse.json(tagsResponse);
        },
      ),
      http.all(/^http:\/\/(localhost|127\.0\.0\.1)[:/]/, () => passthrough()),
    );
  });

  async function startBackend() {
    const actionsRegistry = actionsRegistryServiceMock();
    const { server: app } = await startTestBackend({
      features: [
        jfrogArtifactoryPlugin,
        mockServices.rootConfig.factory({ data: config }),
        catalogServiceMock.factory({ entities }),
        createServiceFactory({
          service: actionsRegistryServiceRef,
          deps: {},
          factory: () => actionsRegistry,
        }),
      ],
    });
    return { app, actionsRegistry };
  }

  it('returns the image tags of an entity', async () => {
    const { app } = await startBackend();

    const res = await request(app)
      .get('/api/jfrog-artifactory/tags')
      .query({ entityRef: 'component:default/with-image' });
    expect(res.status).toBe(200);
    expect(res.body).toEqual(tagsResponse);

    expect(requests).toHaveLength(1);
    expect(requests[0].url).toBe('https://acme.jfrog.io/metadata/api/v1/query');
    expect(requests[0].authorization).toBe('Bearer acme-token');
    expect(requests[0].body.variables).toEqual({
      filter: {
        packageId: 'docker://my-image',
        name: '*',
        ignorePreRelease: false,
        repositoriesIn: { name: '*-prod-federated' },
      },
      first: 50,
      orderBy: { field: 'MODIFIED', direction: 'DESC' },
    });

    const other = await request(app)
      .get('/api/jfrog-artifactory/tags')
      .query({ entityRef: 'component:default/other-host' });
    expect(other.status).toBe(200);
    expect(requests[1].url).toBe(
      'https://artifactory.example.com/metadata/api/v1/query',
    );
    expect(requests[1].authorization).toBe(
      `Basic ${Buffer.from('user:pass').toString('base64')}`,
    );
    expect(requests[1].body.variables.filter.repositoriesIn).toBeUndefined();
  });

  it('rejects invalid requests', async () => {
    const { app } = await startBackend();

    const missingRef = await request(app).get('/api/jfrog-artifactory/tags');
    expect(missingRef.status).toBe(400);

    const notFound = await request(app)
      .get('/api/jfrog-artifactory/tags')
      .query({ entityRef: 'component:default/does-not-exist' });
    expect(notFound.status).toBe(404);

    const noAnnotation = await request(app)
      .get('/api/jfrog-artifactory/tags')
      .query({ entityRef: 'component:default/without-image' });
    expect(noAnnotation.status).toBe(400);
    expect(noAnnotation.body.error.message).toContain(
      'jfrog-artifactory/image-name',
    );

    expect(requests).toHaveLength(0);
  });

  it('provides the image tags through the actions registry', async () => {
    const { actionsRegistry } = await startBackend();

    const { actions } = await actionsRegistry.list();
    expect(actions.map(a => a.name)).toEqual(['get-image-tags']);

    const result = await actionsRegistry.invoke({
      id: 'test:get-image-tags',
      input: { entityRef: 'component:default/with-image' },
    });
    expect(result.output).toEqual({
      entityRef: 'component:default/with-image',
      imageName: 'my-image',
      host: 'acme.jfrog.io',
      repoFilter: '*-prod-federated',
      hasMore: false,
      tags: [
        {
          name: '1.0.0',
          created: node.created,
          modified: node.modified,
          packageId: 'docker://my-image',
          size: '1024',
          downloadCount: 7,
          repositories: node.repos,
          licenses: [],
          vulnerabilities: node.vulnerabilities,
          files: node.files,
        },
      ],
    });

    await expect(
      actionsRegistry.invoke({
        id: 'test:get-image-tags',
        input: { entityRef: 'component:default/without-image' },
      }),
    ).rejects.toThrow('jfrog-artifactory/image-name');
  });
});
