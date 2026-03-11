// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { AdminUserListComponent } from './admin-user-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';

const mockUsers = [
  { id: 'u1', name: 'Alice', roleId: null },
  { id: 'u2', name: 'Bob', roleId: 'r1' },
];

const mockRoles = [
  { id: 'r1', name: 'Admin' },
  { id: 'r2', name: 'User' },
];

async function renderUserList(canEdit = true) {
  return renderComponent(AdminUserListComponent, {
    declarations: [AdminUserListComponent],
    providers: [
      {
        provide: RoleDataService,
        useValue: {
          roles$: of(mockRoles),
          getRoles: () => of(mockRoles),
        },
      },
      {
        provide: UserDataService,
        useValue: {
          update: vi.fn(),
        },
      },
    ],
    componentProperties: {
      users: mockUsers as any,
      isLoading: false,
      canEdit,
    },
  });
}

describe('AdminUserListComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderUserList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display user names in table', async () => {
    await renderUserList();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should show search input', async () => {
    await renderUserList();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('should show ID and Name column headers', async () => {
    await renderUserList();
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
  });

  it('should filter users when applyFilter called', async () => {
    const { fixture } = await renderUserList();
    const component = fixture.componentInstance;

    component.applyFilter('alice');
    expect(component.filterString).toBe('alice');
    expect(component.userDataSource.filter).toBe('alice');
  });

  it('should enable add user button when canEdit is true', async () => {
    const { container } = await renderUserList(true);
    const addButton = container.querySelector('button[title="Add User"]') as HTMLButtonElement;
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(false);
  });

  it('should disable add user button when canEdit is false', async () => {
    const { container } = await renderUserList(false);
    const addButton = container.querySelector('button[title="Add User"]') as HTMLButtonElement;
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(true);
  });

  it('should show delete button when canEdit is true', async () => {
    const { container } = await renderUserList(true);
    const deleteButtons = container.querySelectorAll('button[title="Delete User"]');
    expect(deleteButtons.length).toBeGreaterThan(0);
  });

  it('should hide delete button when canEdit is false', async () => {
    const { container } = await renderUserList(false);
    const deleteButtons = container.querySelectorAll('button[title="Delete User"]');
    expect(deleteButtons.length).toBe(0);
  });

  it('should display user IDs in table', async () => {
    await renderUserList();
    expect(screen.getByText('u1')).toBeInTheDocument();
    expect(screen.getByText('u2')).toBeInTheDocument();
  });
});
