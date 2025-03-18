// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  AfterViewInit,
  Component,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import {
  debounceTime,
  distinctUntilChanged,
  take,
  takeUntil,
} from 'rxjs/operators';
import { Observable, Subject } from 'rxjs';
import {
  Directory,
  EventTemplate,
  ScenarioTemplate,
  View,
} from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventTemplateEditComponent } from '../event-template-edit/event-template-edit.component';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { MatTableDataSource } from '@angular/material/table';
import { animate, style, transition, trigger } from '@angular/animations';
import { MatSort } from '@angular/material/sort';

@Component({
  selector: 'app-event-template-list',
  templateUrl: './event-template-list.component.html',
  styleUrls: ['./event-template-list.component.scss'],
  animations: [
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('0.3s ease-out', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1 }),
        animate('0.3s ease-in', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class EventTemplateListComponent
  implements OnDestroy, AfterViewInit, OnInit
{
  @Input() viewList: Observable<View[]>;
  @Input() directoryList: Observable<Directory[]>;
  @Input() eventTemplateList: Observable<EventTemplate[]>;
  @Input() set eventTemplates(value: EventTemplate[]) {
    this.dataSource.data = value;
  }
  @Input() isLoading: boolean;
  @Input() adminMode = false;

  @ViewChild(EventTemplateEditComponent, { static: true })
  eventTemplateEditComponent: EventTemplateEditComponent;

  displayedColumns: string[] = [
    'name',
    'description',
    'durationHours',
    'dateCreated',
  ];
  editEventTemplateText = 'Edit Event Template';

  // MatPaginator Output
  defaultPageSize = 10;
  pageEvent: PageEvent;
  pageEvents$: Observable<PageEvent>;
  private unsubscribe$ = new Subject();
  topBarColor = '#719F94';
  topBarTextColor = '#FFFFFF';
  dataSource = new MatTableDataSource<EventTemplate>();
  expandedElementId = null;
  filterControl = new UntypedFormControl();

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild(MatPaginator) paginator: MatPaginator;

  constructor(
    public eventTemplateDataService: EventTemplateDataService,
    private settingsService: ComnSettingsService
  ) {
    this.eventTemplateDataService.loadTemplates();

    this.isLoading = false;
    // Set the topbar color from config file
    this.topBarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topBarColor;
    this.topBarTextColor = this.settingsService.settings.AppTopBarHexTextColor
      ? this.settingsService.settings.AppTopBarHexTextColor
      : this.topBarTextColor;
  }

  ngOnInit() {
    this.filterControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$)
      )
      .subscribe((filter) => this.onFilterChanged(filter));
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  clearFilter() {
    this.applyFilter('');
  }

  addNewEventTemplate() {
    const eventTemplate = <EventTemplate>{
      name: 'New Event Template',
      description: 'Add description',
    };

    this.eventTemplateDataService
      .addNew(eventTemplate)
      .pipe(take(1))
      .subscribe((x) => (this.expandedElementId = x.id));
  }

  trackById(item: EventTemplate): string {
    return item.id;
  }

  onFilterChanged(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  applyFilter(filterValue: string) {
    this.filterControl.setValue(filterValue);
  }
}
