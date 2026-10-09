// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EventTemplateMembership,
  EventTemplateMembershipsService,
  EventTemplateRole,
  EventTemplateRolesService,
  Group,
  GroupService,
  User,
  UserService,
} from 'src/app/generated/alloy.api';
import { EventTemplateStore } from 'src/app/data/event-template/event-template.store';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateMembershipsComponent } from './event-template-memberships.component';

@Component({
  selector: 'app-event-template-membership-list',
  template: '',
  standalone: false,
})
class MembershipListStubComponent {
  @Input() users: User[];
  @Input() groups: Group[];
  @Input() canEdit: boolean;
  @Output() createMembership = new EventEmitter<EventTemplateMembership>();
}

@Component({
  selector: 'app-event-template-member-list',
  template: '',
  standalone: false,
})
class MemberListStubComponent {
  @Input() memberships: EventTemplateMembership[];
  @Input() users: User[];
  @Input() groups: Group[];
  @Input() roles: EventTemplateRole[];
  @Input() canEdit: boolean;
  @Output() deleteMembership = new EventEmitter<string>();
  @Output() editMembership = new EventEmitter<EventTemplateMembership>();
}

async function renderMemberships(
  grants: PermissionGrants,
  inputs: { embedded?: boolean; showHeader?: boolean } = {},
) {
  const membershipsApi = {
    getAllEventTemplateMemberships: vi.fn(() =>
      of<EventTemplateMembership[]>([
        { id: 'm1', eventTemplateId: 't1', userId: 'u1', roleId: 'r1' },
      ]),
    ),
    createEventTemplateMembership: vi.fn(
      (_id: string, m: EventTemplateMembership) =>
        of<EventTemplateMembership>({ ...m, id: 'm-new' }),
    ),
    updateEventTemplateMembership: vi.fn(
      (id: string, m: EventTemplateMembership) =>
        of<EventTemplateMembership>({ ...m, id }),
    ),
    deleteEventTemplateMembership: vi.fn(() => of({})),
  } satisfies ApiStub<EventTemplateMembershipsService>;
  const userApi = {
    getUsers: vi.fn(() =>
      of<User[]>([
        { id: 'u1', name: 'Alex Doe' },
        { id: 'u2', name: 'Blair Roe' },
      ]),
    ),
  } satisfies ApiStub<UserService>;
  const rolesApi = {
    getAllEventTemplateRoles: vi.fn(() =>
      of<EventTemplateRole[]>([{ id: 'r1', name: 'Member' }]),
    ),
  } satisfies ApiStub<EventTemplateRolesService>;
  const groupApi = {
    getAllGroups: vi.fn(() => of<Group[]>([{ id: 'g1', name: 'Blue Team' }])),
  } satisfies ApiStub<GroupService>;

  const rendered = await renderComponent(EventTemplateMembershipsComponent, {
    declarations: [
      EventTemplateMembershipsComponent,
      MembershipListStubComponent,
      MemberListStubComponent,
    ],
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
    providers: [
      { provide: EventTemplateMembershipsService, useValue: membershipsApi },
      { provide: UserService, useValue: userApi },
      { provide: EventTemplateRolesService, useValue: rolesApi },
      { provide: GroupService, useValue: groupApi },
      {
        provide: EventTemplateStore,
        useFactory: () => {
          const store = new EventTemplateStore();
          store.set([{ id: 't1', name: 'Range Template' }]);
          return store;
        },
      },
      ...permissionDataProviders(grants),
    ],
    inputs: { eventTemplateId: 't1', ...inputs },
  });
  const stub = <T>(type: new (...args: never[]) => T): T =>
    rendered.fixture.debugElement.query(By.directive(type)).componentInstance;
  return {
    ...rendered,
    user: userEvent.setup(),
    membershipsApi,
    nonMemberList: () => stub(MembershipListStubComponent),
    memberList: () => stub(MemberListStubComponent),
  };
}

const viewOnly: PermissionGrants = { system: ['ViewEventTemplates'] };

