// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import {
  MatPaginator,
  PageEvent,
} from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { map, take, takeUntil } from 'rxjs/operators';
import { Subject, Observable, of } from 'rxjs';
import {
  fromMatPaginator,
  fromMatSort,
  paginateRows,
  sortRows,
} from 'src/app/datasource-utils';
import {
  Event as AlloyEvent,
  EventErrorDetail,
  EventService,
} from 'src/app/generated/alloy.api';
import { EventEditComponent } from '../event-edit/event-edit.component';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventQuery } from 'src/app/data/event/event.query';

export interface Action {
  Value: string;
  Text: string;
}

@Component({
  selector: 'app-admin-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  standalone: false
})
export class AdminEventListComponent implements OnInit, OnDestroy {
  displayedColumns: string[] = [
    'actions',
    'name',
    'username',
    'status',
    'statusDate',
    'launchDate',
    'expirationDate',
  ];
  expandedEventId: string | null = null;
  filterString: string;

  /**
   * The full diagnostic text is not on the Event view model - it can run to kilobytes of
   * Terraform output - so it is fetched from GET /api/events/{id}/error-detail only when a
   * row is expanded, and cached per event for as long as the list is open.
   */
  errorDetails = new Map<string, EventErrorDetail>();
  loadingErrorDetailFor: string | null = null;

  /** Empty when no CasterUIAddress is configured, in which case no Caster link is offered. */
  casterUIAddress: string;

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
  displayedRows$: Observable<AlloyEvent[]> = of([]);
  totalRows$: Observable<number> = of(0);
  sortEvents$: Observable<Sort>;
  pageEvents$: Observable<PageEvent>;

  @Input() refresh: Subject<boolean>;
  @ViewChild(MatPaginator, { static: true }) paginator: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort: MatSort;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private eventService: EventService,
    private dialog: MatDialog,
    private settingsService: ComnSettingsService,
    private permissionDataService: PermissionDataService,
    private eventDataService: EventDataService,
    private eventQuery: EventQuery,
    public snackBar: MatSnackBar
  ) {
    this.casterUIAddress = this.settingsService.settings.CasterUIAddress;

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
    this.eventQuery
      .selectAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe((events) => this.updateEvents(events));
    this.refresh
      ?.pipe(takeUntil(this.destroy$))
      .subscribe((shouldRefresh) => {
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
    this.eventDataService.getAllEvents().pipe(take(1)).subscribe({
      next: () => {
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      },
    });
  }

  private updateEvents(events: AlloyEvent[]) {
    this.activeEvents.length = 0;
    this.endedEvents.length = 0;
    this.failedEvents.length = 0;
    events.forEach((event) => {
      const normalizedEvent: AlloyEvent = {
        ...event,
        launchDate: !event.launchDate ? null : new Date(event.launchDate),
        endDate: !event.endDate ? null : new Date(event.endDate),
        expirationDate: !event.expirationDate
          ? null
          : new Date(event.expirationDate),
        statusDate: !event.statusDate ? null : new Date(event.statusDate),
      };
      switch (normalizedEvent.status) {
        case 'Failed': {
          this.failedEvents.push(normalizedEvent);
          break;
        }
        case 'Ended':
        case 'Expired': {
          this.endedEvents.push(normalizedEvent);
          break;
        }
        default: {
          this.activeEvents.push(normalizedEvent);
          break;
        }
      }
    });
    this.filterAndSort();
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
      minWidth: '400px',
      maxWidth: '90vw',
      width: '640px',
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

  selectEvent(id: string) {
    this.expandedEventId = this.expandedEventId === id ? null : id;

    if (this.expandedEventId) {
      this.loadErrorDetail(this.expandedEventId);
    }
  }

  private loadErrorDetail(id: string) {
    if (this.errorDetails.has(id) || this.loadingErrorDetailFor === id) {
      return;
    }

    this.loadingErrorDetailFor = id;
    this.eventService
      .getEventErrorDetail(id)
      .pipe(take(1))
      .subscribe({
        next: (detail) => {
          this.errorDetails.set(id, detail);
          this.loadingErrorDetailFor = null;
        },
        // A 403 here is normal - the endpoint needs system-wide ManageEvents, which an
        // Event-scoped manager does not have - so leave the panel
        // showing just the summary rather than surfacing an error the user cannot act on.
        error: () => {
          this.loadingErrorDetailFor = null;
        },
      });
  }

  errorDetail(id: string): string {
    return this.errorDetails.get(id)?.errorDetail;
  }

  canEdit(id: string): boolean {
    return this.permissionDataService.canEditEvent(id);
  }

  canManage(id: string): boolean {
    return this.permissionDataService.canManageEvent(id);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
