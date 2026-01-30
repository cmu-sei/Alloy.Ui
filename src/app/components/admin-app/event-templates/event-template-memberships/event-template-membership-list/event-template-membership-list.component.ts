/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/table';
import {
  EventTemplateMembership,
  Group,
  User,
} from 'src/app/generated/alloy.api';

@Component({
  selector: 'app-event-template-membership-list',
  templateUrl: './event-template-membership-list.component.html',
  styleUrls: ['./event-template-membership-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventTemplateMembershipListComponent implements OnInit, OnChanges {
  @Input()
  users: User[];

  @Input()
  groups: Group[];

  @Input()
  canEdit: boolean;

  @Output()
  createMembership = new EventEmitter<EventTemplateMembership>();

  viewColumns = ['name', 'type'];
  editColumns = ['actions'];
  displayedColumns = this.viewColumns;

  dataSource = new MatTableDataSource<EventTemplateMemberModel>();

  filterString = '';

  constructor(public snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  ngOnChanges() {
    this.dataSource.data = this.buildModel();

    this.displayedColumns = this.viewColumns.concat(
      this.canEdit ? this.editColumns : []
    );
  }

  add(id: string, type: string) {
    const eventTemplateMembership = {} as EventTemplateMembership;

    if (type === 'User') {
      eventTemplateMembership.userId = id;
    } else if (type === 'Group') {
      eventTemplateMembership.groupId = id;
    }

    this.createMembership.emit(eventTemplateMembership);
  }

  buildModel(): EventTemplateMemberModel[] {
    const eventTemplateMemberModels = [] as EventTemplateMemberModel[];

    this.users.forEach((x) => {
      eventTemplateMemberModels.push({
        user: x,
        group: null,
        id: x.id,
        name: x.name,
        type: 'User',
      });
    });

    this.groups.forEach((x) => {
      eventTemplateMemberModels.push({
        user: null,
        group: x,
        id: x.id,
        name: x.name,
        type: 'Group',
      });
    });

    return eventTemplateMemberModels;
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

export interface EventTemplateMemberModel {
  user: User;
  group: Group;
  id: string;
  name: string;
  type: string;
}
