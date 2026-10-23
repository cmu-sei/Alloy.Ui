// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Component } from '@angular/core';
import { screen } from '@testing-library/angular';
import { MatTabsModule } from '@angular/material/tabs';
import { renderComponent } from '../../../test-utils/render-component';
import { AdminRolesComponent } from './admin-roles.component';
import { AdminSystemRolesComponent } from './admin-system-roles/admin-system-roles.component';
import { AdminEventTemplateRolesComponent } from './admin-event-template-roles/admin-event-template-roles.component';
import { AdminEventRolesComponent } from './admin-event-roles/admin-event-roles.component';

@Component({ selector: 'app-admin-system-roles', template: '' })
class SystemRolesStubComponent {}

@Component({ selector: 'app-admin-event-template-roles', template: '' })
class EventTemplateRolesStubComponent {}

@Component({ selector: 'app-admin-event-roles', template: '' })
class EventRolesStubComponent {}

describe('AdminRolesComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and shows its three role tabs, with the system roles tab open.
   * Interacts with: getDefaultProviders (placeholders and stubs only), MatTabsModule; the role tables are stub components.
   * Data: no inputs.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderComponent(AdminRolesComponent, {
      imports: [MatTabsModule],
      childStubs: [
        { replace: AdminSystemRolesComponent, with: SystemRolesStubComponent },
        {
          replace: AdminEventTemplateRolesComponent,
          with: EventTemplateRolesStubComponent,
        },
        { replace: AdminEventRolesComponent, with: EventRolesStubComponent },
      ],
    });

    expect(fixture.componentInstance).toBeInstanceOf(AdminRolesComponent);
    expect(
      screen.getAllByRole('tab').map((t) => t.textContent?.trim()),
    ).toEqual(['Roles', 'EventTemplate Roles', 'Event Roles']);
    expect(
      fixture.nativeElement.querySelector('app-admin-system-roles'),
    ).toBeInTheDocument();
  });
});
