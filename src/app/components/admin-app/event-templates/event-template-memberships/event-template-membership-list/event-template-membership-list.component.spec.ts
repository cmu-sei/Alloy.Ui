/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventTemplateMembershipListComponent } from './event-template-membership-list.component';

describe('EventTemplateMembershipUserListComponent', () => {
  let component: EventTemplateMembershipListComponent;
  let fixture: ComponentFixture<EventTemplateMembershipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventTemplateMembershipListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventTemplateMembershipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
