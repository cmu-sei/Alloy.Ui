/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import {
  MatTableDataSource,
  MatTable,
  MatColumnDef,
  MatHeaderCellDef,
  MatHeaderCell,
  MatCellDef,
  MatCell,
  MatHeaderRowDef,
  MatHeaderRow,
  MatRowDef,
  MatRow,
} from '@angular/material/table';
import { EventPermission, EventRole } from 'src/app/generated/alloy.api';
import { EventRolesModel } from './admin-event-roles.models';
import { map } from 'rxjs/operators';
import { EventRoleDataService } from 'src/app/data/event/event-role-data.service';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { MatCheckbox } from '@angular/material/checkbox';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-admin-event-roles',
  templateUrl: './admin-event-roles.component.html',
  styleUrls: ['./admin-event-roles.component.scss'],
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatCheckbox,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    AsyncPipe,
  ],
})
export class AdminEventRolesComponent implements OnInit {
  private eventRoleService = inject(EventRoleDataService);

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
      }),
    ),
  );

  public displayedColumns$ = this.roles$.pipe(
    map((x) => {
      const columnNames = x.map((y) => y.name);
      return ['permissions', ...columnNames];
    }),
  );

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
