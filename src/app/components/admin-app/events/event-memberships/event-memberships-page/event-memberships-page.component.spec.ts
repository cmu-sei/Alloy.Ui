// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Component, input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import {
  Event as AlloyEvent,
  EventPermissionsService,
} from 'src/app/generated/alloy.api';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import {
  permissionApiStubs,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventMembershipsPageComponent } from './event-memberships-page.component';
import { TopbarComponent } from 'src/app/components/shared/top-bar/topbar.component';
import { EventMembershipsComponent } from 'src/app/components/admin-app/events/event-memberships/event-memberships/event-memberships.component';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {}

@Component({
  selector: 'app-event-memberships',
  template: '',
})
class EventMembershipsStubComponent {
  readonly event = input<AlloyEvent>(undefined);
}

describe('EventMembershipsPageComponent', () => {
  /**
   * Verifies: the page reads the event id from the route and loads the user's permissions for it, but passes no event to the memberships component (current behavior).
   * Interacts with: activatedRouteStub (snapshot paramMap), real PermissionDataService.loadEventPermissions, EventPermissionsService spy, memberships stub input.
   * Data: route param id 'e1'.
   */
  it('renders the memberships component without an event', async () => {
    const { route } = activatedRouteStub({}, { id: 'e1' });
    const eventPermissions = permissionApiStubs().eventPermissions;
    const { fixture } = await renderComponent(EventMembershipsPageComponent, {
      childStubs: [
        { replace: TopbarComponent, with: TopbarStubComponent },
        {
          replace: EventMembershipsComponent,
          with: EventMembershipsStubComponent,
        },
      ],
      providers: [
        { provide: ActivatedRoute, useValue: route },
        ...permissionDataProviders(),
        { provide: EventPermissionsService, useValue: eventPermissions },
      ],
    });

    expect(fixture.componentInstance.eventId).toBe('e1');
    expect(eventPermissions.getMyEventPermissions).toHaveBeenCalledWith('e1');
    const memberships = fixture.debugElement.query(
      By.directive(EventMembershipsStubComponent),
    ).componentInstance as EventMembershipsStubComponent;
    // Current behavior; see agent-docs/ui-test-bugs/alloy.ui.md.
    expect(memberships.event()).toBeUndefined();
  });
});
