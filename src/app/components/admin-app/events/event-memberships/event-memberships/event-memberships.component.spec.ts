// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Observable, of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  Event as AlloyEvent,
  EventMembership,
  EventMembershipsService,
  EventRole,
  EventRolesService,
  EventService,
  Group,
  GroupService,
  User,
  UserService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventMembershipsComponent } from './event-memberships.component';

@Component({
  selector: 'app-event-membership-list',
  template: '',
  standalone: false,
})
class MembershipListStubComponent {
  @Input() users: User[];
  @Input() groups: Group[];
  @Input() canEdit: boolean;
  @Output() createMembership = new EventEmitter<EventMembership>();
}

@Component({
  selector: 'app-event-member-list',
  template: '',
  standalone: false,
})
class MemberListStubComponent {
  @Input() memberships: EventMembership[];
  @Input() users: User[];
  @Input() groups: Group[];
  @Input() roles: EventRole[];
  @Input() canEdit: boolean;
  @Output() deleteMembership = new EventEmitter<string>();
  @Output() editMembership = new EventEmitter<EventMembership>();
}

const event: AlloyEvent = { id: 'e1', name: 'Cyber Range 101' };

async function renderMemberships(
  grants: PermissionGrants,
  inputs: { embedded?: boolean } = {},
) {
  const membershipsApi = {
    getAllEventMemberships: vi.fn(() =>
      of<EventMembership[]>([
        { id: 'm1', eventId: 'e1', userId: 'u1', roleId: 'r1' },
      ]),
    ),
    createEventMembership: vi.fn((_id: string, m: EventMembership) =>
      of<EventMembership>({ ...m, id: 'm-new' }),
    ),
    updateEventMembership: vi.fn((id: string, m: EventMembership) =>
      of<EventMembership>({ ...m, id }),
    ),
    deleteEventMembership: vi.fn(() => of({})),
  } satisfies ApiStub<EventMembershipsService>;
  const userApi = {
    getUsers: vi.fn(() =>
      of<User[]>([
        { id: 'u1', name: 'Alex Doe' },
        { id: 'u2', name: 'Blair Roe' },
      ]),
    ),
  } satisfies ApiStub<UserService>;
  const rolesApi = {
    getAllEventRoles: vi.fn(() =>
      of<EventRole[]>([{ id: 'r1', name: 'Member' }]),
    ),
  } satisfies ApiStub<EventRolesService>;
  const groupApi = {
    getAllGroups: vi.fn(() => of<Group[]>([{ id: 'g1', name: 'Blue Team' }])),
  } satisfies ApiStub<GroupService>;
  // Records whether anything subscribes to the event request.
  const eventSubscriptions = vi.fn();
  const eventApi = {
    getEvent: vi.fn(
      (id: string) =>
        new Observable<AlloyEvent>((subscriber) => {
          eventSubscriptions(id);
          subscriber.next({ ...event });
          subscriber.complete();
        }),
    ),
  } satisfies ApiStub<EventService>;

  const rendered = await renderComponent(EventMembershipsComponent, {
    declarations: [
      EventMembershipsComponent,
      MembershipListStubComponent,
      MemberListStubComponent,
    ],
    imports: [MatButtonModule, MatIconModule, MatTooltipModule],
    providers: [
      { provide: EventMembershipsService, useValue: membershipsApi },
      { provide: UserService, useValue: userApi },
      { provide: EventRolesService, useValue: rolesApi },
      { provide: GroupService, useValue: groupApi },
      { provide: EventService, useValue: eventApi },
      ...permissionDataProviders(grants),
    ],
    inputs: { event: { ...event }, ...inputs },
  });
  const stub = <T>(type: new (...args: never[]) => T): T =>
    rendered.fixture.debugElement.query(By.directive(type)).componentInstance;
  return {
    ...rendered,
    user: userEvent.setup(),
    membershipsApi,
    eventApi,
    eventSubscriptions,
    nonMemberList: () => stub(MembershipListStubComponent),
    memberList: () => stub(MemberListStubComponent),
  };
}

const viewOnly: PermissionGrants = { system: ['ViewEvents'] };

