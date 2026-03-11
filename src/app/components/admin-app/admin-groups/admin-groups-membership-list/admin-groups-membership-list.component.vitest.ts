// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { AdminGroupsMembershipListComponent } from './admin-groups-membership-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';

const mockUsers = [
  { id: 'u3', name: 'Charlie' },
  { id: 'u4', name: 'Diana' },
];

async function renderMembershipList(canEdit = true) {
  return renderComponent(AdminGroupsMembershipListComponent, {
    declarations: [AdminGroupsMembershipListComponent],
    componentProperties: {
      users: mockUsers as any,
      canEdit,
    },
  });
}

describe('AdminGroupsMembershipListComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderMembershipList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display "Users" title', async () => {
    await renderMembershipList();
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should display user names', async () => {
    await renderMembershipList();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
    expect(screen.getByText('Diana')).toBeInTheDocument();
  });

  it('should show actions column when canEdit is true', async () => {
    const { fixture } = await renderMembershipList(true);
    expect(fixture.componentInstance.displayedColumns).toContain('actions');
  });

  it('should hide actions column when canEdit is false', async () => {
    const { fixture } = await renderMembershipList(false);
    expect(fixture.componentInstance.displayedColumns).not.toContain('actions');
  });
});
