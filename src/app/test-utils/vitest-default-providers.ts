// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Provider } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, BehaviorSubject, EMPTY } from 'rxjs';

// --- Akita Stores ---
import { EventStore } from 'src/app/data/event/event.store';
import { EventTemplateStore } from 'src/app/data/event-template/event-template.store';
import { UserStore, CurrentUserStore } from 'src/app/data/user/user.store';
import { UserEventsStore } from 'src/app/data/event/user-events.store';

// --- Akita Queries ---
import { EventQuery } from 'src/app/data/event/event.query';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { UserQuery, CurrentUserQuery } from 'src/app/data/user/user.query';
import { UserEventsQuery } from 'src/app/data/event/user-events.query';

// --- Application Data Services ---
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventTemplateMembershipDataService } from 'src/app/data/event-template/event-template-membership-data.service';
import { EventTemplateRoleDataService } from 'src/app/data/event-template/event-template-role-data.service';
import { EventMembershipDataService } from 'src/app/data/event/event-membership-data.service';
import { EventRoleDataService } from 'src/app/data/event/event-role-data.service';
import { EventRoleService } from 'src/app/data/event/event-role.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { GroupMembershipService } from 'src/app/data/group/group-membership.service';
import { SteamfitterDataService } from 'src/app/data/steamfitter/steamfitter-data.service';

// --- Application Services ---
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { ConfirmDialogService } from 'src/app/components/shared/confirm-dialog/service/confirm-dialog.service';

// --- Generated API Services ---
import {
  CasterService,
  EventService,
  EventMembershipsService,
  EventPermissionsService,
  EventRolesService,
  EventTemplateService,
  EventTemplateMembershipsService,
  EventTemplatePermissionsService,
  EventTemplateRolesService,
  GroupService,
  HealthService,
  PlayerService,
  SteamfitterService,
  SystemPermissionsService,
  SystemRolesService,
  UserService,
  BASE_PATH,
} from 'src/app/generated/alloy.api';

// --- Crucible Common ---
import {
  ComnAuthService,
  ComnAuthQuery,
  ComnSettingsService,
} from '@cmusei/crucible-common';

// --- Akita Router ---
import { RouterQuery } from '@datorama/akita-ng-router-store';

/**
 * Returns mock providers for all injectables in the Alloy app.
 * Tests can override individual providers by passing them in the `providers` array.
 */
