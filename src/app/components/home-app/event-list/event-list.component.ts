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
  inject,
} from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortable, MatSortHeader } from '@angular/material/sort';
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
import { Router, RouterLink } from '@angular/router';
import { ComnAuthQuery, Theme } from '@cmusei/crucible-common';
import { combineQueries } from '@datorama/akita';
import { Observable, Subject, ReplaySubject } from 'rxjs';
import { filter, share, shareReplay, takeUntil, tap } from 'rxjs/operators';
import { EventTemplate } from 'src/app/generated/alloy.api/model/eventTemplate';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { MatIcon } from '@angular/material/icon';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-event-list',
  templateUrl: './event-list.component.html',
  styleUrls: ['./event-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state(
        'collapsed',
        style({ height: '0px', minHeight: '0', visibility: 'hidden' }),
      ),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition(
        'expanded <=> collapsed',
        animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)'),
      ),
    ]),
  ],
  imports: [
    MatIcon,
    MatFormField,
    MatInput,
    FormsModule,
    MatIconButton,
    MatSuffix,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatSortHeader,
    MatCellDef,
    MatCell,
    RouterLink,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatCard,
    MatProgressSpinner,
    MatPaginator,
    DatePipe,
  ],
})
export class EventListComponent implements OnInit, OnDestroy {
  private eventDataService = inject(EventDataService);
  private templateDataService = inject(EventTemplateDataService);
  private eventTemplateQuery = inject(EventTemplateQuery);
  private router = inject(Router);
  private authQuery = inject(ComnAuthQuery);

  @Input() templates: EventTemplate[];
  @ViewChild('sortTemplate', { static: true }) eventTemplateSort: MatSort;
  @ViewChild('sortEvent', { static: true }) eventSort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  public eventTemplateDataSource: MatTableDataSource<EventTemplate>;
  public eventTemplateDisplayedColumns: string[] = [
    'name',
    'description',
    'durationHours',
    'dateCreated',
  ];
  public columnHeaders: { [key: string]: string } = {
    name: 'Name',
    description: 'Description',
    durationHours: 'Duration (Hours)',
    dateCreated: 'Created',
  };

  public filterString: string;
  public doneLoading = false;
  private unsubscribe$: Subject<null> = new Subject<null>();
  theme$: Observable<Theme>;

  constructor() {
    this.theme$ = this.authQuery.userTheme$;

    this.eventTemplateDataSource = new MatTableDataSource<EventTemplate>(
      new Array<EventTemplate>(),
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
          this.eventTemplateDataSource.paginator = this.paginator;
          this.doneLoading = !loading;
        }),
        takeUntil(this.unsubscribe$),
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
