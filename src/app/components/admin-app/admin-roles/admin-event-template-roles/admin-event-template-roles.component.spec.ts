/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventTemplateRolesComponent } from './eventTemplate-roles.component';

describe('EventTemplateRolesComponent', () => {
  let component: EventTemplateRolesComponent;
  let fixture: ComponentFixture<EventTemplateRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EventTemplateRolesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EventTemplateRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
