/*
 * Copyright 2025 The Backstage Authors
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
import { Entity } from '@backstage/catalog-model';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';

import { CodecovApi } from '../../api/CodecovApi';
import { codecovApiRef } from '../../api';
import { EntityCodecovCard } from './EntityCodecovCard';

const entity = (annotations: Record<string, string>): Entity => ({
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: { name: 'my-service', namespace: 'default', annotations },
  spec: { type: 'service', owner: 'me' },
});

async function render(
  e: Entity,
  api: Partial<CodecovApi>,
): Promise<ReturnType<typeof renderInTestApp>> {
  return renderInTestApp(
    <TestApiProvider apis={[[codecovApiRef, api]]}>
      <EntityProvider entity={e}>
        <EntityCodecovCard />
      </EntityProvider>
    </TestApiProvider>,
  );
}

describe('EntityCodecovCard', () => {
  it('shows a missing annotation state without the annotation', async () => {
    const { findByText } = await render(entity({}), {
      getCoverage: jest.fn(),
    });

    expect(await findByText(/Missing Annotation/i)).toBeInTheDocument();
  });

  it('renders the coverage returned by the api', async () => {
    const getCoverage = jest.fn().mockResolvedValue({
      service: 'github',
      owner: 'backstage',
      repo: 'backstage',
      branch: 'master',
      webUrl: 'https://app.codecov.io/github/backstage/backstage',
      totals: {
        files: 100,
        lines: 1000,
        hits: 850,
        misses: 100,
        partials: 50,
        coverage: 85,
      },
    });

    const { findByText } = await render(
      entity({ 'codecov.io/repo': 'github/backstage/backstage' }),
      { getCoverage },
    );

    expect(await findByText('85%')).toBeInTheDocument();
    expect(await findByText('View on Codecov')).toBeInTheDocument();
    expect(getCoverage).toHaveBeenCalledWith('component:default/my-service');
  });

  it('renders an empty state when no coverage was uploaded', async () => {
    const getCoverage = jest.fn().mockResolvedValue({
      service: 'github',
      owner: 'backstage',
      repo: 'backstage',
      webUrl: 'https://app.codecov.io/github/backstage/backstage',
      totals: null,
    });

    const { findByText } = await render(
      entity({ 'codecov.io/repo': 'github/backstage/backstage' }),
      { getCoverage },
    );

    expect(
      await findByText(/No coverage has been uploaded/i),
    ).toBeInTheDocument();
  });
});
