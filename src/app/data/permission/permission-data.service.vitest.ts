// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import {
  EventPermission,
  EventPermissionClaim,
  EventTemplatePermission,
  EventTemplatePermissionClaim,
  SystemPermission,
  SystemPermissionsService,
  EventPermissionsService,
  EventTemplatePermissionsService,
} from 'src/app/generated/alloy.api';
import { PermissionDataService } from './permission-data.service';
import { of } from 'rxjs';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildService(
  systemPerms: SystemPermission[] = [],
  eventPerms: EventPermissionClaim[] = [],
  eventTemplatePerms: EventTemplatePermissionClaim[] = []
): PermissionDataService {
  const systemPermissionsService = {
    getMySystemPermissions: () => of(systemPerms),
  } as unknown as SystemPermissionsService;

  const eventPermissionsService = {
    getMyEventPermissions: (_id?: string) => of(eventPerms),
  } as unknown as EventPermissionsService;

  const eventTemplatePermissionsService = {
    getMyEventTemplatePermissions: (_id?: string) => of(eventTemplatePerms),
  } as unknown as EventTemplatePermissionsService;

  const svc = new PermissionDataService(
    systemPermissionsService,
    eventPermissionsService,
    eventTemplatePermissionsService
  );

  // Trigger the load so internal state is populated synchronously (of() is sync).
  svc.load().subscribe();
  svc.loadEventPermissions().subscribe();
  svc.loadEventTemplatePermissions().subscribe();

  return svc;
}

// ---------------------------------------------------------------------------
// hasPermission — all 15 SystemPermission values
// ---------------------------------------------------------------------------

