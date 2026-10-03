// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, Subject } from 'rxjs';
import { User } from 'oidc-client-ts';
import { ComnAuthService } from '@cmusei/crucible-common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import {
  failingPermissionProviders,
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { AnyProvider } from 'src/app/test-utils/unstubbed';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { renderComponent } from 'src/app/test-utils/render-component';
import { TopbarView } from '../shared/top-bar/topbar.models';
import { AdminAppComponent } from './admin-app.component';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  @Input() title?: string;
  @Input() topbarView?: TopbarView;
  @Input() sidenav?: unknown;
  @Output() sidenavToggle = new EventEmitter<boolean>();
}
@Component({ selector: 'app-event-templates', template: '' })
class EventTemplatesStubComponent {}
@Component({ selector: 'app-events', template: '' })
class EventsStubComponent {
  @Input() refresh: Subject<boolean>;
}
@Component({ selector: 'app-admin-roles', template: '' })
class AdminRolesStubComponent {}
@Component({ selector: 'app-admin-groups', template: '' })
class AdminGroupsStubComponent {}
@Component({ selector: 'app-admin-users', template: '' })
class AdminUsersStubComponent {}

const SECTION_COMPONENTS = [
  'app-event-templates',
  'app-events',
  'app-admin-roles',
  'app-admin-groups',
  'app-admin-users',
];

async function renderAdminApp(
  overrides: {
    grants?: PermissionGrants;
    queryParams?: Params;
    providers?: AnyProvider[];
  } = {},
) {
  const { route, setQueryParams } = activatedRouteStub(
    overrides.queryParams ?? {},
  );
  const signalR: Pick<
    SignalRService,
    'startConnection' | 'joinAdmin' | 'leaveAdmin'
  > = {
    startConnection: vi.fn(() => Promise.resolve()),
    joinAdmin: vi.fn(),
    leaveAdmin: vi.fn(),
  };
  const auth: Pick<ComnAuthService, 'user$'> = {
    user$: of({ profile: { name: 'Alex Doe', sub: 'user-1' } } as User),
  };

  const rendered = await renderComponent(AdminAppComponent, {
    declarations: [AdminAppComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatListModule,
      MatSidenavModule,
      MatToolbarModule,
      TopbarStubComponent,
      EventTemplatesStubComponent,
      EventsStubComponent,
      AdminRolesStubComponent,
      AdminGroupsStubComponent,
      AdminUsersStubComponent,
    ],
    providers: [
      ...permissionDataProviders(overrides.grants ?? {}),
      { provide: SignalRService, useValue: signalR },
      { provide: ActivatedRoute, useValue: route },
      // A signed-in user. The real UserDataService.setCurrentUser() copies it
      // into the real CurrentUserStore, which is what makes the component join
      // the admin hub group.
      { provide: ComnAuthService, useValue: auth },
      ...(overrides.providers ?? []),
    ],
  });

  const shown = () =>
    SECTION_COMPONENTS.filter(
      (tag) => rendered.container.querySelector(tag) !== null,
    );
  // This mat-list renders no list roles, so the items are read by element.
  const sections = () =>
    Array.from(rendered.container.querySelectorAll('mat-list-item'), (item) =>
      item.textContent?.trim(),
    );
  return {
    ...rendered,
    signalR,
    setQueryParams,
    shown,
    sections,
    user: userEvent.setup(),
  };
}

