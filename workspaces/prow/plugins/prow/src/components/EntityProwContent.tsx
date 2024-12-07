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
import { Table, TableColumn } from '@backstage/core-components';

import {
  ProwBuild,
  ProwBuildState,
} from '@backstage-community/plugin-prow-common';

import { Status } from './Status';

const createBuildState = (i: number) => {
  if (i < 2) return ProwBuildState.PENDING;
  if (i === 5) return ProwBuildState.FAILED;
  return ProwBuildState.SUCCEEDED;
};

const builds: ProwBuild[] = Array.from({ length: 10 }, (_, i) => ({
  id: (i + 3143241324).toString(),
  state: createBuildState(i),
  repository: 'mock data',
  job: 'mock data',
  scheduled: '2024-....',
  duration: '12 minutes',
}));

const columns: TableColumn<ProwBuild>[] = [
  { title: 'ID', field: 'id' },
  { title: 'State', field: 'state', render: build => <Status build={build} /> },
  { title: 'Repository', field: 'repository' },
  { title: 'Job', field: 'job' },
  { title: 'State', field: 'state' },
  { title: 'Scheduled', field: 'scheduled' },
  { title: 'Duration', field: 'duration' },
];

export const EntityProwContent = () => {
  return (
    <Table
      title="Prow builds"
      options={{ search: false, paging: false }}
      columns={columns}
      data={builds}
    />
  );
};
