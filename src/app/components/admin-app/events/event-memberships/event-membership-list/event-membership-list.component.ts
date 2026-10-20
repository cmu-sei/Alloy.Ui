/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
  inject,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
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
import { EventMembership, Group, User } from 'src/app/generated/alloy.api';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconButton, MatButton } from '@angular/material/button';
import { ClipboardModule } from 'ngx-clipboard';

@Component({
  selector: 'app-event-membership-list',
  templateUrl: './event-membership-list.component.html',
  styleUrls: ['./event-membership-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    ClipboardModule,
    MatButton,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatNoDataRow,
  ],
})
export class EventMembershipListComponent
  implements OnInit, OnChanges, AfterViewInit
{
  snackBar = inject(MatSnackBar);

  @Input()
  users: User[];

  @Input()
  groups: Group[];

  @Input()
  canEdit: boolean;

  @Output()
  createMembership = new EventEmitter<EventMembership>();

  viewColumns = ['name', 'type'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;

  dataSource = new MatTableDataSource<EventMemberModel>();

  filterString = '';

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnChanges() {
    this.dataSource.data = this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit ? this.editColumns : [],
    );
  }

  add(id: string, type: string) {
    const eventMembership = {} as EventMembership;

    if (type === 'User') {
      eventMembership.userId = id;
    } else if (type === 'Group') {
      eventMembership.groupId = id;
    }

    this.createMembership.emit(eventMembership);
  }

  buildModel(): EventMemberModel[] {
    if (!this.users || !this.groups) {
      return [];
    }

    const eventMemberModels = [] as EventMemberModel[];

    this.users.forEach((x) => {
      eventMemberModels.push({
        user: x,
        group: null,
        id: x.id,
        name: x.name,
        type: 'User',
      });
    });

    this.groups.forEach((x) => {
      eventMemberModels.push({
        user: null,
        group: x,
        id: x.id,
        name: x.name,
        type: 'Group',
      });
    });

    return eventMemberModels;
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

export interface EventMemberModel {
  user: User;
  group: Group;
  id: string;
  name: string;
  type: string;
}
