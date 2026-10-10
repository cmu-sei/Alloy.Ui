// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { renderComponent } from '../../../test-utils/render-component';
import { EventsComponent } from './events.component';

@Component({
  selector: 'app-admin-event-list',
  template: '',
  standalone: false,
})
class AdminEventListStubComponent {
  @Input() refresh: Subject<boolean>;
}

describe('EventsComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and hands its refresh subject to the admin event list.
   * Interacts with: getDefaultProviders (placeholders and stubs only), the admin event list stub's refresh input.
   * Data: a refresh subject.
   */
  it('renders with the default test providers', async () => {
    const refresh = new Subject<boolean>();
    const { fixture } = await renderComponent(EventsComponent, {
      declarations: [EventsComponent, AdminEventListStubComponent],
      inputs: { refresh },
    });

    expect(fixture.componentInstance).toBeInstanceOf(EventsComponent);
    const list = fixture.debugElement.query(
      By.directive(AdminEventListStubComponent),
    ).componentInstance as AdminEventListStubComponent;
    expect(list.refresh).toBe(refresh);
  });
});
