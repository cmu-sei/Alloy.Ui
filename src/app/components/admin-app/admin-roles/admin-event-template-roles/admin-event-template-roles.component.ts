/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import {
  EventTemplatePermission,
  EventTemplateRole,
} from 'src/app/generated/alloy.api';
import { EventTemplateRolesModel } from './admin-event-template-roles.models';
import { map } from 'rxjs/operators';
import { EventTemplateRoleDataService } from 'src/app/data/event-template/event-template-role-data.service';

@Component({
  selector: 'app-admin-event-template-roles',
  templateUrl: './admin-event-template-roles.component.html',
  styleUrls: ['./admin-event-template-roles.component.scss'],
})
export class AdminEventTemplateRolesComponent implements OnInit {
  public allPermission = 'All';

  public permissionMap = EventTemplateRolesModel.EventTemplatePermissions;

  public dataSource = new MatTableDataSource<string>([
    ...[this.allPermission],
    ...Object.values(EventTemplatePermission),
  ]);

  public roles$ = this.eventTemplateRoleService.eventTemplateRoles$.pipe(
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

  constructor(private eventTemplateRoleService: EventTemplateRoleDataService) {}

  ngOnInit(): void {
    this.eventTemplateRoleService.loadRoles().subscribe();
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  hasPermission(permission: string, role: EventTemplateRole) {
    if (permission === this.allPermission) {
      return role.allPermissions;
    }

    return role.permissions.some((x) => x === permission);
  }
}
