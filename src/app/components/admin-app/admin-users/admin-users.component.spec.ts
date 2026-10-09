// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { User, UserService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminUsersComponent } from './admin-users.component';

@Component({ selector: 'app-admin-user-list', template: '', standalone: false })
class UserListStubComponent {
  @Input() users: User[];
  @Input() isLoading: boolean;
  @Input() canEdit: boolean;
  @Output() create = new EventEmitter<User>();
  @Output() delete = new EventEmitter<string>();
}

async function renderUsers(grants: PermissionGrants) {
  const userService = {
    getUsers: vi.fn(() =>
      of<User[]>([
        { id: 'u2', name: 'Blair Roe' },
        { id: 'u1', name: 'Alex Doe' },
      ]),
    ),
    createUser: vi.fn((u: User) => of<User>({ ...u })),
    deleteUser: vi.fn(() => of({})),
  } satisfies ApiStub<UserService>;
  const rendered = await renderComponent(AdminUsersComponent, {
    declarations: [AdminUsersComponent, UserListStubComponent],
    providers: [
      { provide: UserService, useValue: userService },
      ...permissionDataProviders(grants),
    ],
  });
  const list = () =>
    rendered.fixture.debugElement.query(By.directive(UserListStubComponent))
      .componentInstance as UserListStubComponent;
  return { ...rendered, userService, list };
}

describe('AdminUsersComponent', () => {
  /**
   * Verifies: the users load into the real store and reach the list sorted by name, with loading cleared.
   * Interacts with: UserService.getUsers, real UserDataService/UserStore/UserQuery, the user-list stub's inputs.
   * Data: two users; system ViewUsers.
   */
  it('passes the loaded users to the list', async () => {
    const { list, userService } = await renderUsers({ system: ['ViewUsers'] });

    expect(userService.getUsers).toHaveBeenCalled();
    expect(list().users.map((u) => u.name)).toEqual(['Alex Doe', 'Blair Roe']);
    expect(list().isLoading).toBe(false);
  });

  /**
   * Verifies: system ManageUsers gives the list canEdit true.
   * Interacts with: real PermissionDataService.hasPermission(ManageUsers), the user-list stub's canEdit input.
   * Data: exactly system ManageUsers.
   */
  it('lets the list edit users with ManageUsers', async () => {
    const { list } = await renderUsers({ system: ['ManageUsers'] });

    expect(list().canEdit).toBe(true);
  });

  /**
   * Verifies: without system ManageUsers the list gets canEdit false.
   * Interacts with: real PermissionDataService.hasPermission(ManageUsers), the user-list stub's canEdit input.
   * Data: near misses: ViewUsers; ViewUsers with ManageRoles and ManageGroups.
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ViewUsers', grants: { system: ['ViewUsers'] } },
    {
      label: 'ManageRoles and ManageGroups',
      grants: { system: ['ViewUsers', 'ManageRoles', 'ManageGroups'] },
    },
  ])('makes the list read-only with $label', async ({ grants }) => {
    const { list } = await renderUsers(grants);

    expect(list().canEdit).toBe(false);
  });

  /**
   * Verifies: the list's create and delete outputs create and delete the user through the API and the store.
   * Interacts with: user-list stub outputs, UserService.createUser / deleteUser, real UserDataService/UserQuery.
   * Data: system ManageUsers; Casey Poe created, Blair Roe deleted.
   */
  it('creates and deletes users from the list outputs', async () => {
    const { fixture, list, userService } = await renderUsers({
      system: ['ViewUsers', 'ManageUsers'],
    });

    list().create.emit({ id: 'u3', name: 'Casey Poe' });
    list().delete.emit('u2');
    fixture.detectChanges();

    expect(userService.createUser).toHaveBeenCalledWith({
      id: 'u3',
      name: 'Casey Poe',
    });
    expect(userService.deleteUser).toHaveBeenCalledWith('u2');
    expect(list().users.map((u) => u.name)).toEqual(['Alex Doe', 'Casey Poe']);
  });
});
