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
import {
  ApiBlueprint,
  createFrontendPlugin,
  discoveryApiRef,
  fetchApiRef,
} from '@backstage/frontend-plugin-api';
import { EntityCardBlueprint } from '@backstage/plugin-catalog-react/alpha';

import { CodecovClient, codecovApiRef } from './api';
import { isCodecovAvailable } from './annotations';

/**
 * API that talks to the `codecov` backend plugin.
 *
 * @alpha
 */
export const codecovApi = ApiBlueprint.make({
  name: 'codecovApi',
  params: defineParams =>
    defineParams({
      api: codecovApiRef,
      deps: {
        discoveryApi: discoveryApiRef,
        fetchApi: fetchApiRef,
      },
      factory: ({ discoveryApi, fetchApi }) =>
        new CodecovClient({ discoveryApi, fetchApi }),
    }),
});

/**
 * Catalog (entity page) card that shows common code coverage information from
 * Codecov, such as the overall line coverage and line/file statistics.
 *
 * @alpha
 */
export const entityCodecovCard = EntityCardBlueprint.make({
  name: 'EntityCodecovCard',
  params: {
    filter: isCodecovAvailable,
    loader: () =>
      import('./components/EntityCodecovCard').then(m => (
        <m.EntityCodecovCard />
      )),
  },
});

/**
 * The Codecov frontend plugin.
 *
 * @public
 */
export const codecovPlugin = createFrontendPlugin({
  pluginId: 'codecov',
  extensions: [codecovApi, entityCodecovCard],
});
