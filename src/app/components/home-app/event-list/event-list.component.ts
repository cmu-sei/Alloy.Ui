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
import { MatSort, MatSortable } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { ComnAuthQuery, Theme } from '@cmusei/crucible-common';
import { combineQueries } from '@datorama/akita';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { filter, share, takeUntil, tap } from 'rxjs/operators';
import { EventTemplate } from 'src/app/generated/alloy.api/model/eventTemplate';
import { EventTemplatesService } from 'src/app/services/event-templates/event-templates.service';
import { EventsService } from '../../../services/events/events.service';
import { EventTemplatesQuery } from '../../../state/event-templates/event-templates.query';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state(
        'collapsed',
        style({ height: '0px', minHeight: '0', visibility: 'hidden' })
      ),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')
      ),
    ]),
  ],
})
export class EventListComponent implements OnInit, OnDestroy {
  @Input() templates: EventTemplate[];
  @ViewChild('sortTemplate', { static: true }) eventTemplateSort: MatSort;
  @ViewChild('sortEvent', { static: true }) eventSort: MatSort;
  public eventTemplateDataSource: MatTableDataSource<EventTemplate>;
  public eventTemplateDisplayedColumns: string[] = [
    'name',
    'description',
    'durationHours',
  ];

  public filterString: string;
  public isLoading$: Observable<Boolean>;
  private unsubscribe$: Subject<null> = new Subject<null>();
  theme$: Observable<Theme>;

  constructor(
    private eventsService: EventsService,
    private templateService: EventTemplatesService,
    private TemplatesQuery: EventTemplatesQuery,
    private router: Router,
    private routerQuery: RouterQuery,
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
    this.templateService.loadTemplates();

    combineQueries([
      this.TemplatesQuery.selectLoading(),
      this.TemplatesQuery.selectAll(),
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
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

    this.isLoading$ = this.TemplatesQuery.selectLoading().pipe(
      share({
        connector: () => new ReplaySubject(),
      })
    );
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
