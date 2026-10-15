// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { defer, firstValueFrom, of, throwError } from 'rxjs';
import {
  EventPermission,
  EventPermissionClaim,
  EventPermissionsService,
  EventTemplatePermission,
  EventTemplatePermissionsService,
  GroupPermission,
  GroupPermissionsClaim,
  GroupPermissionsService,
  SystemPermission,
  SystemPermissionsService,
} from 'src/app/generated/alloy.api';
import {
  PermissionGrants,
  permissionApiStubs,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { PermissionDataService } from './permission-data.service';

const ALL_SYSTEM_PERMISSIONS = Object.values(SystemPermission);
const allSystemPermissionsBut = (...excluded: SystemPermission[]) =>
  ALL_SYSTEM_PERMISSIONS.filter((p) => !excluded.includes(p));

/** The real service, seeded with `grants` through the generated permission APIs. */
function seeded(grants: PermissionGrants = {}): PermissionDataService {
  TestBed.configureTestingModule({
    providers: permissionDataProviders(grants),
  });
  return TestBed.inject(PermissionDataService);
}

/** The real service, unseeded, with spies on the four generated permission APIs. */
function unseeded(grants: PermissionGrants = {}) {
  const stubs = permissionApiStubs(grants);
  const spies = {
    getMySystemPermissions: vi.spyOn(
      stubs.systemPermissions,
      'getMySystemPermissions',
    ),
    getMyEventPermissions: vi.spyOn(
      stubs.eventPermissions,
      'getMyEventPermissions',
    ),
    getMyEventTemplatePermissions: vi.spyOn(
      stubs.eventTemplatePermissions,
      'getMyEventTemplatePermissions',
    ),
    getMyGroupPermissions: vi.spyOn(
      stubs.groupPermissions,
      'getMyGroupPermissions',
    ),
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: SystemPermissionsService, useValue: stubs.systemPermissions },
      { provide: EventPermissionsService, useValue: stubs.eventPermissions },
      {
        provide: EventTemplatePermissionsService,
        useValue: stubs.eventTemplatePermissions,
      },
      { provide: GroupPermissionsService, useValue: stubs.groupPermissions },
    ],
  });
  return { service: TestBed.inject(PermissionDataService), spies };
}

