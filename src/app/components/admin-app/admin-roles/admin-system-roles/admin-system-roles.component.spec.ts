/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminSystemRolesComponent } from './admin-system-roles.component';

describe('AdminSystemRolesComponent', () => {
  let component: AdminSystemRolesComponent;
  let fixture: ComponentFixture<AdminSystemRolesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AdminSystemRolesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AdminSystemRolesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
