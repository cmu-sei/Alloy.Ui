// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import { Event as AlloyEvent, EventService } from 'src/app/generated/alloy.api';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { TopbarView } from '../shared/top-bar/topbar.models';
import { HomeAppComponent } from './home-app.component';

@Component({ selector: 'app-topbar', template: '', standalone: false })
class TopbarStubComponent {
  @Input() title: string;
  @Input() topbarView: TopbarView;
}

@Component({ selector: 'app-event-list', template: '', standalone: false })
class EventListStubComponent {}

async function renderHome(
  grants: PermissionGrants,
  options: { viewId?: string; viewEvents?: AlloyEvent[] } = {},
) {
  const eventApi = {
    getMyViewEvents: vi.fn(() => of(options.viewEvents ?? [])),
    getMyEvents: vi.fn(() => of<AlloyEvent[]>([])),
  } satisfies ApiStub<EventService>;
  const navigate = vi.fn<Router['navigate']>(() => Promise.resolve(true));
  const auth: Pick<ComnAuthService, 'user$'> = {
    user$: of({
      profile: { sub: 'u1', name: 'Alex Doe' },
    }) as ComnAuthService['user$'],
  };
  const { route } = activatedRouteStub(
    {},
    options.viewId ? { viewId: options.viewId } : {},
  );
  const rendered = await renderComponent(HomeAppComponent, {
    declarations: [
      HomeAppComponent,
      TopbarStubComponent,
      EventListStubComponent,
    ],
    imports: [MatButtonModule, MatIconModule],
    providers: [
      { provide: EventService, useValue: eventApi },
      { provide: ActivatedRoute, useValue: route },
      {
        provide: Router,
        useValue: { navigate } satisfies Pick<Router, 'navigate'>,
      },
      { provide: ComnAuthService, useValue: auth },
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { AppTitle: 'Alloy', AppTopBarText: 'Alloy Home' },
        },
      },
      ...permissionDataProviders(grants),
    ],
  });
  return { ...rendered, eventApi, navigate };
}

describe('HomeAppComponent', () => {
  /**
   * Verifies: the page sets the browser title, passes the top bar its text, records the signed-in user and shows the event list.
   * Interacts with: ComnSettingsService settings, Title, the topbar stub's inputs, real UserDataService.setCurrentUser / CurrentUserQuery, ComnAuthService.user$.
   * Data: AppTitle 'Alloy', AppTopBarText 'Alloy Home'; user u1 Alex Doe; system ViewEvents.
   */
  it('sets the title and the current user and shows the event list', async () => {
    const { fixture } = await renderHome({ system: ['ViewEvents'] });

    expect(TestBed.inject(Title).getTitle()).toBe('Alloy');
    const topbar = fixture.debugElement.query(By.directive(TopbarStubComponent))
      .componentInstance as TopbarStubComponent;
    expect(topbar.title).toBe('Alloy Home');
    expect(topbar.topbarView).toBe(TopbarView.ALLOY_HOME);
    expect(TestBed.inject(CurrentUserQuery).getValue()).toEqual(
      expect.objectContaining({ id: 'u1', name: 'Alex Doe' }),
    );
    expect(
      fixture.debugElement.query(By.directive(EventListStubComponent)),
    ).not.toBeNull();
  });

  /**
   * Verifies: the Administration button shows with any View* system permission or a ManageMembership group claim.
   * Interacts with: real PermissionDataService.load / loadGroupPermissions / canViewAdministration, rendered button.
   * Data: system ViewUsers; a ManageMembership claim on a group.
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ViewUsers', grants: { system: ['ViewUsers'] } },
    {
      label: 'a ManageMembership group claim',
      grants: {
        groups: [{ groupId: 'g1', permissions: ['ManageMembership'] }],
      },
    },
  ])('shows Administration with $label', async ({ grants }) => {
    await renderHome(grants);

    expect(
      screen.getByRole('button', { name: 'Show Administration Page' }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: without a View* system permission or a ManageMembership group claim, the Administration button is hidden.
   * Interacts with: real PermissionDataService.canViewAdministration, rendered top row.
   * Data: near misses: CreateEvents, ManageEvents and ManageUsers (no View*); an EditGroup group claim.
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    {
      label: 'non-View system permissions',
      grants: { system: ['CreateEvents', 'ManageEvents', 'ManageUsers'] },
    },
    {
      label: 'an EditGroup group claim',
      grants: { groups: [{ groupId: 'g1', permissions: ['EditGroup'] }] },
    },
  ])('hides Administration with $label', async ({ grants }) => {
    await renderHome(grants);

    expect(
      screen.queryByRole('button', { name: 'Show Administration Page' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: on a view route, the page finds the user's event for that view and navigates to its template's view page; with no matching event it stays.
   * Interacts with: route params viewId, EventService.getMyViewEvents / getMyEvents through the real EventDataService, Router.navigate stub.
   * Data: viewId v1; an event for v1 from template t1, then no events.
   */
  it.each([
    {
      label: 'an event for the view',
      events: [{ id: 'e1', viewId: 'v1', eventTemplateId: 't1' }],
      calls: [[['templates', 't1', 'view', 'v1']]],
    },
    { label: 'no event for the view', events: [], calls: [] },
  ])(
    'on a view route with $label navigates accordingly',
    async ({ events, calls }) => {
      const { eventApi, navigate } = await renderHome(
        { system: ['ViewEvents'] },
        { viewId: 'v1', viewEvents: events },
      );

      expect(eventApi.getMyViewEvents).toHaveBeenCalledWith('v1');
      expect(navigate.mock.calls).toEqual(calls);
    },
  );
});
