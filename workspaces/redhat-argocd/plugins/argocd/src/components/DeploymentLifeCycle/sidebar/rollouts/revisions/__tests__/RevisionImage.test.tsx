import React from 'react';

import { render, screen } from '@testing-library/react';

import { mockArgoResources } from '../../../../../../../dev/__data__/argoRolloutsObjects';
import { ReplicaSet } from '../../../../../../types/resources';
import RevisionImage from '../RevisionImage';

describe('RevisionImage', () => {
  it('renders the image name when it is present in the revision', () => {
    const mockRevision: ReplicaSet = mockArgoResources.replicasets[0];

    render(<RevisionImage revision={mockRevision} />);

    expect(
      screen.getByText('Traffic to image argoproj/rollouts-demo:yellow'),
    ).toBeInTheDocument();
  });

  it('renders nothing when the image is not present in the revision', () => {
    const mockRevision: ReplicaSet = mockArgoResources.replicasets[0];

    const mockRevisionWithoutImage: ReplicaSet = {
      ...mockRevision,
      spec: {
        ...mockRevision.spec,
        template: {
          spec: {
            containers: [],
          },
        },
      } as any,
    };

    const { container } = render(
      <RevisionImage revision={mockRevisionWithoutImage} />,
    );

    expect(container.firstChild).toBeNull();
  });
});