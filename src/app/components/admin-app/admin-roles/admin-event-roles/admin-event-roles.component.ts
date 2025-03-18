/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/legacy-table';
import { EventPermission, EventRole } from 'src/app/generated/alloy.api';
import { EventRolesModel } from './admin-event-roles.models';
import { map } from 'rxjs/operators';
import { EventRoleDataService } from 'src/app/data/event/event-role-data.service';

@Component({
  selector: 'app-admin-event-roles',
  templateUrl: './admin-event-roles.component.html',
  styleUrls: ['./admin-event-roles.component.scss'],
})
export class AdminEventRolesComponent implements OnInit {
  public allPermission = 'All';

  public permissionMap = EventRolesModel.EventPermissions;

  public dataSource = new MatTableDataSource<string>([
    ...[this.allPermission],
    ...Object.values(EventPermission),
  ]);

  public roles$ = this.eventRoleService.eventRoles$.pipe(
    map((roles) =>
      roles.sort((a, b) => {
        return a.name.localeCompare(b.name);
      })
    )
  );

  public displayedColumns$ = this.roles$.pipe(
    map((x) => {
      const columnNames = x.map((y) => y.name);
      return ['permissions', ...columnNames];
    })
  );

  constructor(private eventRoleService: EventRoleDataService) {}

  ngOnInit(): void {
    this.eventRoleService.loadRoles().subscribe();
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  hasPermission(permission: string, role: EventRole) {
    if (permission === this.allPermission) {
      return role.allPermissions;
    }

    return role.permissions.some((x) => x === permission);
  }
}
