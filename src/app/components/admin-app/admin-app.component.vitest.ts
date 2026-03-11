// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import { of } from 'rxjs';
import { AdminAppComponent } from './admin-app.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/alloy.api';
import { RouterQuery } from '@datorama/akita-ng-router-store';

function mockPermissionService(permissions: SystemPermission[] = []) {
  return {
    provide: PermissionDataService,
    useValue: {
      load: () => of(permissions),
      permissions,
      hasPermission: (p: SystemPermission) => permissions.includes(p),
      canViewAdiminstration: () =>
        permissions.some((p) => p.toString().startsWith('View')),
      canCreateEventTemplates: () => false,
      canCreateEvents: () => false,
    },
  };
}

async function renderAdmin(permissions: SystemPermission[] = []) {
  return renderComponent(AdminAppComponent, {
    declarations: [AdminAppComponent],
    providers: [
      mockPermissionService(permissions),
      {
        provide: RouterQuery,
        useValue: {
          selectQueryParams: () => of(null),
        },
      },
    ],
  });
}

describe('AdminAppComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderAdmin();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display "Administration" header', async () => {
    await renderAdmin([SystemPermission.ViewUsers]);
    expect(screen.getByText('Administration')).toBeInTheDocument();
  });

  it('should show Event Templates nav item when permissions exist', async () => {
    await renderAdmin([SystemPermission.ViewUsers]);
    expect(screen.getByText('Event Templates')).toBeInTheDocument();
  });

  it('should show Events nav item when permissions exist', async () => {
    await renderAdmin([SystemPermission.ViewUsers]);
    expect(screen.getByText('Events')).toBeInTheDocument();
  });

  it('should show Users nav when ViewUsers permission present', async () => {
    await renderAdmin([SystemPermission.ViewUsers]);
    expect(screen.getByText('Users')).toBeInTheDocument();
  });

  it('should hide Users nav when ViewUsers permission absent', async () => {
    await renderAdmin([SystemPermission.ViewRoles]);
    expect(screen.queryByText('Users')).toBeNull();
  });

  it('should show Roles nav when ViewRoles permission present', async () => {
    await renderAdmin([SystemPermission.ViewRoles]);
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('should hide Roles nav when ViewRoles permission absent', async () => {
    await renderAdmin([SystemPermission.ViewUsers]);
    expect(screen.queryByText('Roles')).toBeNull();
  });

  it('should show Groups nav when ViewGroups permission present', async () => {
    await renderAdmin([SystemPermission.ViewGroups]);
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  it('should hide Groups nav when ViewGroups permission absent', async () => {
    await renderAdmin([SystemPermission.ViewUsers]);
    expect(screen.queryByText('Groups')).toBeNull();
  });

  it('should show all nav items when all permissions present', async () => {
    await renderAdmin([
      SystemPermission.ViewUsers,
      SystemPermission.ViewRoles,
      SystemPermission.ViewGroups,
    ]);
    expect(screen.getByText('Event Templates')).toBeInTheDocument();
    expect(screen.getByText('Events')).toBeInTheDocument();
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Roles')).toBeInTheDocument();
    expect(screen.getByText('Groups')).toBeInTheDocument();
  });

  it('should show no permission-gated nav items when no permissions', async () => {
    await renderAdmin([]);
    expect(screen.queryByText('Users')).toBeNull();
    expect(screen.queryByText('Roles')).toBeNull();
    expect(screen.queryByText('Groups')).toBeNull();
  });

  it('should default to showing Event Templates section', async () => {
    const { fixture } = await renderAdmin([SystemPermission.ViewUsers]);
    expect(fixture.componentInstance.showStatus).toBe('Event Templates');
  });

  it('should have sidebar open by default', async () => {
    const { fixture } = await renderAdmin([SystemPermission.ViewUsers]);
    expect(fixture.componentInstance.isSidebarOpen).toBe(true);
  });
});
