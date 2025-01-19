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
import React, { FormEvent } from 'react';

import { Progress } from '@backstage/core-components';

import { extractSchemaFromStep } from '@backstage/plugin-scaffolder-react/alpha';

import Form from '@rjsf/material-ui';
import {
  RegistryWidgetsType,
  RJSFSchema,
  RJSFValidationError,
  TemplatesType,
} from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

import { ObjectFieldTemplate } from '../templates/ObjectFieldTemplate';
import { MarkdownWidget } from '../widgets/MarkdownWidget';

import userProfileFormSchema from './userProfileFormSchema.json';
import { IChangeEvent } from '@rjsf/core';

const templates: Partial<TemplatesType> = {
  ObjectFieldTemplate,
};

const widgets: RegistryWidgetsType = {
  markdown: MarkdownWidget,
};

export const UserProfileForm = () => {
  const [loading, setLoading] = React.useState(true);

  const { schema, uiSchema } = React.useMemo(
    () => extractSchemaFromStep(userProfileFormSchema),
    [],
  );

  // eslint-disable-next-line no-console
  console.log('DEBUG UserProfileForm schema', schema);
  // eslint-disable-next-line no-console
  console.log('DEBUG UserProfileForm uiSchema', uiSchema);

  React.useEffect(() => {
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  const onChange = (data: IChangeEvent<any, RJSFSchema, any>, id?: string) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm change!', data, id);
  };
  const onSubmit = (
    data: IChangeEvent<any, RJSFSchema, any>,
    event: FormEvent<any>,
  ) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm submit!', data, event);
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm form errors', data.errors);
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm form data', data.formData);
  };
  const onError = (errors: RJSFValidationError[]) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm error!', errors);
  };

  return (
    <>
      {loading ? <Progress /> : null}
      <Form
        disabled={loading}
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        templates={templates}
        widgets={widgets}
        onChange={onChange}
        onSubmit={onSubmit}
        onError={onError}
      />
    </>
  );
};
