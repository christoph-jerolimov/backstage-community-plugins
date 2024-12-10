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
import { ErrorPanel, Table, TableColumn } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { stringifyEntityRef } from '@backstage/catalog-model';

import { ProwBuild } from '@backstage-community/plugin-prow-common';

import Box from '@material-ui/core/Box';

import {
  useQuery,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query';

import { ProwBackendApiRef } from '../api';
import { Status } from './Status';

const columns: TableColumn<ProwBuild>[] = [
  { title: 'ID', field: 'id' },
  { title: 'State', field: 'state', render: build => <Status build={build} /> },
  { title: 'Repository', field: 'repository' },
  { title: 'Job', field: 'job' },
  { title: 'Scheduled', field: 'scheduled' },
  { title: 'Duration', field: 'duration' },
];

const Content = () => {
  const backendApi = useApi(ProwBackendApiRef);
  const { entity } = useEntity();
  const entityRef = stringifyEntityRef(entity);
  const query = useQuery({
    queryKey: ['builds'],
    queryFn: () => backendApi.getBuilds(entityRef),
  });

  const emptyContent = query.error ? (
    <Box padding={1}>
      <ErrorPanel error={query.error} />
    </Box>
  ) : null;

  return (
    <Table
      title="Prow builds"
      options={{ search: false, paging: false }}
      columns={columns}
      isLoading={query.isLoading}
      data={query.data ?? []}
      emptyContent={emptyContent}
    />
  );
};

const queryClient = new QueryClient();

export const EntityProwContent = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <Content />
    </QueryClientProvider>
  );
};