describe('EventMembershipsComponent', () => {
  /**
   * Verifies: the event's memberships split users and groups into members and non-members, and the member list gets the event roles.
   * Interacts with: EventMembershipsService, UserService, EventRolesService and GroupService through the real data services, child stub inputs.
   * Data: event e1; users u1 (member) and u2; group g1; role r1; system ViewEvents.
   */
  it('splits users and groups into members and non-members', async () => {
    const { nonMemberList, memberList, membershipsApi } =
      await renderMemberships(viewOnly);

    expect(membershipsApi.getAllEventMemberships).toHaveBeenCalledWith('e1');
    expect(memberList().users.map((u) => u.id)).toEqual(['u1']);
    expect(memberList().roles.map((r) => r.id)).toEqual(['r1']);
    expect(nonMemberList().users.map((u) => u.id)).toEqual(['u2']);
    expect(nonMemberList().groups.map((g) => g.id)).toEqual(['g1']);
  });

  /**
   * Verifies: after the loads complete the component asks for the event but does not subscribe to the request (current behavior).
   * Interacts with: EventService.getEvent (records subscriptions), real EventDataService.getEvent.
   * Data: event e1; system ViewEvents.
   */
  it('builds the event request after loading without subscribing to it', async () => {
    const { eventApi, eventSubscriptions } = await renderMemberships(viewOnly);

    expect(eventApi.getEvent).toHaveBeenCalledWith('e1');
    // Current behavior; see agent-docs/ui-test-bugs/alloy.ui.md.
    expect(eventSubscriptions).not.toHaveBeenCalled();
  });

  /**
   * Verifies: which rights turn on membership editing: Edit rights on the event do, Manage rights alone do not (current behavior; see agent-docs/ui-test-bugs/alloy.ui.md).
   * Interacts with: real PermissionDataService.loadEventPermissions / canEditEvent, both child stubs' canEdit inputs.
   * Data: one grant per row on event e1, with the canEdit both lists receive.
   */
  it.each<{ label: string; grants: PermissionGrants; expected: boolean }>([
    {
      label: 'system EditEvents',
      grants: { system: ['EditEvents'] },
      expected: true,
    },
    {
      label: 'an EditEvent claim',
      grants: { events: [{ eventId: 'e1', permissions: ['EditEvent'] }] },
      expected: true,
    },
    {
      label: 'system ManageEvents',
      grants: { system: ['ManageEvents'] },
      expected: false,
    },
    {
      label: 'a ManageEvent claim',
      grants: { events: [{ eventId: 'e1', permissions: ['ManageEvent'] }] },
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
   * Verifies: without edit or manage rights on this event, both lists get canEdit false.
   * Interacts with: real PermissionDataService.canEditEvent, both child stubs' canEdit inputs.
   * Data: near misses: system ViewEvents and ExecuteEvents; a ViewEvent and ExecuteEvent claim on e1; Edit and Manage claims on another event (e2).
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    {
      label: 'system ViewEvents and ExecuteEvents',
      grants: { system: ['ViewEvents', 'ExecuteEvents'] },
    },
    {
      label: 'a ViewEvent and ExecuteEvent claim',
      grants: {
        events: [{ eventId: 'e1', permissions: ['ViewEvent', 'ExecuteEvent'] }],
      },
    },
    {
      label: 'claims on another event',
      grants: {
        events: [{ eventId: 'e2', permissions: ['EditEvent', 'ManageEvent'] }],
      },
    },
  ])('keeps both lists read-only with $label', async ({ grants }) => {
    const { nonMemberList, memberList } = await renderMemberships(grants);

    expect(nonMemberList().canEdit).toBe(false);
    expect(memberList().canEdit).toBe(false);
  });

  /**
   * Verifies: the list outputs create (with this event's id), edit and delete memberships through the API, and the users move between the member and non-member lists accordingly.
   * Interacts with: child stub outputs, EventMembershipsService create/update/delete through the real data service, both child stubs' users inputs.
   * Data: system EditEvents; u2 added, then m1 (u1) re-roled and deleted.
   */
  it('creates, edits and deletes memberships from the list outputs', async () => {
    const { fixture, nonMemberList, memberList, membershipsApi } =
      await renderMemberships({ system: ['EditEvents'] });
    const userIds = () => ({
      members: memberList().users.map((u) => u.id),
      nonMembers: nonMemberList().users.map((u) => u.id),
    });

    nonMemberList().createMembership.emit({ userId: 'u2' });
    fixture.detectChanges();
    expect(membershipsApi.createEventMembership).toHaveBeenCalledWith('e1', {
      userId: 'u2',
      eventId: 'e1',
    });
    expect(userIds()).toEqual({ members: ['u1', 'u2'], nonMembers: [] });

    memberList().editMembership.emit({ id: 'm1', roleId: 'r1' });
    expect(membershipsApi.updateEventMembership).toHaveBeenCalledWith('m1', {
      id: 'm1',
      roleId: 'r1',
    });

    memberList().deleteMembership.emit('m1');
    fixture.detectChanges();
    expect(membershipsApi.deleteEventMembership).toHaveBeenCalledWith('m1');
    expect(userIds()).toEqual({ members: ['u2'], nonMembers: ['u1'] });
  });

  /**
   * Verifies: when embedded, the header shows the event's name with a Return button that emits goBack.
   * Interacts with: embedded input, the Return button (user-event), goBack output.
   * Data: event e1 'Cyber Range 101'; embedded true.
   */
  it('shows the header with a Return button when embedded', async () => {
    const { user, fixture } = await renderMemberships(viewOnly, {
      embedded: true,
    });
    let goBack = 0;
    fixture.componentInstance.goBack.subscribe(() => goBack++);

    expect(
      screen.getByRole('heading', { name: 'Cyber Range 101' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { description: 'Return' }));
    expect(goBack).toBe(1);
  });

  /**
   * Verifies: not embedded (as the admin event list renders it), no heading renders.
   * Interacts with: embedded input.
   * Data: event e1; embedded false.
   */
  it('leaves the header out when not embedded', async () => {
    await renderMemberships(viewOnly, { embedded: false });

    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});
