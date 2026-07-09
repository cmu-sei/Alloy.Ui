// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the eventTemplate root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, shareReplay, tap, take } from 'rxjs/operators';
import {
  EventPermission,
  EventPermissionClaim,
  EventPermissionsService,
  EventTemplatePermission,
  EventTemplatePermissionClaim,
  EventTemplatePermissionsService,
  GroupPermission,
  GroupPermissionsClaim,
  GroupPermissionsService,
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

  private _groupPermissions: GroupPermissionsClaim[] = [];
  get groupPermissions(): GroupPermissionsClaim[] {
    return this._groupPermissions;
  }

  private groupPermissionsSubject = new BehaviorSubject<GroupPermissionsClaim[]>(
    []
  );
  groupPermissions$ = this.groupPermissionsSubject.asObservable();
  private groupPermissionsCache: Observable<GroupPermissionsClaim[]> | null =
    null;

  constructor(
    private permissionsService: SystemPermissionsService,
    private eventPermissionsService: EventPermissionsService,
    private eventTemplatePermissionsService: EventTemplatePermissionsService,
    private groupPermissionsService: GroupPermissionsService
  ) {}

  load(): Observable<SystemPermission[]> {
    return this.permissionsService.getMySystemPermissions().pipe(
      take(1),
      tap((x) => (this._permissions = x))
    );
  }

  canCreateEventTemplates() {
    return this._permissions.some((y) => y.startsWith('CreateEventTemplates'));
  }

  canCreateEvents() {
    return this._permissions.some((y) => y.startsWith('CreateEvents'));
  }

  canViewAdministration() {
    return (
      this._permissions.some((y) => y.startsWith('View')) ||
      this.hasManageMembershipClaim(this._groupPermissions)
    );
  }

  canViewGroupsAdmin() {
    return (
      this._permissions.includes(SystemPermission.ViewGroups) ||
      this.hasManageMembershipClaim(this._groupPermissions)
    );
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

  loadGroupPermissions(
    forceReload = false
  ): Observable<GroupPermissionsClaim[]> {
    if (this.groupPermissionsCache && !forceReload) {
      return this.groupPermissionsCache;
    }

    this.groupPermissionsCache = this.groupPermissionsService
      .getMyGroupPermissions()
      .pipe(
        take(1),
        tap((x) => {
          this._groupPermissions = x;
          this.groupPermissionsSubject.next(x);
        }),
        catchError((err) => {
          this.groupPermissionsCache = null;
          return throwError(() => err);
        }),
        shareReplay(1)
      );

    return this.groupPermissionsCache;
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

  canManageGroup(groupId: string): boolean {
    return this.canGroup(
      SystemPermission.ManageGroups,
      groupId,
      GroupPermission.ManageMembership
    );
  }

  canEditGroup(groupId: string): boolean {
    return this.canGroup(
      SystemPermission.ManageGroups,
      groupId,
      GroupPermission.EditGroup
    );
  }

  private hasManageMembershipClaim(
    groupPermissionClaims: GroupPermissionsClaim[]
  ): boolean {
    return groupPermissionClaims.some((x) =>
      x.permissions?.includes(GroupPermission.ManageMembership)
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

  private canGroup(
    permission: SystemPermission,
    groupId?: string,
    groupPermission?: GroupPermission
  ) {
    const permissions = this._permissions;
    const groupPermissionClaims = this._groupPermissions;
    if (permissions.includes(permission)) {
      return true;
    } else if (groupId != null && groupPermission != null) {
      const groupPermissionClaim = groupPermissionClaims.find(
        (x) => x.groupId === groupId
      );

      if (
        groupPermissionClaim &&
        groupPermissionClaim.permissions?.includes(groupPermission)
      ) {
        return true;
      }
    }

    return false;
  }
}
