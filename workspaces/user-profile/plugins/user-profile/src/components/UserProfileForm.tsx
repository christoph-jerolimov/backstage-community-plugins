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

import { Progress } from '@backstage/core-components';

import Form from '@rjsf/material-ui';
import { RegistryWidgetsType, RJSFSchema, UiSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { MarkdownWidget } from './MarkdownWidget';

const schema: RJSFSchema = {
  type: 'object',
  title: 'User profile',
  properties: {
    title: {
      type: 'string',
      title: 'Display name',
    },
    description: {
      type: 'string',
      title: 'Bio',
    },
    timezone: {
      type: 'string',
      title: 'Timezone',
    },
    workinghours: {
      type: 'string',
      title: 'Working hours',
    },
    tags: {
      type: 'array',
      title: 'Tags',
      items: {
        type: 'string',
        title: '',
      },
    },
    links: {
      type: 'array',
      title: 'Links',
      items: {
        type: 'object',
        title: '',
        properties: {
          url: {
            type: 'string',
          },
          title: {
            type: 'string',
          },
          icon: {
            type: 'string',
          },
          s: {
            type: 'string',
          },
        },
      },
    },
  },
};

const uiSchema: UiSchema = {
  description: {
    'ui:widget': 'markdown',
  },
};

const widgets: RegistryWidgetsType = {
  markdown: MarkdownWidget,
};

export const UserProfileForm = () => {
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const onChange = () => {
    // eslint-disable-next-line no-console
    console.log('change!');
  };
  const onSubmit = () => {
    // eslint-disable-next-line no-console
    console.log('submit!');
  };
  const onError = () => {
    // eslint-disable-next-line no-console
    console.log('error!');
  };

  return (
    <>
      {loading ? <Progress /> : null}
      <Form
        disabled={loading}
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        widgets={widgets}
        onChange={onChange}
        onSubmit={onSubmit}
        onError={onError}
      />
    </>
  );
};