describe('PermissionDataService', () => {
  describe('loading', () => {
    /**
     * Verifies: load() fetches the caller's system permissions and exposes them on permissions.
     * Interacts with: SystemPermissionsService.getMySystemPermissions (stubbed).
     * Data: ViewEvents and ViewUsers.
     */
    it('load() stores the system permissions', async () => {
      const { service, spies } = unseeded({
        system: ['ViewEvents', 'ViewUsers'],
      });
      expect(service.permissions).toEqual([]);

      expect(await firstValueFrom(service.load())).toEqual([
        'ViewEvents',
        'ViewUsers',
      ]);

      expect(spies.getMySystemPermissions).toHaveBeenCalledTimes(1);
      expect(service.permissions).toEqual(['ViewEvents', 'ViewUsers']);
    });

    /**
     * Verifies: loadEventPermissions and loadEventTemplatePermissions pass the id through and store the claims.
     * Interacts with: EventPermissionsService.getMyEventPermissions, EventTemplatePermissionsService.getMyEventTemplatePermissions.
     * Data: one event claim and one event-template claim.
     */
    it('loads event and event-template claims for an id', async () => {
      const eventClaim: EventPermissionClaim = {
        eventId: 'e1',
        permissions: ['ViewEvent'],
      };
      const { service, spies } = unseeded({
        events: [eventClaim],
        eventTemplates: [
          { eventTemplateId: 't1', permissions: ['ViewEventTemplate'] },
        ],
      });

      await firstValueFrom(service.loadEventPermissions('e1'));
      await firstValueFrom(service.loadEventTemplatePermissions('t1'));

      expect(spies.getMyEventPermissions).toHaveBeenCalledWith('e1');
      expect(spies.getMyEventTemplatePermissions).toHaveBeenCalledWith('t1');
      expect(service.eventPermissions).toEqual([eventClaim]);
      expect(
        service.eventTemplatePermissions.map((c) => c.eventTemplateId),
      ).toEqual(['t1']);
    });

    /**
     * Verifies: loadGroupPermissions requests once, then serves later calls from its cache and publishes on groupPermissions$.
     * Interacts with: GroupPermissionsService.getMyGroupPermissions (counted with defer), groupPermissions$, recordEmissions.
     * Data: one ManageMembership claim; two calls without forceReload.
     */
    it('loadGroupPermissions caches the claims', async () => {
      let requests = 0;
      const claims: GroupPermissionsClaim[] = [
        { groupId: 'g1', permissions: ['ManageMembership'] },
      ];
      const { service, spies } = unseeded();
      spies.getMyGroupPermissions.mockImplementation(() =>
        defer(() => {
          requests++;
          return of(claims);
        }),
      );
      const published = recordEmissions(service.groupPermissions$);

      await firstValueFrom(service.loadGroupPermissions());
      await firstValueFrom(service.loadGroupPermissions());

      expect(requests).toBe(1);
      expect(service.groupPermissions).toEqual(claims);
      expect(published).toEqual([[], claims]);
    });

    /**
     * Verifies: forceReload bypasses the cache and requests the claims again.
     * Interacts with: GroupPermissionsService.getMyGroupPermissions (counted with defer).
     * Data: two calls, the second with forceReload=true.
     */
    it('loadGroupPermissions(true) requests again', async () => {
      let requests = 0;
      const { service, spies } = unseeded();
      spies.getMyGroupPermissions.mockImplementation(() =>
        defer(() => {
          requests++;
          return of([]);
        }),
      );

      await firstValueFrom(service.loadGroupPermissions());
      await firstValueFrom(service.loadGroupPermissions(true));

      expect(requests).toBe(2);
    });

    /**
     * Verifies: a failed group-permission request is not cached, so the next call retries.
     * Interacts with: GroupPermissionsService.getMyGroupPermissions (error once, then success).
     * Data: a 503 followed by one EditGroup claim.
     */
    it('loadGroupPermissions retries after a failure', async () => {
      const { service, spies } = unseeded();
      spies.getMyGroupPermissions.mockReturnValueOnce(
        throwError(() => ({ status: 503 })),
      );
      spies.getMyGroupPermissions.mockReturnValueOnce(
        of([{ groupId: 'g1', permissions: ['EditGroup'] }]),
      );

      await expect(
        firstValueFrom(service.loadGroupPermissions()),
      ).rejects.toEqual({
        status: 503,
      });
      await firstValueFrom(service.loadGroupPermissions());

      expect(spies.getMyGroupPermissions).toHaveBeenCalledTimes(2);
      expect(service.groupPermissions.map((c) => c.groupId)).toEqual(['g1']);
    });
  });

  describe('system-level gates', () => {
    /**
     * Verifies: each create gate is granted by its own Create* permission and denied by every other system permission (CreateEventTemplates is the near miss for canCreateEvents, and the reverse).
     * Interacts with: real PermissionDataService.canCreateEventTemplates / canCreateEvents.
     * Data: the gate's permission alone (allowed), then every system permission except it (denied).
     */
    it.each<{
      gate: 'canCreateEventTemplates' | 'canCreateEvents';
      label: string;
      system: SystemPermission[];
      expected: boolean;
    }>([
      {
        gate: 'canCreateEventTemplates',
        label: 'CreateEventTemplates',
        system: ['CreateEventTemplates'],
        expected: true,
      },
      {
        gate: 'canCreateEventTemplates',
        label: 'every other system permission',
        system: allSystemPermissionsBut('CreateEventTemplates'),
        expected: false,
      },
      {
        gate: 'canCreateEvents',
        label: 'CreateEvents',
        system: ['CreateEvents'],
        expected: true,
      },
      {
        gate: 'canCreateEvents',
        label: 'every other system permission',
        system: allSystemPermissionsBut('CreateEvents'),
        expected: false,
      },
    ])('$gate with $label is $expected', ({ gate, system, expected }) => {
      expect(seeded({ system })[gate]()).toBe(expected);
    });

    /**
     * Verifies: each *EventTemplates permission opens the event-template list.
     * Interacts with: real PermissionDataService.canViewEventTemplateList.
     * Data: one of the four event-template system permissions at a time.
     */
    it.each<SystemPermission>([
      'CreateEventTemplates',
      'ViewEventTemplates',
      'EditEventTemplates',
      'ManageEventTemplates',
    ])('canViewEventTemplateList is granted by %s', (permission) => {
      expect(seeded({ system: [permission] }).canViewEventTemplateList()).toBe(
        true,
      );
    });

    /**
     * Verifies: each *Events permission opens the event list.
     * Interacts with: real PermissionDataService.canViewEventList.
     * Data: one of the five event system permissions at a time.
     */
    it.each<SystemPermission>([
      'CreateEvents',
      'ViewEvents',
      'EditEvents',
      'ExecuteEvents',
      'ManageEvents',
    ])('canViewEventList is granted by %s', (permission) => {
      expect(seeded({ system: [permission] }).canViewEventList()).toBe(true);
    });

    /**
     * Verifies: each list gate is denied by every system permission outside its own family (the event-template permissions are the near miss for the event list, and the reverse).
     * Interacts with: real PermissionDataService.canViewEventList / canViewEventTemplateList.
     * Data: every non-event permission for the event list; every non-template permission for the template list.
     */
    it.each<{
      gate: 'canViewEventList' | 'canViewEventTemplateList';
      system: SystemPermission[];
    }>([
      {
        gate: 'canViewEventList',
        system: ALL_SYSTEM_PERMISSIONS.filter((p) => !p.endsWith('Events')),
      },
      {
        gate: 'canViewEventTemplateList',
        system: ALL_SYSTEM_PERMISSIONS.filter(
          (p) => !p.endsWith('EventTemplates'),
        ),
      },
    ])('$gate denies the other permission families', ({ gate, system }) => {
      expect(seeded({ system })[gate]()).toBe(false);
    });

    /**
     * Verifies: any View* system permission opens Administration.
     * Interacts with: real PermissionDataService.canViewAdministration.
     * Data: one View* permission at a time.
     */
    it.each<SystemPermission>([
      'ViewEventTemplates',
      'ViewEvents',
      'ViewUsers',
      'ViewRoles',
      'ViewGroups',
    ])('canViewAdministration is granted by %s', (permission) => {
      expect(seeded({ system: [permission] }).canViewAdministration()).toBe(
        true,
      );
    });

    /**
     * Verifies: Create/Edit/Execute/Manage permissions without any View* permission do not open Administration.
     * Interacts with: real PermissionDataService.canViewAdministration.
     * Data: every non-View system permission, no group claims.
     */
    it('canViewAdministration denies non-View permissions', () => {
      const service = seeded({
        system: ALL_SYSTEM_PERMISSIONS.filter((p) => !p.startsWith('View')),
      });
      expect(service.canViewAdministration()).toBe(false);
    });

    /**
     * Verifies: a ManageMembership group claim opens Administration and the Groups admin without any system permission, and an EditGroup claim (the near miss) opens neither.
     * Interacts with: real PermissionDataService.canViewAdministration / canViewGroupsAdmin (group claims).
     * Data: one claim on g1 per case, no system permissions.
     */
    it.each<{ claim: GroupPermission; expected: boolean }>([
      { claim: 'ManageMembership', expected: true },
      { claim: 'EditGroup', expected: false },
    ])(
      'a $claim group claim opens Administration and Groups: $expected',
      ({ claim, expected }) => {
        const service = seeded({
          groups: [{ groupId: 'g1', permissions: [claim] }],
        });
        expect(service.canViewAdministration()).toBe(expected);
        expect(service.canViewGroupsAdmin()).toBe(expected);
      },
    );

    /**
     * Verifies: canViewGroupsAdmin is granted by ViewGroups but not by ManageGroups alone, matching alloy.api, where listing groups needs ViewGroups (GroupController.cs:61).
     * Interacts with: real PermissionDataService.canViewGroupsAdmin.
     * Data: ViewGroups (allowed), then ManageGroups (denied).
     */
    it.each<{ system: SystemPermission; expected: boolean }>([
      { system: 'ViewGroups', expected: true },
      { system: 'ManageGroups', expected: false },
    ])(
      'canViewGroupsAdmin with $system is $expected',
      ({ system, expected }) => {
        expect(seeded({ system: [system] }).canViewGroupsAdmin()).toBe(
          expected,
        );
      },
    );

    /**
     * Verifies: hasPermission is an exact membership test.
     * Interacts with: real PermissionDataService.hasPermission.
     * Data: ViewUsers held; ViewUsers and ManageUsers asked.
     */
    it('hasPermission matches exactly', () => {
      const service = seeded({ system: ['ViewUsers'] });
      expect(service.hasPermission('ViewUsers')).toBe(true);
      expect(service.hasPermission('ManageUsers')).toBe(false);
    });
  });

  describe('event gates', () => {
    const cases: {
      gate: 'canEditEvent' | 'canManageEvent' | 'canExecuteEvent';
      system: SystemPermission;
      claim: EventPermission;
    }[] = [
      { gate: 'canEditEvent', system: 'EditEvents', claim: 'EditEvent' },
      { gate: 'canManageEvent', system: 'ManageEvents', claim: 'ManageEvent' },
      {
        gate: 'canExecuteEvent',
        system: 'ExecuteEvents',
        claim: 'ExecuteEvent',
      },
    ];

    /**
     * Verifies: the system permission grants the gate for any event, with no event claims at all.
     * Interacts with: real PermissionDataService event gates.
     * Data: the matching system permission; event 'e1'.
     */
    it.each(cases)(
      '$gate is granted for any event by $system',
      ({ gate, system }) => {
        expect(seeded({ system: [system] })[gate]('e1')).toBe(true);
      },
    );

    /**
     * Verifies: at system scope only the matching permission grants the gate; every other system permission (ViewEvents, the other event permissions) is denied.
     * Interacts with: real PermissionDataService event gates (system path).
     * Data: every system permission except the gate's own; no event claims; event 'e1'.
     */
    it.each(cases)(
      '$gate is denied by every system permission except $system',
      ({ gate, system }) => {
        expect(
          seeded({ system: allSystemPermissionsBut(system) })[gate]('e1'),
        ).toBe(false);
      },
    );

    /**
     * Verifies: the matching event claim grants the gate for that event only.
     * Interacts with: real PermissionDataService event gates (event claims).
     * Data: a claim on e1; asked for e1 and e2.
     */
    it.each(cases)(
      '$gate is granted by a $claim claim on that event only',
      ({ gate, claim }) => {
        const service = seeded({
          events: [{ eventId: 'e1', permissions: [claim] }],
        });
        expect(service[gate]('e1')).toBe(true);
        expect(service[gate]('e2')).toBe(false);
      },
    );

    /**
     * Verifies: an event claim for a different permission does not grant the gate.
     * Interacts with: real PermissionDataService event gates.
     * Data: a ViewEvent claim on e1.
     */
    it.each(cases)('$gate is denied by an unrelated claim', ({ gate }) => {
      const service = seeded({
        events: [{ eventId: 'e1', permissions: ['ViewEvent'] }],
      });
      expect(service[gate]('e1')).toBe(false);
    });

    /**
     * Verifies: an event claim whose permissions list is null makes the gate throw (current behavior).
     * Interacts with: real PermissionDataService.canEditEvent.
     * Data: an event claim with permissions: null, which the generated model's optional type allows.
     * Why: alloy.api never sends this (it initializes Permissions = [] in EventPermissionClaim.cs and EventTemplatePermissionClaim.cs); the test records the type contract the gate relies on.
     */
    it('throws on an event claim with null permissions', () => {
      const service = seeded({
        events: [{ eventId: 'e1', permissions: null }],
      });

      // canEvent() and canEventTemplate() rely on the API's contract that a
      // claim's permissions is always an array, while canGroup() tolerates
      // null with ?.includes(). This pins that reliance, so a change to the
      // contract shows up here.
      expect(() => service.canEditEvent('e1')).toThrow(TypeError);
    });
  });

  describe('event-template gates', () => {
    const cases: {
      gate: 'canEditEventTemplate' | 'canManageEventTemplate';
      system: SystemPermission;
      claim: EventTemplatePermission;
    }[] = [
      {
        gate: 'canEditEventTemplate',
        system: 'EditEventTemplates',
        claim: 'EditEventTemplate',
      },
      {
        gate: 'canManageEventTemplate',
        system: 'ManageEventTemplates',
        claim: 'ManageEventTemplate',
      },
    ];

    /**
     * Verifies: the system permission grants the gate for any template.
     * Interacts with: real PermissionDataService event-template gates.
     * Data: the matching system permission; template 't1'.
     */
    it.each(cases)(
      '$gate is granted for any template by $system',
      ({ gate, system }) => {
        expect(seeded({ system: [system] })[gate]('t1')).toBe(true);
      },
    );

    /**
     * Verifies: at system scope only the matching permission grants the gate; every other system permission (ViewEventTemplates, the other template permissions) is denied.
     * Interacts with: real PermissionDataService event-template gates (system path).
     * Data: every system permission except the gate's own; no template claims; template 't1'.
     */
    it.each(cases)(
      '$gate is denied by every system permission except $system',
      ({ gate, system }) => {
        expect(
          seeded({ system: allSystemPermissionsBut(system) })[gate]('t1'),
        ).toBe(false);
      },
    );

    /**
     * Verifies: the matching template claim grants the gate for that template only.
     * Interacts with: real PermissionDataService event-template gates (template claims).
     * Data: a claim on t1; asked for t1 and t2.
     */
    it.each(cases)(
      '$gate is granted by a $claim claim on that template only',
      ({ gate, claim }) => {
        const service = seeded({
          eventTemplates: [{ eventTemplateId: 't1', permissions: [claim] }],
        });
        expect(service[gate]('t1')).toBe(true);
        expect(service[gate]('t2')).toBe(false);
      },
    );

    /**
     * Verifies: a ViewEventTemplate claim grants neither edit nor manage.
     * Interacts with: real PermissionDataService event-template gates.
     * Data: a ViewEventTemplate claim on t1.
     */
    it.each(cases)('$gate is denied by a view-only claim', ({ gate }) => {
      const service = seeded({
        eventTemplates: [
          { eventTemplateId: 't1', permissions: ['ViewEventTemplate'] },
        ],
      });
      expect(service[gate]('t1')).toBe(false);
    });

    /**
     * Verifies: a claim for edit does not imply manage, and the reverse.
     * Interacts with: real PermissionDataService.canEditEventTemplate / canManageEventTemplate.
     * Data: per case, the other gate's claim on t1.
     */
    it.each<{
      gate: 'canEditEventTemplate' | 'canManageEventTemplate';
      claim: EventTemplatePermission;
    }>([
      { gate: 'canManageEventTemplate', claim: 'EditEventTemplate' },
      { gate: 'canEditEventTemplate', claim: 'ManageEventTemplate' },
    ])('$gate is denied by a $claim claim', ({ gate, claim }) => {
      const service = seeded({
        eventTemplates: [{ eventTemplateId: 't1', permissions: [claim] }],
      });
      expect(service[gate]('t1')).toBe(false);
    });
  });

  describe('group gates', () => {
    /**
     * Verifies: system ManageGroups grants both group gates for any group.
     * Interacts with: real PermissionDataService.canManageGroup / canEditGroup.
     * Data: ManageGroups; group 'g1'.
     */
    it('ManageGroups grants manage and edit on any group', () => {
      const service = seeded({ system: ['ManageGroups'] });
      expect(service.canManageGroup('g1')).toBe(true);
      expect(service.canEditGroup('g1')).toBe(true);
    });

    /**
     * Verifies: every system permission except ManageGroups (ViewGroups among them) grants neither group gate.
     * Interacts with: real PermissionDataService.canManageGroup / canEditGroup (system path).
     * Data: every system permission except ManageGroups; no group claims; group 'g1'.
     */
    it.each<'canManageGroup' | 'canEditGroup'>([
      'canManageGroup',
      'canEditGroup',
    ])(
      '%s is denied by every system permission except ManageGroups',
      (gate) => {
        expect(
          seeded({ system: allSystemPermissionsBut('ManageGroups') })[gate](
            'g1',
          ),
        ).toBe(false);
      },
    );

    /**
     * Verifies: ManageMembership grants canManageGroup and EditGroup grants canEditGroup, each for that group only.
     * Interacts with: real PermissionDataService group gates (group claims).
     * Data: ManageMembership on g1 and EditGroup on g2.
     */
    it('group claims grant their own gate on their own group', () => {
      const service = seeded({
        groups: [
          { groupId: 'g1', permissions: ['ManageMembership'] },
          { groupId: 'g2', permissions: ['EditGroup'] },
        ],
      });
      expect(service.canManageGroup('g1')).toBe(true);
      expect(service.canEditGroup('g1')).toBe(false);
      expect(service.canEditGroup('g2')).toBe(true);
      expect(service.canManageGroup('g2')).toBe(false);
      expect(service.canManageGroup('g3')).toBe(false);
    });

    /**
     * Verifies: a group claim with null permissions is treated as no permission.
     * Interacts with: real PermissionDataService.canManageGroup (optional chaining).
     * Data: a claim on g1 with permissions: null.
     */
    it('a null group claim grants nothing', () => {
      const service = seeded({
        groups: [{ groupId: 'g1', permissions: null }],
      });
      expect(service.canManageGroup('g1')).toBe(false);
    });
  });
});
