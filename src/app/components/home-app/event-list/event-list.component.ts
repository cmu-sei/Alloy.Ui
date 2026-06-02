// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';
import { Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { ComnAuthQuery, Theme } from '@cmusei/crucible-common';
import { combineQueries } from '@datorama/akita';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { filter, share, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { EventTemplate } from 'src/app/generated/alloy.api/model/eventTemplate';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api/model/event';
import { EventStatus } from 'src/app/generated/alloy.api/model/eventStatus';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { UserEventsQuery } from 'src/app/data/event/user-events.query';

@Component({
    selector: 'app-event-list',
    templateUrl: './event-list.component.html',
    styleUrls: ['./event-list.component.scss'],
    animations: [
        trigger('detailExpand', [
            state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden' })),
            state('expanded', style({ height: '*', visibility: 'visible' })),
            transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
        ]),
    ],
    standalone: false
})
export class EventListComponent implements OnInit, OnDestroy {
  @Input() templates: EventTemplate[];
  @ViewChild('sortTemplate', { static: true }) eventTemplateSort: MatSort;
  @ViewChild('sortEvent', { static: true }) eventSort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  public eventTemplateDataSource: MatTableDataSource<EventTemplate>;
  public eventTemplateDisplayedColumns: string[] = [
    'name',
    'description',
    'durationHours',
    'status',
  ];
  public columnHeaders: { [key: string]: string } = {
    'name': 'Event Name',
    'description': 'Description',
    'durationHours': 'Duration (Hours)',
    'status': 'Status'
  };
  public userEvents: AlloyEvent[] = [];
  public eventStatusMap: Map<string, string> = new Map();

  public filterString: string;
  public doneLoading = false;
  private unsubscribe$: Subject<null> = new Subject<null>();
  theme$: Observable<Theme>;

  constructor(
    private eventDataService: EventDataService,
    private templateDataService: EventTemplateDataService,
    private eventTemplateQuery: EventTemplateQuery,
    private userEventsQuery: UserEventsQuery,
    private router: Router,
    private authQuery: ComnAuthQuery
  ) {
    this.theme$ = this.authQuery.userTheme$;

    this.eventTemplateDataSource = new MatTableDataSource<EventTemplate>(
      new Array<EventTemplate>()
    );
  }

  ngOnInit() {
    this.filterString = '';
    // Initial datasource
    this.templateDataService.loadTemplates();
    // Get events excluding ended/failed/expired for status display
    this.eventDataService.getUserEvents(false).pipe(takeUntil(this.unsubscribe$)).subscribe();

    // Watch for event updates and refresh status map
    this.userEventsQuery.selectAll()
      .pipe(
        tap(events => {
          this.userEvents = events;
          this.updateEventStatusMap(events);
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

    combineQueries([
      this.eventTemplateQuery.selectLoading(),
      this.eventTemplateQuery.selectAll(),
    ])
      .pipe(
        filter(([loading]) => !loading),
        tap(([loading, templates]) => {
          this.eventTemplateDataSource.data = templates;
          this.eventTemplateSort.sort(<MatSortable>{
            id: 'name',
            start: 'asc',
          });
          this.eventTemplateDataSource.sort = this.eventTemplateSort;
          this.eventTemplateDataSource.paginator = this.paginator;
          this.doneLoading = !loading;
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();
  }

  updateEventStatusMap(events: AlloyEvent[]) {
    // Create new Map to trigger change detection
    const newStatusMap = new Map<string, string>();

    // Group events by template ID and find most recent active/creating event
    const templateEventMap = new Map<string, AlloyEvent[]>();
    events.forEach(event => {
      if (event.eventTemplateId) {
        if (!templateEventMap.has(event.eventTemplateId)) {
          templateEventMap.set(event.eventTemplateId, []);
        }
        templateEventMap.get(event.eventTemplateId)!.push(event);
      }
    });

    // For each template, determine status from most recent non-ended event
    templateEventMap.forEach((templateEvents, templateId) => {
      // Sort by date, most recent first
      const sortedEvents = templateEvents.sort((a, b) => {
        const aDate = new Date(a.dateCreated!).getTime();
        const bDate = new Date(b.dateCreated!).getTime();
        return bDate - aDate;
      });

      // Find first non-ended event or most recent ended
      const activeEvent = sortedEvents.find(e => e.status !== EventStatus.Ended) || sortedEvents[0];

      if (activeEvent) {
        newStatusMap.set(templateId, this.getEventStatusText(activeEvent));
      }
    });

    // Replace Map reference to trigger change detection
    this.eventStatusMap = newStatusMap;
  }

  getEventStatusText(event: AlloyEvent): string {
    if (!event.status) {
      return '-';
    }
    // Return the status string directly (EventStatus is already a string enum)
    return event.status;
  }

  getStatusForTemplate(templateId: string): string {
    return this.eventStatusMap.get(templateId) || '-';
  }

  /**
   * Called by UI to add a filter to the DataSource
   * filterValue
   */
  applyFilter(filterValue: string) {
    this.filterString = filterValue;
    filterValue = filterValue.trim(); // Remove whitespace
    filterValue = filterValue.toLowerCase(); // MatTableDataSource defaults to lowercase matches
    this.eventTemplateDataSource.filter = filterValue;
  }

  /**
   * Clears the search string
   */
  clearFilter() {
    this.applyFilter('');
  }

  openEvent(id: string) {
    this.router.navigate(['/templates/' + id]);
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
