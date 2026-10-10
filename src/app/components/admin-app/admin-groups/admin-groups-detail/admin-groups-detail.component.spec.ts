// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import {
  GroupMembership,
  GroupMembershipRole,
  GroupPermissionsService,
  GroupService,
  User,
} from 'src/app/generated/alloy.api';
import { UserStore } from 'src/app/data/user/user.store';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  permissionApiStubs,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminGroupsDetailComponent } from './admin-groups-detail.component';

@Component({
  selector: 'app-admin-groups-membership-list',
  template: '',
  standalone: false,
})
class MembershipListStubComponent {
  @Input() users: User[];
  @Input() canEdit: boolean;
  @Output() createMembership = new EventEmitter<string>();
}

@Component({
  selector: 'app-admin-groups-member-list',
  template: '',
  standalone: false,
})
class MemberListStubComponent {
  @Input() memberships: GroupMembership[];
  @Input() users: User[];
  @Input() canEdit: boolean;
  @Output() deleteMembership = new EventEmitter<{
    id: string;
    isCurrentUser: boolean;
  }>();
  @Output() editMembership = new EventEmitter<{
    id: string;
    role: GroupMembershipRole;
    isCurrentUser: boolean;
  }>();
}

const users: User[] = [
  { id: 'u1', name: 'Alex Doe' },
  { id: 'u2', name: 'Blair Roe' },
  { id: 'u3', name: 'Casey Poe' },
];

function groupServiceStub() {
  return {
    getGroupMemberships: vi.fn((groupId: string) =>
      of<GroupMembership[]>([
        { id: 'm1', groupId, userId: 'u1', role: 'Manager' },
      ]),
    ),
    createGroupMembership: vi.fn((groupId: string, m: GroupMembership) =>
      of<GroupMembership>({ ...m, id: 'm-new', groupId }),
    ),
    deleteGroupMembership: vi.fn(() => of({})),
    editGroupMembership: vi.fn((id: string, m: GroupMembership) =>
      of<GroupMembership>({ id, groupId: 'g1', userId: 'u1', ...m }),
    ),
  } satisfies ApiStub<GroupService>;
}

async function renderDetail(canEdit: boolean) {
  const groupService = groupServiceStub();
  const groupPermissions = permissionApiStubs().groupPermissions;
  const rendered = await renderComponent(AdminGroupsDetailComponent, {
    declarations: [
      AdminGroupsDetailComponent,
      MembershipListStubComponent,
      MemberListStubComponent,
    ],
    providers: [
      { provide: GroupService, useValue: groupService },
      ...permissionDataProviders(),
      { provide: GroupPermissionsService, useValue: groupPermissions },
      {
        provide: UserStore,
        useFactory: () => {
          const store = new UserStore();
          store.set(users);
          return store;
        },
      },
    ],
    inputs: { groupId: 'g1', canEdit },
  });
  const stub = <T>(type: new (...args: never[]) => T): T =>
    rendered.fixture.debugElement.query(By.directive(type)).componentInstance;
  return {
    ...rendered,
    groupService,
    groupPermissions,
    nonMemberList: () => stub(MembershipListStubComponent),
    memberList: () => stub(MemberListStubComponent),
  };
}

describe('AdminGroupsDetailComponent', () => {
  /**
   * Verifies: with canEdit the component passes canEdit true to both lists.
   * Interacts with: canEdit input, the membership-list and member-list stubs' canEdit inputs.
   * Data: group g1; canEdit true.
   */
  it('passes canEdit to both lists when allowed', async () => {
    const { memberList, nonMemberList } = await renderDetail(true);

    expect(nonMemberList().canEdit).toBe(true);
    expect(memberList().canEdit).toBe(true);
  });

  /**
   * Verifies: without canEdit both lists get canEdit false, so neither offers add, remove or role changes.
   * Interacts with: canEdit input, the two child stubs' canEdit inputs.
   * Data: group g1; canEdit false (AdminGroupsComponent passes canManageGroup(id), false without system ManageGroups or a ManageMembership claim).
   */
  it('passes canEdit false to both lists without canEdit', async () => {
    const { memberList, nonMemberList } = await renderDetail(false);

    expect(nonMemberList().canEdit).toBe(false);
    expect(memberList().canEdit).toBe(false);
  });

  /**
   * Verifies: the loaded memberships split the users into members and non-members.
   * Interacts with: GroupService.getGroupMemberships, real GroupMembershipService, real UserStore/UserQuery, child stub inputs.
   * Data: three users; one membership for u1 in g1.
   */
  it('splits users into members and non-members', async () => {
    const { fixture, memberList, nonMemberList, groupService } =
      await renderDetail(true);
    fixture.detectChanges();

    expect(groupService.getGroupMemberships).toHaveBeenCalledWith('g1');
    expect(memberList().users.map((u) => u.id)).toEqual(['u1']);
    expect(memberList().memberships.map((m) => m.id)).toEqual(['m1']);
    expect(nonMemberList().users.map((u) => u.id)).toEqual(['u2', 'u3']);
  });

  /**
   * Verifies: a createMembership from the non-member list creates a Member membership in this group, and the user moves to the member list.
   * Interacts with: membership-list stub output, GroupService.createGroupMembership, real GroupMembershipService.
   * Data: u2 added to g1.
   */
  it('creates a Member membership for the chosen user', async () => {
    const { fixture, nonMemberList, memberList, groupService } =
      await renderDetail(true);

    nonMemberList().createMembership.emit('u2');
    fixture.detectChanges();

    expect(groupService.createGroupMembership).toHaveBeenCalledWith('g1', {
      groupId: 'g1',
      userId: 'u2',
      role: 'Member',
    });
    expect(memberList().users.map((u) => u.id)).toEqual(['u1', 'u2']);
  });

  /**
   * Verifies: deleting or editing your own membership reloads your group permissions; another member's does not.
   * Interacts with: member-list stub outputs, GroupService.deleteGroupMembership / editGroupMembership, real PermissionDataService.loadGroupPermissions(true), GroupPermissionsService.getMyGroupPermissions spy.
   * Data: membership m1; isCurrentUser true, then false.
   */
  it.each([
    { action: 'delete', isCurrentUser: true, reloads: 1 },
    { action: 'delete', isCurrentUser: false, reloads: 0 },
    { action: 'edit', isCurrentUser: true, reloads: 1 },
    { action: 'edit', isCurrentUser: false, reloads: 0 },
  ])(
    '$action with isCurrentUser $isCurrentUser reloads group permissions $reloads time(s)',
    async ({ action, isCurrentUser, reloads }) => {
      const { memberList, groupService, groupPermissions } =
        await renderDetail(true);
      const before = groupPermissions.getMyGroupPermissions.mock.calls.length;

      if (action === 'delete') {
        memberList().deleteMembership.emit({ id: 'm1', isCurrentUser });
        expect(groupService.deleteGroupMembership).toHaveBeenCalledWith('m1');
      } else {
        memberList().editMembership.emit({
          id: 'm1',
          role: 'Member',
          isCurrentUser,
        });
        expect(groupService.editGroupMembership).toHaveBeenCalledWith('m1', {
          role: 'Member',
        });
      }

      expect(groupPermissions.getMyGroupPermissions).toHaveBeenCalledTimes(
        before + reloads,
      );
    },
  );
});
