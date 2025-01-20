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
import React from 'react';

import {
  InfoCardVariants,
  TableColumn,
  TableOptions,
} from '@backstage/core-components';

import {
  RELATION_MEMBER_OF,
  GroupEntity,
  Entity,
} from '@backstage/catalog-model';
import { RelatedEntitiesCard } from '@backstage/plugin-catalog';
import { EntityTable } from '@backstage/plugin-catalog-react';

const componentEntityColumns: TableColumn<GroupEntity>[] = [
  EntityTable.columns.createEntityRefColumn({ defaultKind: 'group' }),
  EntityTable.columns.createSpecTypeColumn(),
];

const asComponentEntities = (entities: Entity[]): GroupEntity[] =>
  entities as GroupEntity[];

export interface EntityMemberOfCardProps {
  variant?: InfoCardVariants;
  title?: string;
  columns?: TableColumn<GroupEntity>[];
  tableOptions?: TableOptions;
}

export const EntityMemberOfCard = (props: EntityMemberOfCardProps) => {
  const {
    variant = 'gridItem',
    title = 'Member of',
    columns = componentEntityColumns,
    tableOptions = {},
  } = props;
  return (
    <RelatedEntitiesCard
      variant={variant}
      title={title}
      entityKind="Group"
      relationType={RELATION_MEMBER_OF}
      columns={columns}
      asRenderableEntities={asComponentEntities}
      emptyMessage="User is not member of any group"
      emptyHelpLink="https://backstage.io/docs/features/software-catalog/descriptor-format/#specmemberof-required"
      tableOptions={tableOptions}
    />
  );
};