describe('EventTemplateMembershipsComponent', () => {
  /**
   * Verifies: the template's memberships split users and groups into members and non-members, and the member list gets the roles.
   * Interacts with: EventTemplateMembershipsService, UserService, EventTemplateRolesService and GroupService through the real data services, child stub inputs.
   * Data: users u1 (member) and u2; group g1 (not a member); role r1; system ViewEventTemplates.
   */
  it('splits users and groups into members and non-members', async () => {
    const { nonMemberList, memberList, membershipsApi } =
      await renderMemberships(viewOnly);

    expect(membershipsApi.getAllEventTemplateMemberships).toHaveBeenCalledWith(
      't1',
    );
    expect(memberList().users.map((u) => u.id)).toEqual(['u1']);
    expect(memberList().groups).toEqual([]);
    expect(memberList().roles.map((r) => r.id)).toEqual(['r1']);
    expect(nonMemberList().users.map((u) => u.id)).toEqual(['u2']);
    expect(nonMemberList().groups.map((g) => g.id)).toEqual(['g1']);
  });

  /**
   * Verifies: which rights turn on membership editing: Edit rights on the template do, Manage rights alone do not (current behavior; see agent-docs/ui-test-bugs/alloy.ui.md).
   * Interacts with: real PermissionDataService.loadEventTemplatePermissions / canEditEventTemplate, both child stubs' canEdit inputs.
   * Data: one grant per row on template t1, with the canEdit both lists receive.
   */
  it.each<{ label: string; grants: PermissionGrants; expected: boolean }>([
    {
      label: 'system EditEventTemplates',
      grants: { system: ['EditEventTemplates'] },
      expected: true,
    },
    {
      label: 'an EditEventTemplate claim',
      grants: {
        eventTemplates: [
          { eventTemplateId: 't1', permissions: ['EditEventTemplate'] },
        ],
      },
      expected: true,
    },
    {
      label: 'system ManageEventTemplates',
      grants: { system: ['ManageEventTemplates'] },
      expected: false,
    },
    {
      label: 'a ManageEventTemplate claim',
      grants: {
        eventTemplates: [
          { eventTemplateId: 't1', permissions: ['ManageEventTemplate'] },
        ],
      },
      expected: false,
    },
  ])(
    'gates membership editing on edit rights ($label: $expected)',
    async ({ grants, expected }) => {
      const { nonMemberList, memberList } = await renderMemberships(grants);

      // Current behavior; see agent-docs/ui-test-bugs/alloy.ui.md.
      expect(nonMemberList().canEdit).toBe(expected);
      expect(memberList().canEdit).toBe(expected);
    },
  );

  /**
   * Verifies: without edit or manage rights on this template, both lists get canEdit false.
   * Interacts with: real PermissionDataService.canEditEventTemplate, both child stubs' canEdit inputs.
   * Data: near misses: system ViewEventTemplates; a ViewEventTemplate claim on t1; Edit and Manage claims on another template (t2).
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ViewEventTemplates', grants: viewOnly },
    {
      label: 'a ViewEventTemplate claim',
      grants: {
        eventTemplates: [
          { eventTemplateId: 't1', permissions: ['ViewEventTemplate'] },
        ],
      },
    },
    {
      label: 'claims on another template',
      grants: {
        eventTemplates: [
          {
            eventTemplateId: 't2',
            permissions: ['EditEventTemplate', 'ManageEventTemplate'],
          },
        ],
      },
    },
  ])('keeps both lists read-only with $label', async ({ grants }) => {
    const { nonMemberList, memberList } = await renderMemberships(grants);

    expect(nonMemberList().canEdit).toBe(false);
    expect(memberList().canEdit).toBe(false);
  });

  /**
   * Verifies: the list outputs create (with this template's id), edit and delete memberships through the API, and the users move between the member and non-member lists accordingly.
   * Interacts with: child stub outputs, EventTemplateMembershipsService create/update/delete through the real data service, both child stubs' users inputs.
   * Data: system EditEventTemplates; u2 added, then m1 (u1) re-roled and deleted.
   */
  it('creates, edits and deletes memberships from the list outputs', async () => {
    const { fixture, nonMemberList, memberList, membershipsApi } =
      await renderMemberships({ system: ['EditEventTemplates'] });
    const userIds = () => ({
      members: memberList().users.map((u) => u.id),
      nonMembers: nonMemberList().users.map((u) => u.id),
    });

    nonMemberList().createMembership.emit({ userId: 'u2' });
    fixture.detectChanges();
    expect(membershipsApi.createEventTemplateMembership).toHaveBeenCalledWith(
      't1',
      {
        userId: 'u2',
        eventTemplateId: 't1',
      },
    );
    expect(userIds()).toEqual({ members: ['u1', 'u2'], nonMembers: [] });

    memberList().editMembership.emit({ id: 'm1', roleId: 'r1' });
    expect(membershipsApi.updateEventTemplateMembership).toHaveBeenCalledWith(
      'm1',
      {
        id: 'm1',
        roleId: 'r1',
      },
    );

    memberList().deleteMembership.emit('m1');
    fixture.detectChanges();
    expect(membershipsApi.deleteEventTemplateMembership).toHaveBeenCalledWith(
      'm1',
    );
    expect(userIds()).toEqual({ members: ['u2'], nonMembers: ['u1'] });
  });

  /**
   * Verifies: when embedded, the header shows the template's name with a Return button that emits goBack.
   * Interacts with: embedded input (showHeader left at its default true), real EventTemplateQuery, the Return button (user-event), goBack output.
   * Data: template t1 'Range Template'; embedded true.
   */
  it('shows the header with a Return button when embedded', async () => {
    const { user, fixture } = await renderMemberships(viewOnly, {
      embedded: true,
    });
    let goBack = 0;
    fixture.componentInstance.goBack.subscribe(() => goBack++);

    expect(
      screen.getByRole('heading', { name: 'Range Template' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { description: 'Return' }));
    expect(goBack).toBe(1);
  });

  /**
   * Verifies: with showHeader false no heading renders.
   * Interacts with: showHeader input.
   * Data: template t1; showHeader false.
   */
  it('leaves the header out when showHeader is false', async () => {
    await renderMemberships(viewOnly, { showHeader: false });

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
