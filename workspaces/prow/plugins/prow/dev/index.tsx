/*
 * Copyright 2024 The Backstage Authors
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
import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { Page, Header, TabbedLayout } from '@backstage/core-components';
import { EntityProvider } from '@backstage/plugin-catalog-react';

import { prowPlugin, EntityProwContent } from '../src/plugin';
import { ProwAnnotation } from '@backstage-community/plugin-prow-common';

const mockEntity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
    name: 'kubernetes',
    annotations: {
      [ProwAnnotation.REPOSITORY_NAME]: 'kubernetes',
    },
  },
  spec: {
    type: 'website',
    lifecycle: 'production',
    owner: 'guests',
  },
};

createDevApp()
  .registerPlugin(prowPlugin)
  .addPage({
    element: (
      <EntityProvider entity={mockEntity}>
        <Page themeId={mockEntity.kind.toLocaleLowerCase('en-US')}>
          <Header
            type={`${mockEntity.kind.toLocaleLowerCase('en-US')} — ${
              mockEntity.spec.type
            }`}
            title={mockEntity.metadata.name}
          />
          <TabbedLayout>
            <TabbedLayout.Route path="/" title="CI/CD">
              <EntityProwContent />
            </TabbedLayout.Route>
          </TabbedLayout>
        </Page>
      </EntityProvider>
    ),
    title: 'CI/CD content',
    path: '/',
  })
  .render();
