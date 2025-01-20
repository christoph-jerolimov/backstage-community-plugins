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

import { MarkdownContent } from '@backstage/core-components';

import Divider from '@material-ui/core/Divider';
import FormLabel from '@material-ui/core/FormLabel';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';

import { WidgetProps } from '@rjsf/utils';

export const MarkdownWidget = (props: WidgetProps) => {
  const [tab, setTab] = React.useState<'edit' | 'preview'>('edit');

  const { TextareaWidget } = props.registry.widgets;

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {props.label ? (
        <FormLabel style={{ paddingBottom: '4px' }}>{props.label}</FormLabel>
      ) : null}

      <Tabs
        indicatorColor="secondary"
        value={tab}
        onChange={(_event, value) => setTab(value)}
      >
        <Tab value="edit" label="Edit" disabled={props.disabled} />
        <Tab value="preview" label="Preview" disabled={props.disabled} />
      </Tabs>

      <Divider />

      {tab === 'edit' ? (
        <TextareaWidget
          {...props}
          hideLabel
          options={{ rows: 0 }}
          minRows={5}
        />
      ) : null}

      {tab === 'preview' ? (
        <MarkdownContent dialect="gfm" content={props.value} />
      ) : null}
    </div>
  );
};
