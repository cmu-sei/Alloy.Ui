/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  AfterViewInit,
  Component,
  OnChanges,
  OnInit,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatPaginator } from '@angular/material/paginator';
import { MatSelectChange, MatSelect } from '@angular/material/select';
import { MatSort, MatSortHeader } from '@angular/material/sort';
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
  MatNoDataRow,
} from '@angular/material/table';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { filter, tap } from 'rxjs/operators';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import {
  GroupMembership,
  GroupMembershipRole,
  User,
} from 'src/app/generated/alloy.api';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import {
  MatFormField,
  MatLabel,
  MatInput,
  MatSuffix,
} from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { CurrentUserBadgeComponent } from '../../../shared/current-user-badge/current-user-badge.component';
import { MatOption } from '@angular/material/autocomplete';

@Component({
  selector: 'app-admin-groups-member-list',
  templateUrl: './admin-groups-member-list.component.html',
  styleUrls: ['./admin-groups-member-list.component.scss'],
  imports: [
    MatToolbar,
    MatToolbarRow,
    MatFormField,
    MatLabel,
    MatInput,
    FormsModule,
    MatIconButton,
    MatSuffix,
    MatIcon,
    MatPaginator,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    CurrentUserBadgeComponent,
    MatSelect,
    MatOption,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
  ],
})
export class AdminGroupsMemberListComponent
  implements OnInit, OnChanges, AfterViewInit
{
  readonly memberships = input<GroupMembership[]>(undefined);

  readonly users = input<User[]>(undefined);

  readonly canEdit = input<boolean>(undefined);

  readonly deleteMembership = output<{
    id: string;
    isCurrentUser: boolean;
  }>();

  readonly editMembership = output<{
    id: string;
    role: GroupMembershipRole;
    isCurrentUser: boolean;
  }>();

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild(MatPaginator);

  viewColumns = ['name', 'role'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;
  dataSource = new MatTableDataSource<GroupMembershipModel>();
  groupMembershipRoles = Object.values(GroupMembershipRole);

  filterString = '';
  private readonly currentUserQuery = inject(CurrentUserQuery);
  private readonly confirmService = inject(CrucibleDialogService);
  private currentUserId = toSignal(
    this.currentUserQuery.select((state) => state.id),
    { initialValue: '' },
  );

  ngOnInit(): void {}

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator();
    this.dataSource.sort = this.sort();
  }

  ngOnChanges() {
    this.buildModel();
    this.displayedColumns = this.viewColumns.concat(
      this.canEdit() ? this.editColumns : [],
    );
  }

  buildModel() {
    const memberships = this.memberships();
    if (!memberships || !this.users()) {
      this.dataSource.data = [];
      return;
    }

    this.dataSource.data = memberships
      .map((x) => {
        const user = this.users().find((u) => u.id == x.userId);

        return {
          membership: x,
          user: user,
          name: user?.name,
          role: x.role || GroupMembershipRole.Member,
        } as GroupMembershipModel;
      })
      .filter((x) => x);
  }

  delete(model: GroupMembershipModel) {
    const isCurrentUser = this.isCurrentUser(model);

    if (isCurrentUser) {
      this.confirmService
        .confirm({
          title: 'Remove Group Member',
          message:
            'Are you sure that you want to remove yourself from this group? You may lose access to manage it.',
          confirmText: 'Remove',
          cancelText: 'Cancel',
        })
        .afterClosed()
        .pipe(
          filter((confirmed) => confirmed === true),
          tap(() => {
            this.deleteMembership.emit({
              id: model.membership.id,
              isCurrentUser,
            });
          }),
        )
        .subscribe();
      return;
    }

    this.deleteMembership.emit({ id: model.membership.id, isCurrentUser });
  }

  updateRole(model: GroupMembershipModel, event: MatSelectChange) {
    const role = event.value as GroupMembershipRole;
    const isCurrentUser = this.isCurrentUser(model);

    if (role === model.role) {
      return;
    }

    if (isCurrentUser && role !== GroupMembershipRole.Manager) {
      this.confirmService
        .confirm({
          title: 'Change Group Role',
          message:
            'Are you sure that you want to change your own role? Changing your role from Manager means you may no longer be able to manage this group.',
          confirmText: 'Change Role',
          cancelText: 'Cancel',
        })
        .afterClosed()
        .pipe(
          tap((confirmed) => {
            if (confirmed === true) {
              this.editMembership.emit({
                id: model.membership.id,
                role,
                isCurrentUser,
              });
              return;
            }

            event.source.value = model.role;
          }),
        )
        .subscribe();
      return;
    }

    this.editMembership.emit({ id: model.membership.id, role, isCurrentUser });
  }

  isCurrentUser(model: GroupMembershipModel) {
    return (
      !!this.currentUserId() && model.membership.userId === this.currentUserId()
    );
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  clearFilter() {
    this.filterString = '';
    this.dataSource.filter = this.filterString;
  }
}

export interface GroupMembershipModel {
  membership: GroupMembership;
  user: User;
  name: string;
  role: GroupMembershipRole;
}
