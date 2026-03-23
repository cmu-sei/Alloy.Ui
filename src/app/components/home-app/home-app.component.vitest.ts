// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { EMPTY, of } from 'rxjs';
import { HomeAppComponent } from './home-app.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { SystemPermission } from 'src/app/generated/alloy.api';
import { Router } from '@angular/router';
import { RouterModule } from '@angular/router';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal ComnSettingsService mock that includes the properties used by HomeAppComponent */
const settingsMock = {
  provide: ComnSettingsService,
  useValue: {
    settings: {
      AppTopBarText: 'Alloy Test',
      AppTitle: 'Alloy',
      ApiUrl: 'http://localhost:4402',
      OIDCSettings: {},
    },
  },
};

/** EventDataService that returns empty observables so the router combineLatest never fires */
const eventDataMock = {
  provide: EventDataService,
  useValue: {
    getViewEvents: (_viewId: string) => of([]),
    getUserEvents: () => of([]),
    loadEvents: () => of([]),
    launchEvent: () => of({}),
    endEvent: () => {},
    redeployEvent: () => {},
    stateCreate: () => {},
    stateUpdate: () => {},
    stateDelete: () => {},
    getAllEvents: () => of([]),
    getTemplateEvents: () => of([]),
    getEvent: () => of({}),
    inviteEvent: () => of(''),
    enlistEvent: () => of({}),
  },
};

/** RouterQuery that never emits a viewId param so the router pipeline stays idle */
const routerQueryMock = {
  provide: RouterQuery,
  useValue: {
    selectParams: (_key: string) => EMPTY,
    selectQueryParams: () => EMPTY,
    select: () => EMPTY,
  },
};

/** UserDataService mock */
const userDataMock = {
  provide: UserDataService,
  useValue: {
    setCurrentUser: () => {},
    load: () => of([]),
    loadById: () => of({}),
    create: () => of({}),
    update: () => {},
    delete: () => of(undefined),
    setUserTheme: () => {},
    setActive: () => {},
  },
};

/** Router mock */
const routerMock = {
  provide: Router,
  useValue: {
    navigate: () => Promise.resolve(true),
    navigateByUrl: () => Promise.resolve(true),
    events: EMPTY,
    routerState: { root: {} },
    createUrlTree: () => ({}),
    serializeUrl: () => '',
  },
};

async function renderHomeApp(
  permissionDataServiceValue: Partial<PermissionDataService>
) {
  const permMock = {
    provide: PermissionDataService,
    useValue: permissionDataServiceValue,
  };

  return renderComponent(HomeAppComponent, {
    declarations: [HomeAppComponent],
    providers: [
      settingsMock,
      eventDataMock,
      routerQueryMock,
      userDataMock,
      routerMock,
      permMock,
    ],
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HomeAppComponent', () => {
  it('renders without error', async () => {
    await renderHomeApp({
      permissions: [],
      load: () => of([]),
      loadEventPermissions: () => of([]),
      loadEventTemplatePermissions: () => of([]),
      hasPermission: () => false,
      canViewAdministration: () => false,
      canCreateEventTemplates: () => false,
      canCreateEvents: () => false,
      canViewEventTemplateList: () => false,
      canViewEventList: () => false,
      canEditEvent: () => false,
      canManageEvent: () => false,
      canExecuteEvent: () => false,
      canEditEventTemplate: () => false,
      canManageEventTemplate: () => false,
    });

    // Component should render its container element
    expect(document.querySelector('.app-events-container')).not.toBeNull();
  });

  it('does not show the administration button when canViewAdministration returns false', async () => {
    await renderHomeApp({
      permissions: [],
      load: () => of([]),
      loadEventPermissions: () => of([]),
      loadEventTemplatePermissions: () => of([]),
      hasPermission: () => false,
      canViewAdministration: () => false,
      canCreateEventTemplates: () => false,
      canCreateEvents: () => false,
      canViewEventTemplateList: () => false,
      canViewEventList: () => false,
      canEditEvent: () => false,
      canManageEvent: () => false,
      canExecuteEvent: () => false,
      canEditEventTemplate: () => false,
      canManageEventTemplate: () => false,
    });

    expect(
      screen.queryByRole('button', { name: /Show Administration Page/i })
    ).toBeNull();
    expect(screen.queryByTitle('Administration')).toBeNull();
  });

  it('shows the administration button when user has a View* system permission', async () => {
    const viewPerms: SystemPermission[] = [SystemPermission.ViewUsers];

    await renderHomeApp({
      permissions: viewPerms,
      load: () => of(viewPerms),
      loadEventPermissions: () => of([]),
      loadEventTemplatePermissions: () => of([]),
      hasPermission: (p: SystemPermission) => viewPerms.includes(p),
      canViewAdministration: () => true,
      canCreateEventTemplates: () => false,
      canCreateEvents: () => false,
      canViewEventTemplateList: () => true,
      canViewEventList: () => false,
      canEditEvent: () => false,
      canManageEvent: () => false,
      canExecuteEvent: () => false,
      canEditEventTemplate: () => false,
      canManageEventTemplate: () => false,
    });

    const adminButton = screen.getByRole('button', {
      name: /Show Administration Page/i,
    });
    expect(adminButton).toBeTruthy();
  });

  it('shows the administration button when user has ViewRoles permission', async () => {
    const viewPerms: SystemPermission[] = [SystemPermission.ViewRoles];

    await renderHomeApp({
      permissions: viewPerms,
      load: () => of(viewPerms),
      loadEventPermissions: () => of([]),
      loadEventTemplatePermissions: () => of([]),
      hasPermission: (p: SystemPermission) => viewPerms.includes(p),
      canViewAdministration: () => true,
      canCreateEventTemplates: () => false,
      canCreateEvents: () => false,
      canViewEventTemplateList: () => false,
      canViewEventList: () => false,
      canEditEvent: () => false,
      canManageEvent: () => false,
      canExecuteEvent: () => false,
      canEditEventTemplate: () => false,
      canManageEventTemplate: () => false,
    });

    expect(
      screen.getByRole('button', { name: /Show Administration Page/i })
    ).toBeTruthy();
  });

  it('hides the administration button when only non-View permissions are present', async () => {
    const nonViewPerms: SystemPermission[] = [
      SystemPermission.ManageUsers,
      SystemPermission.CreateEvents,
    ];

    await renderHomeApp({
      permissions: nonViewPerms,
      load: () => of(nonViewPerms),
      loadEventPermissions: () => of([]),
      loadEventTemplatePermissions: () => of([]),
      hasPermission: (p: SystemPermission) => nonViewPerms.includes(p),
      canViewAdministration: () => false,
      canCreateEventTemplates: () => false,
      canCreateEvents: () => true,
      canViewEventTemplateList: () => false,
      canViewEventList: () => false,
      canEditEvent: () => false,
      canManageEvent: () => false,
      canExecuteEvent: () => false,
      canEditEventTemplate: () => false,
      canManageEventTemplate: () => false,
    });

    expect(
      screen.queryByRole('button', { name: /Show Administration Page/i })
    ).toBeNull();
  });
});
