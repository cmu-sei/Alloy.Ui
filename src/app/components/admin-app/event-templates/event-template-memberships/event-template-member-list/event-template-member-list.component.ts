/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  AfterViewInit,
  Component,
  OnChanges,
  OnInit,
  ViewChild,
  input,
  output,
} from '@angular/core';
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
import {
  Group,
  EventTemplateMembership,
  EventTemplateRole,
  User,
} from 'src/app/generated/alloy.api';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconButton, MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/autocomplete';

@Component({
  selector: 'app-event-template-member-list',
  templateUrl: './event-template-member-list.component.html',
  styleUrls: ['./event-template-member-list.component.scss'],
  imports: [
    MatToolbar,
    MatToolbarRow,
    MatIcon,
    MatFormField,
    MatInput,
    FormsModule,
    MatIconButton,
    MatSuffix,
    MatPaginator,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    MatSelect,
    MatOption,
    MatButton,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
  ],
})
export class EventTemplateMemberListComponent
  implements OnInit, OnChanges, AfterViewInit
{
  readonly memberships = input<EventTemplateMembership[]>(undefined);

  readonly users = input<User[]>(undefined);

  readonly groups = input<Group[]>(undefined);

  readonly roles = input<EventTemplateRole[]>(undefined);

  readonly canEdit = input<boolean>(undefined);

  readonly deleteMembership = output<string>();

  readonly editMembership = output<EventTemplateMembership>();

  viewColumns = ['name', 'type', 'role'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;
  dataSource = new MatTableDataSource<EventTemplateMembershipModel>();

  filterString = '';

  constructor() {}

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnInit(): void {
    this.dataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'role':
          return item.role.name;
        default:
          return item[property];
      }
    };

    const defaultPredicate = this.dataSource.filterPredicate;
    this.dataSource.filterPredicate = (data, filter) => {
      const defaultMatch = defaultPredicate(data, filter);
      return (
        data.role.name.toLocaleLowerCase().includes(filter) || defaultMatch
      );
    };
  }

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges() {
    this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit() ? this.editColumns : [],
    );
  }

  buildModel() {
    const memberships = this.memberships();
    if (!memberships || !this.users() || !this.groups() || !this.roles()) {
      return;
    }

    this.dataSource.data = memberships
      .map((x) => {
        const user = this.users().find((u) => u.id === x.userId);
        const group = this.groups().find((g) => g.id === x.groupId);
        const role = this.roles().find((r) => r.id === x.roleId);

        const membership = {
          membership: x,
          role: role,
        } as EventTemplateMembershipModel;

        if (!!user) {
          membership.user = user;
          membership.name = user.name;
          membership.type = 'User';
        } else if (!!group) {
          membership.group = group;
          membership.name = group.name;
          membership.type = 'Group';
        }

        return membership;
      })
      .filter((x) => x);
  }

  delete(id: string) {
    this.deleteMembership.emit(id);
  }

  updateRole(id: string, event: MatSelectChange) {
    this.editMembership.emit({
      id: id,
      roleId: event.value === '' ? null : event.value,
    });
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

export interface EventTemplateMembershipModel {
  membership: EventTemplateMembership;
  user: User;
  group: Group;
  role: EventTemplateRole;
  name: string;
  type: string;
}
