/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventTemplateMembershipsPageComponent } from './event-template-memberships-page.component';

describe('EventTemplateMembershipsPageComponent', () => {
  let component: EventTemplateMembershipsPageComponent;
  let fixture: ComponentFixture<EventTemplateMembershipsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventTemplateMembershipsPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventTemplateMembershipsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
