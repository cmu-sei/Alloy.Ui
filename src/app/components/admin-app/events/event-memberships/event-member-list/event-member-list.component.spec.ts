/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventMemberListComponent } from './event-member-list.component';

describe('EventMemberListComponent', () => {
  let component: EventMemberListComponent;
  let fixture: ComponentFixture<EventMemberListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventMemberListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventMemberListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