describe('AdminAppComponent', () => {
  describe('sidebar sections', () => {
    /**
     * Verifies: each sidebar section appears only for the permission that gates it; each single-permission row is the near miss for every other section.
     * Interacts with: real PermissionDataService list gates, rendered mat-list.
     * Data: one grant per case, from resource-scoped claims only (the same permissions on one event, template and group, which open no section) through every system permission.
     */
    it.each<{ label: string; grants: PermissionGrants; expected: string[] }>([
      {
        label: 'resource-scoped claims only',
        grants: {
          events: [
            {
              eventId: 'e1',
              permissions: ['ViewEvent', 'EditEvent', 'ManageEvent'],
            },
          ],
          eventTemplates: [
            {
              eventTemplateId: 't1',
              permissions: ['ViewEventTemplate', 'ManageEventTemplate'],
            },
          ],
          groups: [{ groupId: 'g1', permissions: ['EditGroup'] }],
        },
        expected: [],
      },
      {
        label: 'ViewEventTemplates',
        grants: { system: ['ViewEventTemplates'] },
        expected: ['Event Templates'],
      },
      {
        label: 'ViewEvents',
        grants: { system: ['ViewEvents'] },
        expected: ['Events'],
      },
      {
        label: 'ViewUsers',
        grants: { system: ['ViewUsers'] },
        expected: ['Users'],
      },
      {
        label: 'ViewRoles',
        grants: { system: ['ViewRoles'] },
        expected: ['Roles'],
      },
      {
        label: 'ViewGroups',
        grants: { system: ['ViewGroups'] },
        expected: ['Groups'],
      },
      {
        label: 'a ManageMembership group claim',
        grants: {
          groups: [{ groupId: 'g1', permissions: ['ManageMembership'] }],
        },
        expected: ['Groups'],
      },
      {
        label: 'every View system permission',
        grants: {
          system: [
            'ViewEventTemplates',
            'ViewEvents',
            'ViewUsers',
            'ViewRoles',
            'ViewGroups',
          ],
        },
        expected: ['Event Templates', 'Events', 'Users', 'Roles', 'Groups'],
      },
    ])('shows $expected for $label', async ({ grants, expected }) => {
      const { sections } = await renderAdminApp({ grants });

      expect(sections()).toEqual(expected);
    });
  });

  describe('section content', () => {
    /**
     * Verifies: the default section is Event Templates for a user who can see templates.
     * Interacts with: showStatus default, real PermissionDataService, child stubs.
     * Data: ViewEventTemplates and ViewGroups.
     */
    it('opens Event Templates by default', async () => {
      const { shown } = await renderAdminApp({
        grants: { system: ['ViewEventTemplates', 'ViewGroups'] },
      });

      expect(shown()).toEqual(['app-event-templates']);
    });

    /**
     * Verifies: a group manager who cannot see templates lands on Groups instead of an empty page.
     * Interacts with: the forkJoin(load, loadGroupPermissions) fallback in ngOnInit, child stubs.
     * Data: a ManageMembership group claim and no system permissions.
     */
    it('falls back to Groups for a group manager without template access', async () => {
      const { shown } = await renderAdminApp({
        grants: {
          groups: [{ groupId: 'g1', permissions: ['ManageMembership'] }],
        },
      });

      expect(shown()).toEqual(['app-admin-groups']);
    });

    /**
     * Verifies: the ?section= query parameter selects the section only when the user holds its permission.
     * Interacts with: ActivatedRoute.queryParams (activatedRouteStub), section @if gates, child stubs.
     * Data: section=Users with ViewUsers (allowed), then with ViewRoles, another View permission (denied).
     */
    it.each<{ label: string; grants: PermissionGrants; expected: string[] }>([
      {
        label: 'opens Users with ViewUsers',
        grants: { system: ['ViewUsers'] },
        expected: ['app-admin-users'],
      },
      {
        label: 'shows nothing with ViewRoles',
        grants: { system: ['ViewRoles'] },
        expected: [],
      },
    ])('?section=Users $label', async ({ grants, expected }) => {
      const { shown } = await renderAdminApp({
        grants,
        queryParams: { section: 'Users' },
      });

      expect(shown()).toEqual(expected);
    });

    /**
     * Verifies: clicking a sidebar section writes it to the URL, merging with the other query parameters.
     * Interacts with: Router.navigate (spied on the real router), sidebar click via user-event.
     * Why: the template's routerLink reads router state, so the real router stays and only navigate is spied (a Pick<Router, 'navigate'> stub would break routerLink).
     * Data: ViewEvents; click on Events.
     */
    it('navigates to a section when it is clicked', async () => {
      const { user } = await renderAdminApp({
        grants: { system: ['ViewEvents'] },
      });
      const navigate = vi
        .spyOn(TestBed.inject(Router), 'navigate')
        .mockResolvedValue(true);

      await user.click(screen.getByText('Events'));

      expect(navigate).toHaveBeenCalledWith([], {
        queryParams: { section: 'Events' },
        queryParamsHandling: 'merge',
      });
    });
  });

  /**
   * Verifies: a failed permission load leaves the sidebar empty and lets the error escape as an unhandled RxJS error (current behavior).
   * Interacts with: failingPermissionProviders (real PermissionDataService, system permissions fail), captureUnhandledRxErrors, rendered mat-list.
   * Data: the system-permission request answers 500.
   */
  it('lets a failed permission load escape unhandled', async () => {
    const unhandled = captureUnhandledRxErrors();
    const failure = { status: 500 };
    const { sections } = await renderAdminApp({
      providers: failingPermissionProviders(failure),
    });
    await flush();

    expect(sections()).toEqual([]);
    expect(unhandled).toEqual([failure]);
  });

  /**
   * Verifies: once the current user is known the admin hub group is joined, and it is left on destroy.
   * Interacts with: SignalRService.startConnection/joinAdmin/leaveAdmin stubs, real UserDataService.setCurrentUser and CurrentUserStore/Query, ComnAuthService.user$ stub.
   * Data: a signed-in user with id user-1.
   */
  it('joins the admin hub group and leaves it on destroy', async () => {
    const { fixture, signalR } = await renderAdminApp({
      grants: { system: ['ViewEvents'] },
    });
    await fixture.whenStable();

    expect(signalR.startConnection).toHaveBeenCalled();
    expect(signalR.joinAdmin).toHaveBeenCalledTimes(1);

    fixture.destroy();
    expect(signalR.leaveAdmin).toHaveBeenCalledTimes(1);
  });
});
