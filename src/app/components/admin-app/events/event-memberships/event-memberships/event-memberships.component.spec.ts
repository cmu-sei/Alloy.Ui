/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMembershipsComponent } from './event-memberships.component';

describe('EventMembershipsComponent', () => {
  let component: EventMembershipsComponent;
  let fixture: ComponentFixture<EventMembershipsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventMembershipsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventMembershipsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
