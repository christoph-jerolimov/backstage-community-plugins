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
import {
  AuthService,
  BackstageCredentials,
  BackstageUserPrincipal,
  LoggerService,
  RootConfigService,
} from '@backstage/backend-plugin-api';
import { NotFoundError } from '@backstage/errors';
import { catalogServiceRef } from '@backstage/plugin-catalog-node/alpha';

import {
  ProwAnnotation,
  ProwBuild,
  ProwBuildState,
} from '@backstage-community/plugin-prow-common';

import { ProwService } from './ProwService';

export type Options = {
  logger: LoggerService;
  auth: AuthService;
  config: RootConfigService;
  catalog: typeof catalogServiceRef.T;
};

export class ProwServiceMock implements ProwService {
  private readonly logger: LoggerService;
  private readonly auth: AuthService;
  private readonly catalog: typeof catalogServiceRef.T;

  constructor(options: Options) {
    this.logger = options.logger;
    this.auth = options.auth;
    this.catalog = options.catalog;
  }

  async getBuilds(
    entityRef: string,
    options: { credentials: BackstageCredentials<BackstageUserPrincipal> },
  ): Promise<ProwBuild[]> {
    const { token } = await this.auth.getPluginRequestToken({
      onBehalfOf: options.credentials,
      targetPluginId: 'catalog',
    });

    const entity = await this.catalog.getEntityByRef(entityRef, {
      token,
    });
    if (!entity) {
      throw new NotFoundError(`No entity found for ref '${entityRef}'`);
    }

    this.logger.info('Get builds:', {
      entityRef,
    });

    const createBuildState = (i: number) => {
      if (i < 2) return ProwBuildState.PENDING;
      if (i === 5) return ProwBuildState.FAILED;
      return ProwBuildState.SUCCEEDED;
    };

    const builds: ProwBuild[] = Array.from({ length: 10 }, (_, i) => ({
      id: (i + 3143241324).toString(),
      state: createBuildState(i),
      repository:
        entity.metadata.annotations?.[ProwAnnotation.REPOSITORY_NAME] ?? '-',
      job: entity.metadata.annotations?.[ProwAnnotation.JOB_NAME] ?? '-',
      scheduled: '2024-....',
      duration: '12 minutes',
    }));

    return builds;
  }
}
