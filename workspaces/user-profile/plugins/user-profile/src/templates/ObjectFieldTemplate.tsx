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

import { InfoCard } from '@backstage/core-components';

import Grid from '@material-ui/core/Grid';

import { Templates } from '@rjsf/material-ui';
import { ObjectFieldTemplateProps } from '@rjsf/utils';

const FallbackObjectFieldTemplate = Templates.ObjectFieldTemplate!;

export const ObjectFieldTemplate = (props: ObjectFieldTemplateProps) => {
  // eslint-disable-next-line no-console
  console.log('DEBUG ObjectFieldTemplate props', props);

  if (props.uiSchema?.['ui:template'] === 'infocard') {
    return (
      <InfoCard title={props.title} subheader={props.description}>
        <Grid container spacing={2}>
          {props.properties
            .filter(element => !element.hidden)
            .map((element, index) => (
              <Grid
                key={index}
                item
                {...element.content.props.uiSchema?.['ui:griditem']}
              >
                {element.content}
              </Grid>
            ))}
        </Grid>
      </InfoCard>
    );
  }

  if (props.uiSchema?.['ui:template'] === 'grid') {
    return (
      <Grid container spacing={2}>
        {props.properties
          .filter(element => !element.hidden)
          .map((element, index) => (
            <Grid
              key={index}
              item
              {...element.content.props.uiSchema?.['ui:griditem']}
            >
              {element.content}
            </Grid>
          ))}
      </Grid>
    );
  }

  return <FallbackObjectFieldTemplate {...props} />;
};
