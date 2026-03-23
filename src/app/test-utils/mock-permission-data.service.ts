// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Provider } from '@angular/core';
import { of } from 'rxjs';
import {
  EventPermission,
  EventPermissionClaim,
  EventTemplatePermission,
  EventTemplatePermissionClaim,
  SystemPermission,
} from '../generated/alloy.api';
import { PermissionDataService } from '../data/permission/permission-data.service';

export function permissionProvider(
  systemPerms: SystemPermission[] = [],
  eventPerms: EventPermissionClaim[] = [],
  eventTemplatePerms: EventTemplatePermissionClaim[] = []
): Provider {
  return {
    provide: PermissionDataService,
    useValue: {
      permissions: systemPerms,
      eventPermissions: eventPerms,
      eventTemplatePermissions: eventTemplatePerms,

      load: () => of(systemPerms),
      loadEventPermissions: (_eventId?: string) => of(eventPerms),
      loadEventTemplatePermissions: (_eventTemplateId?: string) =>
        of(eventTemplatePerms),

      hasPermission: (p: SystemPermission) => systemPerms.includes(p),

      canViewAdministration: () =>
        systemPerms.some((y) => y.startsWith('View')),

      canCreateEventTemplates: () =>
        systemPerms.includes(SystemPermission.CreateEventTemplates),

      canCreateEvents: () =>
        systemPerms.includes(SystemPermission.CreateEvents),

      canViewEventTemplateList: () =>
        systemPerms.some((y) => y.endsWith('EventTemplates')),

      canViewEventList: () => systemPerms.some((y) => y.endsWith('Events')),

      canEditEvent: (eventId: string) =>
        systemPerms.includes(SystemPermission.EditEvents) ||
        eventPerms.some(
          (c) =>
            c.eventId === eventId &&
            c.permissions?.includes(EventPermission.EditEvent)
        ),

      canManageEvent: (eventId: string) =>
        systemPerms.includes(SystemPermission.ManageEvents) ||
        eventPerms.some(
          (c) =>
            c.eventId === eventId &&
            c.permissions?.includes(EventPermission.ManageEvent)
        ),

      canExecuteEvent: (eventId: string) =>
        systemPerms.includes(SystemPermission.ExecuteEvents) ||
        eventPerms.some(
          (c) =>
            c.eventId === eventId &&
            c.permissions?.includes(EventPermission.ExecuteEvent)
        ),

      canEditEventTemplate: (eventTemplateId: string) =>
        systemPerms.includes(SystemPermission.EditEventTemplates) ||
        eventTemplatePerms.some(
          (c) =>
            c.eventTemplateId === eventTemplateId &&
            c.permissions?.includes(EventTemplatePermission.EditEventTemplate)
        ),

      canManageEventTemplate: (eventTemplateId: string) =>
        systemPerms.includes(SystemPermission.ManageEventTemplates) ||
        eventTemplatePerms.some(
          (c) =>
            c.eventTemplateId === eventTemplateId &&
            c.permissions?.includes(EventTemplatePermission.ManageEventTemplate)
        ),
    },
  };
}
