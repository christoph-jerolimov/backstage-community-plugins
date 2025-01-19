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

import { ErrorPanel, Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';

import { extractSchemaFromStep } from '@backstage/plugin-scaffolder-react/alpha';

import Box from '@material-ui/core/Box';

import { IChangeEvent } from '@rjsf/core';
import Form from '@rjsf/material-ui';
import {
  RegistryWidgetsType,
  RJSFSchema,
  RJSFValidationError,
  TemplatesType,
} from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';

import { userProfileBackendApiRef } from '../api';
import { ObjectFieldTemplate } from '../templates/ObjectFieldTemplate';
import { MarkdownWidget } from '../widgets/MarkdownWidget';

import userProfileFormSchema from './userProfileFormSchema.json';

const templates: Partial<TemplatesType> = {
  ObjectFieldTemplate,
};

const widgets: RegistryWidgetsType = {
  markdown: MarkdownWidget,
};

interface State {
  loading: boolean;
  data?: any;
  error?: Error;
}

export const UserProfileForm = () => {
  const api = useApi(userProfileBackendApiRef);
  const [state, setState] = React.useState<State>({ loading: true });

  const { schema, uiSchema } = React.useMemo(
    () => extractSchemaFromStep(userProfileFormSchema),
    [],
  );

  React.useEffect(() => {
    api.getUserProfile().then(
      (data: any) => {
        setState({ loading: false, data });
      },
      (error: Error) => {
        setState({ loading: false, error });
      },
    );
  }, [api]);

  // eslint-disable-next-line no-console
  console.log('DEBUG UserProfileForm schema', schema);
  // eslint-disable-next-line no-console
  console.log('DEBUG UserProfileForm uiSchema', uiSchema);

  const onChange = (data: IChangeEvent<any, RJSFSchema, any>, id?: string) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm change!', data, id);
  };

  const onSubmit = (
    data: IChangeEvent<any, RJSFSchema, any>,
    event: FormEvent<any>,
  ) => {
    setState({ loading: true });
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm submit!', data, event);
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm form errors', data.errors);
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm form data', data.formData);
    api.updateUserProfile(data.formData).then(
      (updatedData: any) => {
        setState({ loading: false, data: updatedData });
      },
      (error: Error) => {
        setState({ loading: false, error });
      },
    );
  };

  const onError = (errors: RJSFValidationError[]) => {
    // eslint-disable-next-line no-console
    console.log('DEBUG UserProfileForm error!', errors);
  };

  return (
    <>
      {state.loading ? <Progress /> : null}
      {state.error ? (
        <div style={{ width: '100%', paddingBottom: 16 }}>
          <ErrorPanel error={state.error} />
        </div>
      ) : null}
      <Form
        disabled={state.loading || !!state.error}
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
