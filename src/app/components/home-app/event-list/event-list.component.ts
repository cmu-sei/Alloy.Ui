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
import { Theme } from '@cmusei/crucible-common';
import { combineQueries } from '@datorama/akita';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { filter, share, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { EventTemplate } from 'src/app/generated/alloy.api/model/eventTemplate';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { CurrentUserQuery } from 'src/app/data/user/user.query';

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
  public eventTemplateDataSource: MatTableDataSource<EventTemplate>;
  public eventTemplateDisplayedColumns: string[] = [
    'name',
    'description',
    'durationHours',
  ];

  public filterString: string;
  public doneLoading = false;
  private unsubscribe$: Subject<null> = new Subject<null>();
  theme$: Observable<Theme>;

  constructor(
    private eventDataService: EventDataService,
    private templateDataService: EventTemplateDataService,
    private eventTemplateQuery: EventTemplateQuery,
    private router: Router,
    private routerQuery: RouterQuery,
    private currentUserQuery: CurrentUserQuery
  ) {
    this.theme$ = this.currentUserQuery.userTheme$;

    this.eventTemplateDataSource = new MatTableDataSource<EventTemplate>(
      new Array<EventTemplate>()
    );
  }

  ngOnInit() {
    this.filterString = '';
    // Initial datasource
    this.templateDataService.loadTemplates();
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
          this.doneLoading = !loading;
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();
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
