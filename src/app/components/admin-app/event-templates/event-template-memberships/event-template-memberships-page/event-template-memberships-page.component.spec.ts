// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import {
  permissionApiStubs,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { EventTemplatePermissionsService } from 'src/app/generated/alloy.api';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateMembershipsPageComponent } from './event-template-memberships-page.component';

@Component({ selector: 'app-topbar', template: '', standalone: false })
class TopbarStubComponent {}

@Component({
  selector: 'app-event-template-memberships',
  template: '',
  standalone: false,
})
class EventTemplateMembershipsStubComponent {
  @Input() eventTemplateId: string;
}

describe('EventTemplateMembershipsPageComponent', () => {
  /**
   * Verifies: the page reads the template id from the route, loads the user's permissions for it, and hands the id to the memberships component.
   * Interacts with: activatedRouteStub (snapshot paramMap), real PermissionDataService.loadEventTemplatePermissions, EventTemplatePermissionsService spy, memberships stub input.
   * Data: route param id 't1'.
   */
  it('passes the routed template id to the memberships component', async () => {
    const { route } = activatedRouteStub({}, { id: 't1' });
    const templatePermissions = permissionApiStubs().eventTemplatePermissions;
    const { fixture } = await renderComponent(
      EventTemplateMembershipsPageComponent,
      {
        declarations: [
          EventTemplateMembershipsPageComponent,
          TopbarStubComponent,
          EventTemplateMembershipsStubComponent,
        ],
        providers: [
          { provide: ActivatedRoute, useValue: route },
          ...permissionDataProviders(),
          {
            provide: EventTemplatePermissionsService,
            useValue: templatePermissions,
          },
        ],
      },
    );

    const memberships = fixture.debugElement.query(
      By.directive(EventTemplateMembershipsStubComponent),
    ).componentInstance as EventTemplateMembershipsStubComponent;
    expect(memberships.eventTemplateId).toBe('t1');
    expect(
      templatePermissions.getMyEventTemplatePermissions,
    ).toHaveBeenCalledWith('t1');
  });
});
