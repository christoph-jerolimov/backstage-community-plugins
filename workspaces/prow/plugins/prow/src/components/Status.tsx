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
import {
  StatusPending,
  StatusRunning,
  StatusOK,
  StatusError,
  StatusAborted,
} from '@backstage/core-components';

import {
  ProwBuild,
  ProwBuildState,
} from '@backstage-community/plugin-prow-common';

export const Status = ({ build }: { build: ProwBuild }) => {
  switch (build.state) {
    case ProwBuildState.PENDING:
      return <StatusPending>{build.state}</StatusPending>;
    case ProwBuildState.RUNNING:
      return <StatusRunning>{build.state}</StatusRunning>;
    case ProwBuildState.SUCCEEDED:
      return <StatusOK>{build.state}</StatusOK>;
    case ProwBuildState.FAILED:
      return <StatusError>{build.state}</StatusError>;
    case ProwBuildState.ABORTED:
      return <StatusAborted>{build.state}</StatusAborted>;
    case ProwBuildState.ERROR:
      return <StatusError>{build.state}</StatusError>;
    default:
      return build.state;
  }
};