export function getDefaultProviders(): Provider[] {
  return [
    // Akita Stores
    { provide: EventStore, useValue: {} },
    { provide: EventTemplateStore, useValue: {} },
    { provide: UserStore, useValue: {} },
    { provide: CurrentUserStore, useValue: {} },
    { provide: UserEventsStore, useValue: {} },

    // Akita Queries
    {
      provide: EventQuery,
      useValue: {
        selectAll: () => of([]),
        selectEntity: () => of(undefined),
        selectLoading: () => of(false),
      },
    },
    {
      provide: EventTemplateQuery,
      useValue: {
        selectAll: () => of([]),
        selectEntity: () => of(undefined),
        selectLoading: () => of(false),
        selectById: () => of(undefined),
      },
    },
    {
      provide: UserQuery,
      useValue: {
        selectAll: () => of([]),
        selectEntity: () => of(undefined),
        isLoading$: of(false),
        selectByUserId: () => of(undefined),
      },
    },
    {
      provide: CurrentUserQuery,
      useValue: {
        select: () => of({ name: 'Test User', id: 'test-user-id', theme: 'LIGHT', lastRoute: '/' }),
        userTheme$: of('LIGHT'),
        getLastRoute: () => '/',
      },
    },
    {
      provide: UserEventsQuery,
      useValue: {
        selectAll: () => of([]),
        userEventsByTemplateId$: () => of([]),
      },
    },

    // Akita Router Query
    {
      provide: RouterQuery,
      useValue: {
        selectParams: () => of({}),
        selectQueryParams: () => of({}),
        select: () => of({}),
      },
    },

    // Application Data Services
    {
      provide: EventDataService,
      useValue: {
        loadEvents: () => of([]),
        launchEvent: () => of({}),
        endEvent: () => {},
        redeployEvent: () => {},
        stateCreate: () => {},
        stateUpdate: () => {},
        stateDelete: () => {},
        getAllEvents: () => of([]),
        getTemplateEvents: () => of([]),
        getUserEvents: () => of([]),
        getEvent: () => of({}),
        inviteEvent: () => of(''),
        enlistEvent: () => of({}),
      },
    },
    {
      provide: EventTemplateDataService,
      useValue: {
        loadTemplates: () => {},
        loadTemplate: () => {},
        addNew: () => of({}),
        update: () => {},
        delete: () => {},
        stateCreate: () => {},
        stateUpdate: () => {},
        stateDelete: () => {},
      },
    },
    {
      provide: EventTemplateMembershipDataService,
      useValue: {
        loadMemberships: () => of([]),
        createMembership: () => of({}),
        editMembership: () => of({}),
        deleteMembership: () => of(undefined),
        eventTemplateMemberships$: of([]),
        updateStore: () => {},
        deleteFromStore: () => {},
      },
    },
    {
      provide: EventTemplateRoleDataService,
      useValue: {
        loadRoles: () => of([]),
        eventTemplateRoles$: of([]),
      },
    },
    {
      provide: EventMembershipDataService,
      useValue: {
        loadMemberships: () => of([]),
        createMembership: () => of({}),
        editMembership: () => of({}),
        deleteMembership: () => of(undefined),
        eventMemberships$: of([]),
        updateStore: () => {},
        deleteFromStore: () => {},
      },
    },
    {
      provide: EventRoleDataService,
      useValue: {
        loadRoles: () => of([]),
        eventRoles$: of([]),
      },
    },
    {
      provide: EventRoleService,
      useValue: {
        loadRoles: () => of([]),
        eventRoles$: of([]),
      },
    },
    {
      provide: UserDataService,
      useValue: {
        load: () => of([]),
        loadById: () => of({}),
        create: () => of({}),
        update: () => {},
        delete: () => of(undefined),
        setCurrentUser: () => {},
        setUserTheme: () => {},
        setActive: () => {},
      },
    },
    {
      provide: PermissionDataService,
      useValue: {
        load: () => of([]),
        permissions: [],
        canCreateEventTemplates: () => false,
        canCreateEvents: () => false,
        canViewAdiminstration: () => false,
        canViewEventTemplateList: () => false,
        canViewEventList: () => false,
        hasPermission: () => false,
        loadEventPermissions: () => of([]),
        loadEventTemplatePermissions: () => of([]),
        canEditEvent: () => false,
        canEditEventTemplate: () => false,
        canManageEvent: () => false,
        canManageEventTemplate: () => false,
        canExecuteEvent: () => false,
      },
    },
    {
      provide: RoleDataService,
      useValue: {
        getRoles: () => of([]),
        editRole: () => of({}),
        createRole: () => of({}),
        deleteRole: () => of(undefined),
        roles$: of([]),
      },
    },
    {
      provide: GroupDataService,
      useValue: {
        load: () => of([]),
        create: () => of({}),
        edit: () => of({}),
        delete: () => of(undefined),
        groups$: of([]),
      },
    },
    {
      provide: GroupMembershipService,
      useValue: {
        selectMemberships: () => of([]),
        loadMemberships: () => of([]),
        createMembership: () => of({}),
        deleteMembership: () => of(undefined),
        groupMemberships$: of([]),
        updateStore: () => {},
        deleteFromStore: () => {},
      },
    },
    {
      provide: SteamfitterDataService,
      useValue: {
        scenarioTemplates: new BehaviorSubject([]),
        scenarioTemplateList: of([]),
        scenarioTemplateFilter: { valueChanges: EMPTY },
        selectedScenarioTemplate: of(undefined),
        getScenarioTemplatesFromApi: () => {},
        selectScenarioTemplate: () => {},
      },
    },

    // Application Services
    {
      provide: SignalRService,
      useValue: {
        startConnection: () => Promise.resolve(),
        joinEvent: () => {},
        leaveEvent: () => {},
        joinAdmin: () => {},
        leaveAdmin: () => {},
      },
    },
    {
      provide: DialogService,
      useValue: {
        confirm: () => of(true),
      },
    },
    {
      provide: ConfirmDialogService,
      useValue: {
        confirmDialog: () => of({}),
      },
    },

    // Generated API Services
    { provide: CasterService, useValue: {} },
    { provide: EventService, useValue: {} },
    { provide: EventMembershipsService, useValue: {} },
    { provide: EventPermissionsService, useValue: {} },
    { provide: EventRolesService, useValue: {} },
    { provide: EventTemplateService, useValue: {} },
    { provide: EventTemplateMembershipsService, useValue: {} },
    { provide: EventTemplatePermissionsService, useValue: {} },
    { provide: EventTemplateRolesService, useValue: {} },
    { provide: GroupService, useValue: {} },
    { provide: HealthService, useValue: {} },
    { provide: PlayerService, useValue: {} },
    { provide: SteamfitterService, useValue: {} },
    { provide: SystemPermissionsService, useValue: {} },
    { provide: SystemRolesService, useValue: {} },
    { provide: UserService, useValue: {} },
    { provide: BASE_PATH, useValue: 'http://localhost:4402' },

    // Crucible Common
    {
      provide: ComnAuthService,
      useValue: {
        user$: of(null),
        isAuthenticated$: of(true),
        getAuthorizationToken: () => 'mock-token',
        logout: () => {},
        setUserTheme: () => {},
      },
    },
    {
      provide: ComnAuthQuery,
      useValue: {
        userTheme$: of('LIGHT'),
        isAuthenticated$: of(true),
      },
    },
    {
      provide: ComnSettingsService,
      useValue: {
        settings: {
          ApiUrl: 'http://localhost:4402',
          OIDCSettings: {},
        },
      },
    },

    // Angular Router
    {
      provide: Router,
      useValue: {
        navigate: () => Promise.resolve(true),
        navigateByUrl: () => Promise.resolve(true),
        events: EMPTY,
        routerState: { root: {} },
      },
    },
    {
      provide: ActivatedRoute,
      useValue: {
        params: of({}),
        queryParams: of({}),
        queryParamMap: of({ get: () => null }),
        paramMap: of({ get: () => null }),
        snapshot: { params: {}, queryParams: {} },
      },
    },

    // Dialog tokens
    { provide: MAT_DIALOG_DATA, useValue: {} },
    { provide: MatDialogRef, useValue: { close: () => {}, disableClose: false } },
  ];
}
