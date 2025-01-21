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

import { Page, Header, Content } from '@backstage/core-components';
import { identityApiRef, useApi } from '@backstage/core-plugin-api';

import Button from '@material-ui/core/Button';

import useAsync from 'react-use/esm/useAsync';

import { UserProfileForm } from './UserProfileForm';

export const UserProfilePage = () => {
  const identityApi = useApi(identityApiRef);
  const { value: identity } = useAsync(() =>
    identityApi.getBackstageIdentity(),
  );

  // TODO: remove rerender button
  const [_, setState] = React.useState(0);
  const rerender = () => setState(x => x + 1);

  // TOOD: show loading indicator and error!
  return (
    <Page themeId="user-profile">
      <Header title="User profile" />
      <Content>
        <Button onClick={rerender}>Rerender</Button>
        {identity ? (
          <UserProfileForm entityRef={identity.userEntityRef} />
        ) : null}
      </Content>
    </Page>
  );
};
