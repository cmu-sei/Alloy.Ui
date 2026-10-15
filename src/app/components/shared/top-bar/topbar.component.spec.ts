// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { CurrentUserStore } from 'src/app/data/user/user.store';
import {
  failingPermissionProviders,
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { AnyProvider } from 'src/app/test-utils/unstubbed';
import { TopbarComponent } from './topbar.component';
import { TopbarView } from './topbar.models';

async function renderTopbar(
  overrides: {
    topbarView?: TopbarView;
    team?: { id: string; name: string; canManage: boolean };
    grants?: PermissionGrants;
    providers?: AnyProvider[];
  } = {},
) {
  const logout = vi.fn();
  const setUserTheme = vi.fn();
  const auth: Pick<ComnAuthService, 'logout' | 'setUserTheme'> = {
    logout,
    setUserTheme,
  };

  const rendered = await renderComponent(TopbarComponent, {
    declarations: [TopbarComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatMenuModule,
      MatSlideToggleModule,
      MatToolbarModule,
    ],
    providers: [
      ...permissionDataProviders(overrides.grants ?? {}),
      { provide: ComnAuthService, useValue: auth },
      // The real store, seeded with a signed-in user; CurrentUserQuery reads it.
      {
        provide: CurrentUserStore,
        useFactory: () => {
          const store = new CurrentUserStore();
          store.update({ name: 'Alex Doe', id: 'user-1' });
          return store;
        },
      },
      ...(overrides.providers ?? []),
    ],
    componentProperties: {
      title: 'Alloy',
      topbarView: overrides.topbarView ?? TopbarView.ALLOY_HOME,
      team: overrides.team,
    },
  });

  const user = userEvent.setup();
  const openUserMenu = () =>
    user.click(screen.getByRole('button', { name: /Alex Doe/ }));
  return { ...rendered, user, openUserMenu, logout, setUserTheme };
}

describe('TopbarComponent', () => {
  /**
   * Verifies: the title and the signed-in user's name render in the toolbar.
   * Interacts with: title input, real CurrentUserStore/CurrentUserQuery.
   * Data: title 'Alloy'; user Alex Doe.
   */
  it('shows the title and the current user', async () => {
    await renderTopbar();

    expect(screen.getByText('Alloy')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Alex Doe/ }),
    ).toBeInTheDocument();
  });

  describe('Administration entry', () => {
    /**
     * Verifies: the Administration item is hidden for a user without any View* permission or ManageMembership claim.
     * Interacts with: real PermissionDataService.canViewAdministration (system and group paths); menu opened via user click.
     * Data: near misses: ManageEvents and ManageUsers (non-View system permissions); an EditGroup claim (a group claim other than ManageMembership).
     * Why: an empty permission list would also hide it; holding other permissions pins the View* and ManageMembership rules themselves.
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'non-View system permissions',
        grants: { system: ['ManageEvents', 'ManageUsers'] },
      },
      {
        label: 'an EditGroup group claim',
        grants: { groups: [{ groupId: 'g1', permissions: ['EditGroup'] }] },
      },
    ])('is hidden with $label', async ({ grants }) => {
      const { openUserMenu } = await renderTopbar({ grants });

      await openUserMenu();

      expect(
        screen.getByRole('menuitem', { name: 'Logout' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Administration' }),
      ).not.toBeInTheDocument();
    });

    /**
     * Verifies: a View* system permission or a ManageMembership group claim shows the Administration item on the home view.
     * Interacts with: real PermissionDataService (system and group paths); menu opened via user click.
     * Data: ViewUsers; then a ManageMembership claim on g1 with no system permissions.
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      { label: 'ViewUsers', grants: { system: ['ViewUsers'] } },
      {
        label: 'a ManageMembership group claim',
        grants: {
          groups: [{ groupId: 'g1', permissions: ['ManageMembership'] }],
        },
      },
    ])('is shown with $label', async ({ grants }) => {
      const { openUserMenu } = await renderTopbar({ grants });

      await openUserMenu();

      expect(
        screen.getByRole('menuitem', { name: 'Administration' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: inside administration, Exit Administration replaces the Administration item even for an administrator.
     * Interacts with: topbarView input, real PermissionDataService; menu opened via user click.
     * Data: ALLOY_ADMIN view; ViewUsers.
     */
    it('offers Exit Administration instead inside the admin view', async () => {
      const { openUserMenu } = await renderTopbar({
        topbarView: TopbarView.ALLOY_ADMIN,
        grants: { system: ['ViewUsers'] },
      });

      await openUserMenu();

      expect(
        screen.getByRole('menuitem', { name: 'Exit Administration' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Administration' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Edit View entry', () => {
    /**
     * Verifies: a team the user can manage puts Edit View in the user menu, and choosing it emits editView.
     * Interacts with: team input (canManage), editView output; menu opened via user click.
     * Data: team t1 with canManage true.
     */
    it('is shown for a team with canManage and emits editView', async () => {
      const { openUserMenu, user, fixture } = await renderTopbar({
        team: { id: 't1', name: 'Blue', canManage: true },
      });
      let edits = 0;
      fixture.componentInstance.editView.subscribe(() => edits++);

      await openUserMenu();
      await user.click(screen.getByRole('menuitem', { name: 'Edit View' }));

      expect(edits).toBe(1);
    });

    /**
     * Verifies: without a manageable team, the user menu has no Edit View item.
     * Interacts with: team input (canManage); menu opened via user click.
     * Data: near miss: team t1 with canManage false; then no team at all.
     */
    it.each([
      {
        label: 'a team without canManage',
        team: { id: 't1', name: 'Blue', canManage: false },
      },
      { label: 'no team', team: undefined },
    ])('is hidden with $label', async ({ team }) => {
      const { openUserMenu } = await renderTopbar({ team });

      await openUserMenu();

      expect(
        screen.getByRole('menuitem', { name: 'Logout' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('menuitem', { name: 'Edit View' }),
      ).not.toBeInTheDocument();
    });
  });

  /**
   * Verifies: a failed permission load hides Administration and lets the error escape as an unhandled RxJS error (current behavior).
   * Interacts with: failingPermissionProviders (real PermissionDataService, system permissions fail), captureUnhandledRxErrors; menu opened via user click.
   * Data: the system-permission request answers 500.
   */
  it('lets a failed permission load escape unhandled', async () => {
    const unhandled = captureUnhandledRxErrors();
    const failure = { status: 500 };
    const { openUserMenu } = await renderTopbar({
      providers: failingPermissionProviders(failure),
    });
    await flush();

    await openUserMenu();

    expect(
      screen.queryByRole('menuitem', { name: 'Administration' }),
    ).not.toBeInTheDocument();
    expect(unhandled).toEqual([failure]);
  });

  /**
   * Verifies: Logout calls the auth service.
   * Interacts with: ComnAuthService.logout spy; menu opened via user click.
   * Data: default user.
   */
  it('logs out from the user menu', async () => {
    const { openUserMenu, user, logout } = await renderTopbar();

    await openUserMenu();
    await user.click(screen.getByRole('menuitem', { name: 'Logout' }));

    expect(logout).toHaveBeenCalledTimes(1);
  });

  /**
   * Verifies: turning on Dark Theme asks the auth service to switch to the dark theme.
   * Interacts with: ComnAuthService.setUserTheme spy, mat-slide-toggle (role switch); menu opened via user click.
   * Data: light theme to start (ComnAuthQuery default).
   */
  it('switches to the dark theme from the user menu', async () => {
    const { openUserMenu, user, setUserTheme } = await renderTopbar();

    await openUserMenu();
    await user.click(screen.getByRole('switch', { name: 'Dark Theme' }));

    expect(setUserTheme).toHaveBeenCalledWith(Theme.DARK);
  });
});
