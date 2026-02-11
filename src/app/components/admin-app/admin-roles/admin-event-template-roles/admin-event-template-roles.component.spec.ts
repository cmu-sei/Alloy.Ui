/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminEventTemplateRolesComponent } from './admin-event-template-roles.component';

describe('AdminEventTemplateRolesComponent', () => {
  let component: AdminEventTemplateRolesComponent;
  let fixture: ComponentFixture<AdminEventTemplateRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminEventTemplateRolesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminEventTemplateRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
