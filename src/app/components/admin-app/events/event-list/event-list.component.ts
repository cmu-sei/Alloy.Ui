// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  Input,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import {
  MatPaginator,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { map, take } from 'rxjs/operators';
import { Subject, Observable, of } from 'rxjs';
import {
  fromMatPaginator,
  fromMatSort,
  paginateRows,
  sortRows,
} from 'src/app/datasource-utils';
import { Event as AlloyEvent, EventService } from 'src/app/generated/alloy.api';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { EventEditComponent } from '../event-edit/event-edit.component';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

export interface Action {
  Value: string;
  Text: string;
}

@Component({
    selector: 'app-admin-event-list',
    templateUrl: './event-list.component.html',
    styleUrls: ['./event-list.component.scss'],
    standalone: false
})
export class AdminEventListComponent implements OnInit {
  displayedColumns: string[] = [
    'name',
    'username',
    'status',
    'statusDate',
    'launchDate',
    'expirationDate',
  ];
  filterString: string;

  editEventText = 'Edit Event';
  eventToEdit: AlloyEvent;
  eventDataSource = new MatTableDataSource<AlloyEvent>(new Array<AlloyEvent>());
  activeEvents = new Array<AlloyEvent>();
  failedEvents = new Array<AlloyEvent>();
  endedEvents = new Array<AlloyEvent>();
  showActive = true;
  showFailed = false;
  showEnded = false;
  topBarColor = '#719F94';
  topBarTextColor = '#FFFFFF';
  // MatPaginator Output
  defaultPageSize = 10;
  pageEvent: PageEvent;
  isLoading: Boolean;
  displayedRows$: Observable<AlloyEvent[]>;
  totalRows$: Observable<number>;
  sortEvents$: Observable<Sort>;
  pageEvents$: Observable<PageEvent>;

  @Input() refresh: Subject<boolean>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;

  constructor(
    private eventService: EventService,
    public dialogService: DialogService,
    private dialog: MatDialog,
    private settingsService: ComnSettingsService,
    private permissionDataService: PermissionDataService
  ) {
    // Set the topbar color from config file
    this.topBarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topBarColor;
    this.topBarTextColor = this.settingsService.settings.AppTopBarHexTextColor
      ? this.settingsService.settings.AppTopBarHexTextColor
      : this.topBarTextColor;
  }

  /**
   * Initialization
   */
  ngOnInit() {
    this.sortEvents$ = fromMatSort(this.sort);
    this.pageEvents$ = fromMatPaginator(this.paginator);
    this.refresh.subscribe((shouldRefresh) => {
      if (shouldRefresh) {
        this.refreshEvents();
      }
    });
    this.refreshEvents();
  }

  /**
   * Called by UI to add a filter to the viewDataSource
   * @param filterValue
   */
  applyFilter(filterValue: string) {
    this.filterString = filterValue;
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.eventDataSource.filter = filterValue;
    this.filterAndSort();
  }

  /**
   * Clears the search string
   */
  clearFilter() {
    this.applyFilter('');
  }

  /**
   * Refreshes the events list and updates the mat table control
   */
  refreshEvents() {
    this.isLoading = true;
    this.eventToEdit = undefined;
    this.eventService.getEvents().subscribe((events) => {
      this.activeEvents.length = 0;
      this.endedEvents.length = 0;
      this.failedEvents.length = 0;
      events.forEach((event) => {
        event.launchDate = !event.launchDate
          ? null
          : new Date(event.launchDate);
        event.endDate = !event.endDate ? null : new Date(event.endDate);
        event.expirationDate = !event.expirationDate
          ? null
          : new Date(event.expirationDate);
        event.statusDate = !event.statusDate
          ? null
          : new Date(event.statusDate);
        switch (event.status) {
          case 'Failed': {
            this.failedEvents.push(event);
            break;
          }
          case 'Ended':
          case 'Expired': {
            this.endedEvents.push(event);
            break;
          }
          default: {
            this.activeEvents.push(event);
            break;
          }
        }
      });
      this.filterAndSort();
      this.isLoading = false;
    });
  }

  /**
   * filters and sorts the displayed rows
   */
  filterAndSort() {
    this.eventDataSource.data = this.selectEvents();
    const rows$ = of(this.eventDataSource.filteredData);
    this.totalRows$ = rows$.pipe(map((rows) => rows.length));
    this.displayedRows$ = rows$.pipe(
      sortRows(this.sortEvents$),
      paginateRows(this.pageEvents$)
    );
  }

  /**
   * filters the events by status (active, ended, failed)
   */
  selectEvents() {
    let selectedEvents = new Array<AlloyEvent>();
    if (this.showActive) {
      selectedEvents = selectedEvents.concat(this.activeEvents);
    }
    if (this.showEnded) {
      selectedEvents = selectedEvents.concat(this.endedEvents);
    }
    if (this.showFailed) {
      selectedEvents = selectedEvents.concat(this.failedEvents);
    }
    return selectedEvents;
  }

  /**
   * Adds a new event
   */
  addNewEvent() {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(8, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + 1);
    const event = {
      name: 'New Event',
      description: 'Add description',
      status: 'ready',
      startDate: startDate,
      endDate: endDate,
    };
    this.eventService.createEvent(<AlloyEvent>event).subscribe((event) => {
      this.refreshEvents();
      this.editEvent(event);
    });
  }

  editEvent(event: AlloyEvent) {
    const dialogRef = this.dialog.open(EventEditComponent, {
      width: '800px',
      data: {
        event: { ...event },
        canEdit: this.canEdit(event.id),
        canManage: this.canManage(event.id),
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      switch (result.action) {
        case 'end':
          this.eventService
            .endEvent(result.event.id)
            .pipe(take(1))
            .subscribe(() => {
              this.refreshEvents();
            });
          break;
        case 'save':
          this.eventService
            .updateEvent(result.event.id, result.event)
            .pipe(take(1))
            .subscribe(() => {
              this.refreshEvents();
            });
          break;
        case 'delete':
          this.eventService
            .deleteEvent(result.event.id)
            .pipe(take(1))
            .subscribe(() => {
              this.refreshEvents();
            });
          break;
        default:
          break;
      }
      dialogRef.close();
    });
  }

  canEdit(id: string): boolean {
    return this.permissionDataService.canEditEvent(id);
  }

  canManage(id: string): boolean {
    return this.permissionDataService.canManageEvent(id);
  }

}