describe('PermissionDataService.hasPermission', () => {
  const ALL_SYSTEM_PERMISSIONS: SystemPermission[] = [
    SystemPermission.CreateEventTemplates,
    SystemPermission.ViewEventTemplates,
    SystemPermission.EditEventTemplates,
    SystemPermission.ManageEventTemplates,
    SystemPermission.CreateEvents,
    SystemPermission.ViewEvents,
    SystemPermission.EditEvents,
    SystemPermission.ExecuteEvents,
    SystemPermission.ManageEvents,
    SystemPermission.ViewUsers,
    SystemPermission.ManageUsers,
    SystemPermission.ViewRoles,
    SystemPermission.ManageRoles,
    SystemPermission.ViewGroups,
    SystemPermission.ManageGroups,
  ];

  for (const perm of ALL_SYSTEM_PERMISSIONS) {
    it(`returns true when ${perm} is granted`, () => {
      const svc = buildService([perm]);
      expect(svc.hasPermission(perm)).toBe(true);
    });

    it(`returns false when ${perm} is not granted`, () => {
      const others = ALL_SYSTEM_PERMISSIONS.filter((p) => p !== perm);
      const svc = buildService(others);
      expect(svc.hasPermission(perm)).toBe(false);
    });
  }

  it('returns false when permissions list is empty', () => {
    const svc = buildService([]);
    expect(svc.hasPermission(SystemPermission.ViewUsers)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canViewAdministration (note: typo matches actual service)
// ---------------------------------------------------------------------------

describe('PermissionDataService.canViewAdministration', () => {
  it('returns true when at least one View* permission is present', () => {
    const svc = buildService([SystemPermission.ViewUsers]);
    expect(svc.canViewAdministration()).toBe(true);
  });

  it('returns true for ViewEventTemplates', () => {
    const svc = buildService([SystemPermission.ViewEventTemplates]);
    expect(svc.canViewAdministration()).toBe(true);
  });

  it('returns true for ViewEvents', () => {
    const svc = buildService([SystemPermission.ViewEvents]);
    expect(svc.canViewAdministration()).toBe(true);
  });

  it('returns true for ViewRoles', () => {
    const svc = buildService([SystemPermission.ViewRoles]);
    expect(svc.canViewAdministration()).toBe(true);
  });

  it('returns true for ViewGroups', () => {
    const svc = buildService([SystemPermission.ViewGroups]);
    expect(svc.canViewAdministration()).toBe(true);
  });

  it('returns false when only non-View permissions are present', () => {
    const svc = buildService([
      SystemPermission.ManageUsers,
      SystemPermission.ManageRoles,
      SystemPermission.CreateEvents,
    ]);
    expect(svc.canViewAdministration()).toBe(false);
  });

  it('returns false when permissions list is empty', () => {
    const svc = buildService([]);
    expect(svc.canViewAdministration()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canCreateEventTemplates
// ---------------------------------------------------------------------------

describe('PermissionDataService.canCreateEventTemplates', () => {
  it('returns true when CreateEventTemplates is granted', () => {
    const svc = buildService([SystemPermission.CreateEventTemplates]);
    expect(svc.canCreateEventTemplates()).toBe(true);
  });

  it('returns false when CreateEventTemplates is not granted', () => {
    const svc = buildService([
      SystemPermission.ViewEventTemplates,
      SystemPermission.EditEventTemplates,
    ]);
    expect(svc.canCreateEventTemplates()).toBe(false);
  });

  it('returns false when permissions list is empty', () => {
    const svc = buildService([]);
    expect(svc.canCreateEventTemplates()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canCreateEvents
// ---------------------------------------------------------------------------

describe('PermissionDataService.canCreateEvents', () => {
  it('returns true when CreateEvents is granted', () => {
    const svc = buildService([SystemPermission.CreateEvents]);
    expect(svc.canCreateEvents()).toBe(true);
  });

  it('returns false when CreateEvents is not granted', () => {
    const svc = buildService([
      SystemPermission.ViewEvents,
      SystemPermission.EditEvents,
    ]);
    expect(svc.canCreateEvents()).toBe(false);
  });

  it('returns false when permissions list is empty', () => {
    const svc = buildService([]);
    expect(svc.canCreateEvents()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canViewEventTemplateList
// ---------------------------------------------------------------------------

describe('PermissionDataService.canViewEventTemplateList', () => {
  it('returns true for CreateEventTemplates (ends with EventTemplates)', () => {
    const svc = buildService([SystemPermission.CreateEventTemplates]);
    expect(svc.canViewEventTemplateList()).toBe(true);
  });

  it('returns true for ViewEventTemplates', () => {
    const svc = buildService([SystemPermission.ViewEventTemplates]);
    expect(svc.canViewEventTemplateList()).toBe(true);
  });

  it('returns true for EditEventTemplates', () => {
    const svc = buildService([SystemPermission.EditEventTemplates]);
    expect(svc.canViewEventTemplateList()).toBe(true);
  });

  it('returns true for ManageEventTemplates', () => {
    const svc = buildService([SystemPermission.ManageEventTemplates]);
    expect(svc.canViewEventTemplateList()).toBe(true);
  });

  it('returns false when only Event permissions present (no EventTemplates)', () => {
    const svc = buildService([
      SystemPermission.ViewEvents,
      SystemPermission.CreateEvents,
    ]);
    expect(svc.canViewEventTemplateList()).toBe(false);
  });

  it('returns false when permissions list is empty', () => {
    const svc = buildService([]);
    expect(svc.canViewEventTemplateList()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canViewEventList
// ---------------------------------------------------------------------------

describe('PermissionDataService.canViewEventList', () => {
  it('returns true for CreateEvents (ends with Events)', () => {
    const svc = buildService([SystemPermission.CreateEvents]);
    expect(svc.canViewEventList()).toBe(true);
  });

  it('returns true for ViewEvents', () => {
    const svc = buildService([SystemPermission.ViewEvents]);
    expect(svc.canViewEventList()).toBe(true);
  });

  it('returns true for EditEvents', () => {
    const svc = buildService([SystemPermission.EditEvents]);
    expect(svc.canViewEventList()).toBe(true);
  });

  it('returns true for ExecuteEvents', () => {
    const svc = buildService([SystemPermission.ExecuteEvents]);
    expect(svc.canViewEventList()).toBe(true);
  });

  it('returns true for ManageEvents', () => {
    const svc = buildService([SystemPermission.ManageEvents]);
    expect(svc.canViewEventList()).toBe(true);
  });

  it('returns false when only EventTemplate permissions present', () => {
    const svc = buildService([
      SystemPermission.ViewEventTemplates,
      SystemPermission.CreateEventTemplates,
    ]);
    expect(svc.canViewEventList()).toBe(false);
  });

  it('returns false when permissions list is empty', () => {
    const svc = buildService([]);
    expect(svc.canViewEventList()).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canEditEvent
// ---------------------------------------------------------------------------

describe('PermissionDataService.canEditEvent', () => {
  const EVENT_ID = 'event-abc-123';
  const OTHER_EVENT_ID = 'event-xyz-999';

  it('returns true via system EditEvents permission for any event ID', () => {
    const svc = buildService([SystemPermission.EditEvents]);
    expect(svc.canEditEvent(EVENT_ID)).toBe(true);
  });

  it('returns true via system EditEvents permission for a different event ID', () => {
    const svc = buildService([SystemPermission.EditEvents]);
    expect(svc.canEditEvent(OTHER_EVENT_ID)).toBe(true);
  });

  it('returns true via resource EditEvent permission for the correct event ID', () => {
    const svc = buildService(
      [],
      [{ eventId: EVENT_ID, permissions: [EventPermission.EditEvent] }]
    );
    expect(svc.canEditEvent(EVENT_ID)).toBe(true);
  });

  it('returns false via resource permission for a different event ID', () => {
    const svc = buildService(
      [],
      [{ eventId: EVENT_ID, permissions: [EventPermission.EditEvent] }]
    );
    expect(svc.canEditEvent(OTHER_EVENT_ID)).toBe(false);
  });

  it('returns false when no permissions are granted', () => {
    const svc = buildService([]);
    expect(svc.canEditEvent(EVENT_ID)).toBe(false);
  });

  it('system EditEvents overrides absence of resource permission', () => {
    const svc = buildService(
      [SystemPermission.EditEvents],
      [{ eventId: OTHER_EVENT_ID, permissions: [EventPermission.ViewEvent] }]
    );
    expect(svc.canEditEvent(EVENT_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canManageEvent
// ---------------------------------------------------------------------------

describe('PermissionDataService.canManageEvent', () => {
  const EVENT_ID = 'event-manage-123';
  const OTHER_EVENT_ID = 'event-manage-999';

  it('returns true via system ManageEvents permission', () => {
    const svc = buildService([SystemPermission.ManageEvents]);
    expect(svc.canManageEvent(EVENT_ID)).toBe(true);
  });

  it('returns true via resource ManageEvent for the correct event ID', () => {
    const svc = buildService(
      [],
      [{ eventId: EVENT_ID, permissions: [EventPermission.ManageEvent] }]
    );
    expect(svc.canManageEvent(EVENT_ID)).toBe(true);
  });

  it('returns false via resource permission for a different event ID', () => {
    const svc = buildService(
      [],
      [{ eventId: EVENT_ID, permissions: [EventPermission.ManageEvent] }]
    );
    expect(svc.canManageEvent(OTHER_EVENT_ID)).toBe(false);
  });

  it('returns false when no permissions are granted', () => {
    const svc = buildService([]);
    expect(svc.canManageEvent(EVENT_ID)).toBe(false);
  });

  it('should return true when system ManageEvents granted even when resource claim exists for another event', () => {
    const svc = buildService(
      [SystemPermission.ManageEvents],
      [{ eventId: OTHER_EVENT_ID, permissions: [EventPermission.ViewEvent] }]
    );
    expect(svc.canManageEvent(EVENT_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canExecuteEvent
// ---------------------------------------------------------------------------

describe('PermissionDataService.canExecuteEvent', () => {
  const EVENT_ID = 'event-exec-123';
  const OTHER_EVENT_ID = 'event-exec-999';

  it('returns true via system ExecuteEvents permission', () => {
    const svc = buildService([SystemPermission.ExecuteEvents]);
    expect(svc.canExecuteEvent(EVENT_ID)).toBe(true);
  });

  it('returns true via resource ExecuteEvent for the correct event ID', () => {
    const svc = buildService(
      [],
      [{ eventId: EVENT_ID, permissions: [EventPermission.ExecuteEvent] }]
    );
    expect(svc.canExecuteEvent(EVENT_ID)).toBe(true);
  });

  it('returns false via resource permission for a different event ID', () => {
    const svc = buildService(
      [],
      [{ eventId: EVENT_ID, permissions: [EventPermission.ExecuteEvent] }]
    );
    expect(svc.canExecuteEvent(OTHER_EVENT_ID)).toBe(false);
  });

  it('returns false when no permissions are granted', () => {
    const svc = buildService([]);
    expect(svc.canExecuteEvent(EVENT_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// canEditEventTemplate
// ---------------------------------------------------------------------------

describe('PermissionDataService.canEditEventTemplate', () => {
  const TEMPLATE_ID = 'template-edit-123';
  const OTHER_TEMPLATE_ID = 'template-edit-999';

  it('returns true via system EditEventTemplates permission', () => {
    const svc = buildService([SystemPermission.EditEventTemplates]);
    expect(svc.canEditEventTemplate(TEMPLATE_ID)).toBe(true);
  });

  it('returns true via resource EditEventTemplate for the correct template ID', () => {
    const svc = buildService(
      [],
      [],
      [
        {
          eventTemplateId: TEMPLATE_ID,
          permissions: [EventTemplatePermission.EditEventTemplate],
        },
      ]
    );
    expect(svc.canEditEventTemplate(TEMPLATE_ID)).toBe(true);
  });

  it('returns false via resource permission for a different template ID', () => {
    const svc = buildService(
      [],
      [],
      [
        {
          eventTemplateId: TEMPLATE_ID,
          permissions: [EventTemplatePermission.EditEventTemplate],
        },
      ]
    );
    expect(svc.canEditEventTemplate(OTHER_TEMPLATE_ID)).toBe(false);
  });

  it('returns false when no permissions are granted', () => {
    const svc = buildService([]);
    expect(svc.canEditEventTemplate(TEMPLATE_ID)).toBe(false);
  });

  it('system EditEventTemplates overrides absence of resource permission', () => {
    const svc = buildService(
      [SystemPermission.EditEventTemplates],
      [],
      [
        {
          eventTemplateId: OTHER_TEMPLATE_ID,
          permissions: [EventTemplatePermission.ViewEventTemplate],
        },
      ]
    );
    expect(svc.canEditEventTemplate(TEMPLATE_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// canManageEventTemplate
// ---------------------------------------------------------------------------

describe('PermissionDataService.canManageEventTemplate', () => {
  const TEMPLATE_ID = 'template-manage-123';
  const OTHER_TEMPLATE_ID = 'template-manage-999';

  it('returns true via system ManageEventTemplates permission', () => {
    const svc = buildService([SystemPermission.ManageEventTemplates]);
    expect(svc.canManageEventTemplate(TEMPLATE_ID)).toBe(true);
  });

  it('returns true via resource ManageEventTemplate for the correct template ID', () => {
    const svc = buildService(
      [],
      [],
      [
        {
          eventTemplateId: TEMPLATE_ID,
          permissions: [EventTemplatePermission.ManageEventTemplate],
        },
      ]
    );
    expect(svc.canManageEventTemplate(TEMPLATE_ID)).toBe(true);
  });

  it('returns false via resource permission for a different template ID', () => {
    const svc = buildService(
      [],
      [],
      [
        {
          eventTemplateId: TEMPLATE_ID,
          permissions: [EventTemplatePermission.ManageEventTemplate],
        },
      ]
    );
    expect(svc.canManageEventTemplate(OTHER_TEMPLATE_ID)).toBe(false);
  });

  it('returns false when no permissions are granted', () => {
    const svc = buildService([]);
    expect(svc.canManageEventTemplate(TEMPLATE_ID)).toBe(false);
  });

  it('should return true when system ManageEventTemplates granted even when resource claim exists for another template', () => {
    const svc = buildService(
      [SystemPermission.ManageEventTemplates],
      [],
      [
        {
          eventTemplateId: OTHER_TEMPLATE_ID,
          permissions: [EventTemplatePermission.ViewEventTemplate],
        },
      ]
    );
    expect(svc.canManageEventTemplate(TEMPLATE_ID)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('PermissionDataService edge cases', () => {
  it('having resource ViewEvent does not grant canEditEvent', () => {
    const svc = buildService(
      [],
      [{ eventId: 'evt-1', permissions: [EventPermission.ViewEvent] }]
    );
    expect(svc.canEditEvent('evt-1')).toBe(false);
  });

  it('having resource ViewEventTemplate does not grant canEditEventTemplate', () => {
    const svc = buildService(
      [],
      [],
      [
        {
          eventTemplateId: 'tmpl-1',
          permissions: [EventTemplatePermission.ViewEventTemplate],
        },
      ]
    );
    expect(svc.canEditEventTemplate('tmpl-1')).toBe(false);
  });

  it('system ManageEvents grants canManageEvent regardless of resource claims', () => {
    const svc = buildService([SystemPermission.ManageEvents], []);
    expect(svc.canManageEvent('any-event-id')).toBe(true);
  });

  it('system ManageEventTemplates grants canManageEventTemplate for any template', () => {
    const svc = buildService([SystemPermission.ManageEventTemplates], [], []);
    expect(svc.canManageEventTemplate('any-template-id')).toBe(true);
  });

  it('empty permissions list returns false for all boolean checks', () => {
    const svc = buildService([], [], []);
    expect(svc.hasPermission(SystemPermission.ViewUsers)).toBe(false);
    expect(svc.canViewAdministration()).toBe(false);
    expect(svc.canCreateEventTemplates()).toBe(false);
    expect(svc.canCreateEvents()).toBe(false);
    expect(svc.canViewEventTemplateList()).toBe(false);
    expect(svc.canViewEventList()).toBe(false);
    expect(svc.canEditEvent('x')).toBe(false);
    expect(svc.canManageEvent('x')).toBe(false);
    expect(svc.canExecuteEvent('x')).toBe(false);
    expect(svc.canEditEventTemplate('x')).toBe(false);
    expect(svc.canManageEventTemplate('x')).toBe(false);
  });
});
