// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the eventTemplate root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { map, tap, take } from 'rxjs/operators';
import {
  EventPermission,
  EventPermissionClaim,
  EventPermissionsService,
  EventTemplatePermission,
  EventTemplatePermissionClaim,
  EventTemplatePermissionsService,
  SystemPermission,
  SystemPermissionsService,
} from 'src/app/generated/alloy.api';

@Injectable({
  providedIn: 'root',
})
export class PermissionDataService {
  private _permissions: SystemPermission[] = [];
  get permissions(): SystemPermission[] {
    return this._permissions;
  }

  private _eventPermissions: EventPermissionClaim[] = [];
  get eventPermissions(): EventPermissionClaim[] {
    return this._eventPermissions;
  }

  private _eventTemplatePermissions: EventTemplatePermissionClaim[] = [];
  get eventTemplatePermissions(): EventTemplatePermissionClaim[] {
    return this._eventTemplatePermissions;
  }

  constructor(
    private permissionsService: SystemPermissionsService,
    private eventPermissionsService: EventPermissionsService,
    private eventTemplatePermissionsService: EventTemplatePermissionsService
  ) {}

  load(): Observable<SystemPermission[]> {
    return this.permissionsService.getMySystemPermissions().pipe(
      take(1),
      tap((x) => (this._permissions = x))
    );
  }

  canViewAdiminstration() {
    return this._permissions.some((y) => y.startsWith('View'));
  }

  canViewEventTemplateList() {
    return this._permissions.some((y) => y.endsWith('EventTemplates'));
  }

  canViewEventList() {
    return this._permissions.some((y) => y.endsWith('Events'));
  }

  hasPermission(permission: SystemPermission) {
    return this._permissions.includes(permission);
  }

  loadEventPermissions(eventId?: string): Observable<EventPermissionClaim[]> {
    return this.eventPermissionsService.getMyEventPermissions(eventId).pipe(
      take(1),
      tap((x) => (this._eventPermissions = x))
    );
  }

  loadEventTemplatePermissions(
    eventTemplateId?: string
  ): Observable<EventTemplatePermissionClaim[]> {
    return this.eventTemplatePermissionsService
      .getMyEventTemplatePermissions(eventTemplateId)
      .pipe(
        take(1),
        tap((x) => (this._eventTemplatePermissions = x))
      );
  }

  canEditEvent(eventId: string): boolean {
    return this.canEvent(
      SystemPermission.EditEvents,
      eventId,
      EventPermission.EditEvent
    );
  }

  canEditEventTemplate(eventTemplateId: string): boolean {
    return this.canEventTemplate(
      SystemPermission.EditEventTemplates,
      eventTemplateId,
      EventTemplatePermission.EditEventTemplate
    );
  }

  canManageEvent(eventId: string): boolean {
    return this.canEvent(
      SystemPermission.ManageEvents,
      eventId,
      EventPermission.ManageEvent
    );
  }

  canManageEventTemplate(eventTemplateId: string): boolean {
    return this.canEventTemplate(
      SystemPermission.ManageEventTemplates,
      eventTemplateId,
      EventTemplatePermission.ManageEventTemplate
    );
  }

  canExecuteEvent(eventId: string): boolean {
    return this.canEvent(
      SystemPermission.ExecuteEvents,
      eventId,
      EventPermission.ExecuteEvent
    );
  }

  private canEvent(
    permission: SystemPermission,
    eventId?: string,
    eventPermission?: EventPermission
  ) {
    const permissions = this._permissions;
    const eventPermissionClaims = this._eventPermissions;
    if (permissions.includes(permission)) {
      return true;
    } else if (eventId !== null && eventPermission !== null) {
      const eventPermissionClaim = eventPermissionClaims.find(
        (x) => x.eventId === eventId
      );

      if (
        eventPermissionClaim &&
        eventPermissionClaim.permissions.includes(eventPermission)
      ) {
        return true;
      }
    }

    return false;
  }

  private canEventTemplate(
    permission: SystemPermission,
    eventTemplateId?: string,
    eventTemplatePermission?: EventTemplatePermission
  ) {
    const permissions = this._permissions;
    const eventTemplatePermissionClaims = this._eventTemplatePermissions;
    if (permissions.includes(permission)) {
      return true;
    } else if (eventTemplateId !== null && eventTemplatePermission !== null) {
      const eventTemplatePermissionClaim = eventTemplatePermissionClaims.find(
        (x) => x.eventTemplateId === eventTemplateId
      );

      if (
        eventTemplatePermissionClaim &&
        eventTemplatePermissionClaim.permissions.includes(
          eventTemplatePermission
        )
      ) {
        return true;
      }
    }

    return false;
  }
}
