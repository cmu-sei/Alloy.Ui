// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AdminUsersComponent } from './admin-users.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/alloy.api';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserQuery } from 'src/app/data/user/user.query';

const mockUsers = [
  { id: 'u1', name: 'Alice' },
  { id: 'u2', name: 'Bob' },
];

async function renderUsers(canManage = true) {
  return renderComponent(AdminUsersComponent, {
    declarations: [AdminUsersComponent],
    providers: [
      {
        provide: PermissionDataService,
        useValue: {
          load: () => of([]),
          permissions: canManage ? [SystemPermission.ManageUsers] : [],
          hasPermission: (p: SystemPermission) =>
            canManage && p === SystemPermission.ManageUsers,
          canViewAdministration: () => false,
        },
      },
      {
        provide: UserDataService,
        useValue: {
          load: () => of(mockUsers),
          create: vi.fn(() => of({})),
          delete: vi.fn(() => of({})),
        },
      },
      {
        provide: UserQuery,
        useValue: {
          selectAll: () => of(mockUsers),
          selectLoading: () => of(false),
        },
      },
    ],
  });
}

describe('AdminUsersComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderUsers();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set canEdit based on ManageUsers permission', async () => {
    const { fixture } = await renderUsers(true);
    expect(fixture.componentInstance.canEdit).toBe(true);
  });

  it('should set canEdit to false without ManageUsers permission', async () => {
    const { fixture } = await renderUsers(false);
    expect(fixture.componentInstance.canEdit).toBe(false);
  });

  it('should render user list child component', async () => {
    const { container } = await renderUsers();
    expect(container.querySelector('app-admin-user-list')).toBeTruthy();
  });

  it('should have users$ observable', async () => {
    const { fixture } = await renderUsers();
    expect(fixture.componentInstance.users$).toBeTruthy();
  });
});
