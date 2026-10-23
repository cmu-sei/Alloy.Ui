/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
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
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { SystemPermission, SystemRole } from 'src/app/generated/alloy.api';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { RoleDataService } from 'src/app/data/role/role-data.service';
import { SystemRolesModel } from './admin-system-roles.models';
import { map, take } from 'rxjs/operators';
import { MatCheckboxChange, MatCheckbox } from '@angular/material/checkbox';
import { Observable } from 'rxjs';
import { NameDialogComponent } from 'src/app/shared/name-dialog/name-dialog.component';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import { MatIconButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { MatIcon } from '@angular/material/icon';
import { AsyncPipe } from '@angular/common';

const NAME_VALUE = 'nameValue';

@Component({
  selector: 'app-admin-system-roles',
  templateUrl: './admin-system-roles.component.html',
  styleUrls: ['./admin-system-roles.component.scss'],
  imports: [
    MatTable,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatIconButton,
    MatTooltip,
    MatIcon,
    MatCellDef,
    MatCell,
    MatCheckbox,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    AsyncPipe,
  ],
})
export class AdminSystemRolesComponent implements OnInit {
  private roleService = inject(RoleDataService);
  private dialog = inject(MatDialog);
  private crucibleDialog = inject(CrucibleDialogService);
  private permissionDataService = inject(PermissionDataService);
  private signalRService = inject(SignalRService);

  public canEdit = this.permissionDataService.hasPermission(
    SystemPermission.ManageRoles,
  );

  public allPermission = 'All';

  public permissionMap = SystemRolesModel.SystemPermissions;

  public dataSource = new MatTableDataSource<string>([
    ...[this.allPermission],
    ...Object.values(SystemPermission),
  ]);

  public roles$ = this.roleService.roles$.pipe(
    map((roles) =>
      roles.sort((a, b) => {
        // Sort by 'immutable' property first (false comes after true)
        if (a.immutable !== b.immutable) {
          return a.immutable ? -1 : 1; // Put `true` before `false`
        }
        // If 'immutable' values are the same, sort by 'name' (case-insensitive)
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
    this.roleService.getRoles().subscribe();

    this.signalRService.startConnection().catch(() => {
      // the service reports the failure to the user
    });
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  hasPermission(permission: string, role: SystemRole) {
    if (permission === this.allPermission) {
      return role.allPermissions;
    }

    return role.permissions.some((x) => x === permission);
  }

  setPermission(
    permission: string,
    role: SystemRole,
    event: MatCheckboxChange,
  ) {
    if (permission === this.allPermission) {
      role.allPermissions = event.checked;
    } else {
      if (event.checked && !this.hasPermission(permission, role)) {
        role.permissions.push(permission as SystemPermission);
      } else if (!event.checked) {
        role.permissions = role.permissions.filter(
          (x) => x !== (permission as SystemPermission),
        );
      }
    }

    this.roleService.editRole(role).subscribe();
  }

  addRole() {
    this.nameDialog('Create New Role?', '', { nameValue: '' })
      .pipe(take(1))
      .subscribe((result) => {
        if (result) {
          this.roleService.createRole({ name: result[NAME_VALUE] }).subscribe();
        }
      });
  }

  renameRole(role: SystemRole) {
    this.nameDialog('Rename Role?', '', { nameValue: role.name })
      .pipe(take(1))
      .subscribe((result) => {
        if (result) {
          role.name = result[NAME_VALUE];
          this.roleService.editRole(role).subscribe();
        }
      });
  }

  deleteRole(role: SystemRole) {
    this.crucibleDialog
      .confirm({
        title: 'Delete Role?',
        message: `Are you sure you want to delete ${role.name}?`,
        confirmText: 'Delete',
        cancelText: 'Cancel',
      })
      .afterClosed()
      .subscribe((confirmed) => {
        if (confirmed) {
          this.roleService.deleteRole(role.id).subscribe();
        }
      });
  }

  nameDialog(title: string, message: string, data?: any): Observable<any> {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      minWidth: '400px',
      maxWidth: '90vw',
      width: '480px',
      data: data || {},
    });
    dialogRef.componentInstance.title = title;
    dialogRef.componentInstance.message = message;

    return dialogRef.afterClosed();
  }
}
