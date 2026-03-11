// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { AdminGroupsMemberListComponent } from './admin-groups-member-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';

const mockMemberships = [
  { id: 'm1', userId: 'u1', groupId: 'g1' },
  { id: 'm2', userId: 'u2', groupId: 'g1' },
];
const mockUsers = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
];

async function renderMemberList(canEdit = true) {
  return renderComponent(AdminGroupsMemberListComponent, {
    declarations: [AdminGroupsMemberListComponent],
    componentProperties: {
      memberships: mockMemberships as any,
      users: mockUsers as any,
      canEdit,
    },
  });
}

describe('AdminGroupsMemberListComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderMemberList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display "Group Members" title', async () => {
    await renderMemberList();
    expect(screen.getByText('Group Members')).toBeInTheDocument();
  });

  it('should display member names', async () => {
    await renderMemberList();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show actions column when canEdit is true', async () => {
    const { fixture } = await renderMemberList(true);
    expect(fixture.componentInstance.displayedColumns).toContain('actions');
  });

  it('should hide actions column when canEdit is false', async () => {
    const { fixture } = await renderMemberList(false);
    expect(fixture.componentInstance.displayedColumns).not.toContain('actions');
  });
});
