// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

// Provides alloy.ui's REAL PermissionDataService over stubbed "my permissions"
// endpoints, so the gate logic under test (system permission first, then the
// event, event-template or group claim) is the production code rather than a
// re-implementation that can drift from it.

import { Provider } from '@angular/core';
import { vi } from 'vitest';
import { of, throwError } from 'rxjs';
import {
  EventPermissionClaim,
  EventPermissionsService,
  EventTemplatePermissionClaim,
  EventTemplatePermissionsService,
  GroupPermissionsClaim,
  GroupPermissionsService,
  SystemPermission,
  SystemPermissionsService,
} from '../generated/alloy.api';
import { PermissionDataService } from '../data/permission/permission-data.service';
import { ApiStub } from './api-stub';

export interface PermissionGrants {
  system?: SystemPermission[];
  events?: EventPermissionClaim[];
  eventTemplates?: EventTemplatePermissionClaim[];
  groups?: GroupPermissionsClaim[];
}

export function permissionApiStubs(grants: PermissionGrants = {}) {
  return {
    systemPermissions: {
      getMySystemPermissions: vi.fn(() => of(grants.system ?? [])),
    } satisfies ApiStub<SystemPermissionsService>,
    eventPermissions: {
      getMyEventPermissions: vi.fn((_eventId?: string) =>
        of(grants.events ?? []),
      ),
    } satisfies ApiStub<EventPermissionsService>,
    eventTemplatePermissions: {
      getMyEventTemplatePermissions: vi.fn((_eventTemplateId?: string) =>
        of(grants.eventTemplates ?? []),
      ),
    } satisfies ApiStub<EventTemplatePermissionsService>,
    groupPermissions: {
      getMyGroupPermissions: vi.fn(() => of(grants.groups ?? [])),
    } satisfies ApiStub<GroupPermissionsService>,
  };
}

export function permissionDataProviders(
  grants: PermissionGrants = {},
): Provider[] {
  const stubs = permissionApiStubs(grants);
  return [
    { provide: SystemPermissionsService, useValue: stubs.systemPermissions },
    { provide: EventPermissionsService, useValue: stubs.eventPermissions },
    {
      provide: EventTemplatePermissionsService,
      useValue: stubs.eventTemplatePermissions,
    },
    { provide: GroupPermissionsService, useValue: stubs.groupPermissions },
    {
      provide: PermissionDataService,
      // PermissionDataService takes its dependencies through inject(), so the
      // factory constructs it in this injection context and it resolves the
      // stubs above (or a test's own override).
      useFactory: () => {
        const service = new PermissionDataService();
        // Primed eagerly: several admin components read hasPermission() in a
        // field initializer, before any ngOnInit load() could have run. The
        // stubs are synchronous, so these complete before the factory returns.
        service.load().subscribe();
        service.loadEventPermissions().subscribe();
        service.loadEventTemplatePermissions().subscribe();
        service.loadGroupPermissions().subscribe();
        return service;
      },
    },
  ];
}

/**
 * The REAL PermissionDataService, not primed, over "my permissions" endpoints
 * whose system-permission request fails with `failure` (the other three
 * answer with no claims). For components that load permissions themselves:
 * it pins what the component does when that load fails.
 */
export function failingPermissionProviders(failure: unknown): Provider[] {
  const stubs = permissionApiStubs();
  stubs.systemPermissions.getMySystemPermissions.mockReturnValue(
    throwError(() => failure),
  );
  return [
    { provide: SystemPermissionsService, useValue: stubs.systemPermissions },
    { provide: EventPermissionsService, useValue: stubs.eventPermissions },
    {
      provide: EventTemplatePermissionsService,
      useValue: stubs.eventTemplatePermissions,
    },
    { provide: GroupPermissionsService, useValue: stubs.groupPermissions },
    PermissionDataService,
  ];
}
