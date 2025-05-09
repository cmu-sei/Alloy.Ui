/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMembershipListComponent } from './event-membership-list.component';

describe('EventMembershipUserListComponent', () => {
  let component: EventMembershipListComponent;
  let fixture: ComponentFixture<EventMembershipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventMembershipListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventMembershipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
