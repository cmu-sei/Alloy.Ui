/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventTemplateMemberListComponent } from './event-template-member-list.component';

describe('EventTemplateMemberListComponent', () => {
  let component: EventTemplateMemberListComponent;
  let fixture: ComponentFixture<EventTemplateMemberListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventTemplateMemberListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventTemplateMemberListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
