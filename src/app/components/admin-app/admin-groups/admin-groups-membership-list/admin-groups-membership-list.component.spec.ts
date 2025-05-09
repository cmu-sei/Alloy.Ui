/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdminGroupsMembershipListComponent } from './admin-groups-membership-list.component';

describe('AdminGroupsMembershipListComponent', () => {
  let component: AdminGroupsMembershipListComponent;
  let fixture: ComponentFixture<AdminGroupsMembershipListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ AdminGroupsMembershipListComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AdminGroupsMembershipListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
