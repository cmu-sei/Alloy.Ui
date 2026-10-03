// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { EMPTY, of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  CrucibleDialogService,
  CrucibleThemeService,
} from '@cmusei/crucible-common';
import { AnyProvider, mergeProviders, unstubbed } from './unstubbed';

// 1. App services that components inject. Stores, queries and data services
//    (src/app/data, including PermissionDataService) stay REAL: they are the
//    state under test.
import { SignalRService } from '../shared/signalr/signalr.service';

// 2. Every generated API service under src/app/generated/alloy.api.
import {
  CasterService,
  EventMembershipsService,
  EventPermissionsService,
  EventRolesService,
  EventService,
  EventTemplateMembershipsService,
  EventTemplatePermissionsService,
  EventTemplateRolesService,
  EventTemplateService,
  GroupPermissionsService,
  GroupService,
  HealthService,
  PlayerService,
  SteamfitterService,
  SystemPermissionsService,
  SystemRolesService,
  UserService,
} from '../generated/alloy.api';

// 3. RouterQuery: not used. alloy.ui lists @datorama/akita-ng-router-store in
//    package.json but imports nothing from it.

// 4. BASE_PATH: not injected by any data or hub service (app.module.ts
//    provides it to the generated ApiModule only).

// 5. Common-library services the app injects: CrucibleDialogService (admin
//    and event components) and CrucibleThemeService (app.component.ts).

export function getDefaultProviders(
  overrides?: readonly AnyProvider[],
): AnyProvider[] {
  const defaults: AnyProvider[] = [
    // App services
    unstubbed(SignalRService),

    // Common-library services the app injects. They are providedIn: 'root',
    // so each one left out here would be built for real in every spec.
    unstubbed(CrucibleDialogService),
    unstubbed(CrucibleThemeService),

    // Generated API services: one `unstubbed(...)` per service. A test that
    // needs an endpoint passes `{ provide: XService, useValue: xApi }` built
    // with `satisfies ApiStub<XService>`. The four permission services are
    // usually supplied by `permissionDataProviders(grants)`.
    unstubbed(CasterService),
    unstubbed(EventMembershipsService),
    unstubbed(EventPermissionsService),
    unstubbed(EventRolesService),
    unstubbed(EventService),
    unstubbed(EventTemplateMembershipsService),
    unstubbed(EventTemplatePermissionsService),
    unstubbed(EventTemplateRolesService),
    unstubbed(EventTemplateService),
    unstubbed(GroupPermissionsService),
    unstubbed(GroupService),
    unstubbed(HealthService),
    unstubbed(PlayerService),
    unstubbed(SteamfitterService),
    unstubbed(SystemPermissionsService),
    unstubbed(SystemRolesService),
    unstubbed(UserService),

    // Common library
    {
      provide: ComnSettingsService,
      useValue: {
        settings: {
          ApiUrl: '',
          // 6. The keys alloy.ui reads from settings.json, with neutral values.
          AppTitle: '',
          AppTopBarText: '',
          AppTopBarHexColor: '#000000',
          AppTopBarHexTextColor: '#FFFFFF',
          PlayerUIAddress: '',
          CasterUIAddress: '',
          PollingIntervalMS: 0,
        },
      },
    },
    {
      provide: ComnAuthService,
      useValue: {
        isAuthenticated$: of(true),
        // UserDataService.setCurrentUser() reads user.profile.
        user$: of({ profile: { sub: '' } }),
        logout: () => {},
      },
    },
    {
      provide: ComnAuthQuery,
      useValue: {
        userTheme$: of('light-theme'),
        isLoggedIn$: of(true),
      },
    },

    // Dialog tokens
    { provide: MAT_DIALOG_DATA, useValue: {} },
    {
      provide: MatDialogRef,
      useValue: {
        close: () => {},
        beforeClosed: () => EMPTY,
        afterClosed: () => EMPTY,
        keydownEvents: () => EMPTY,
      },
    },

    // Router
    {
      provide: ActivatedRoute,
      useValue: {
        params: of({}),
        paramMap: of(convertToParamMap({})),
        queryParams: of({}),
        queryParamMap: of(convertToParamMap({})),
        snapshot: {
          params: {},
          paramMap: convertToParamMap({}),
          queryParams: {},
          queryParamMap: convertToParamMap({}),
        },
      },
    },
  ];

  return mergeProviders(defaults, overrides);
}
