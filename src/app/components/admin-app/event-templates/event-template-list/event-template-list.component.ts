// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
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
  SystemPermission,
  View,
} from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventTemplateEditComponent } from '../event-template-edit/event-template-edit.component';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { MatDialog } from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-event-template-list',
  templateUrl: './event-template-list.component.html',
  styleUrls: ['./event-template-list.component.scss'],
  standalone: false
})
export class EventTemplateListComponent implements OnDestroy, OnInit {
  @Input() viewList: Observable<View[]>;
  @Input() directoryList: Observable<Directory[]>;
  @Input() scenarioTemplateList: Observable<EventTemplate[]>;
  @Input() set eventTemplates(value: EventTemplate[]) {
    this._eventTemplates = value || [];
    this.applyFilter();
  }
  @Input() isLoading: boolean;
  @Input() adminMode = false;

  filterControl = new UntypedFormControl();
  filterString = '';
  filteredEventTemplateList: EventTemplate[] = [];
  displayedEventTemplates: EventTemplate[] = [];
  pageIndex = 0;
  pageSize = 20;
  sort: Sort = { active: 'dateCreated', direction: 'desc' };
  systemPermissions: SystemPermission[] = [];
  private _eventTemplates: EventTemplate[] = [];
  private unsubscribe$ = new Subject();

  constructor(
    public dialog: MatDialog,
    public dialogService: DialogService,
    private eventTemplateDataService: EventTemplateDataService,
    private settingsService: ComnSettingsService,
    private permissionDataService: PermissionDataService
  ) {
    this.eventTemplateDataService.loadTemplates();
    this.isLoading = false;
    this.permissionDataService
      .load()
      .subscribe(
        (x) => (this.systemPermissions = this.permissionDataService.permissions)
      );
  }

  canCreateEventTemplates(): boolean {
    return this.permissionDataService.canCreateEventTemplates();
  }

  canCreateEvents(): boolean {
    return this.permissionDataService.canCreateEvents();
  }

  canEditEventTemplate(id: string): boolean {
    return this.permissionDataService.canEditEventTemplate(id);
  }

  canManageEventTemplate(id: string): boolean {
    return this.permissionDataService.canManageEventTemplate(id);
  }

  ngOnInit() {
    this.filterControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$)
      )
      .subscribe((term) => {
        this.filterString = term.trim().toLowerCase();
        this.applyFilter();
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  applyFilter() {
    this.filteredEventTemplateList = this._eventTemplates.filter(et =>
      !this.filterString ||
      et.name?.toLowerCase().includes(this.filterString) ||
      et.description?.toLowerCase().includes(this.filterString)
    );
    this.sortList(this.sort);
  }

  sortList(sort: Sort) {
    this.sort = sort;
    this.filteredEventTemplateList.sort((a, b) => this.sortEventTemplates(a, b, sort.active, sort.direction));
    this.applyPagination();
  }

  private sortEventTemplates(a: EventTemplate, b: EventTemplate, column: string, direction: string) {
    const isAsc = direction !== 'desc';
    switch (column) {
      case 'name':
        return ((a.name?.toLowerCase() ?? '') < (b.name?.toLowerCase() ?? '') ? -1 : 1) * (isAsc ? 1 : -1);
      case 'description':
        return ((a.description?.toLowerCase() ?? '') < (b.description?.toLowerCase() ?? '') ? -1 : 1) * (isAsc ? 1 : -1);
      case 'dateCreated':
        return ((a.dateCreated ?? '') < (b.dateCreated ?? '') ? -1 : 1) * (isAsc ? 1 : -1);
      default:
        return 0;
    }
  }

  paginatorEvent(page: PageEvent) {
    this.pageIndex = page.pageIndex;
    this.pageSize = page.pageSize;
    this.applyPagination();
  }

  applyPagination() {
    const startIndex = this.pageIndex * this.pageSize;
    this.displayedEventTemplates = this.filteredEventTemplateList.slice(startIndex, startIndex + this.pageSize);
  }

  addNewEventTemplate() {
    const eventTemplate = <EventTemplate>{
      name: 'New Event Template',
      description: 'Add description',
    };

    this.eventTemplateDataService
      .addNew(eventTemplate)
      .pipe(take(1))
      .subscribe();
  }

  editEventTemplate(eventTemplate: EventTemplate) {
    const dialogRef = this.dialog.open(EventTemplateEditComponent, {
      maxWidth: '100vw',
      width: 'auto',
      data: {
        eventTemplate: { ...eventTemplate },
        viewList: this.viewList,
        directoryList: this.directoryList,
        scenarioTemplateList: this.scenarioTemplateList,
        canEdit: this.permissionDataService.canEditEventTemplate(eventTemplate.id),
        canManage: this.permissionDataService.canManageEventTemplate(eventTemplate.id),
        canCreate: this.permissionDataService.canCreateEventTemplates()
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      switch (result.action) {
        case 'clone':
          this.eventTemplateDataService
            .addNew(result.eventTemplate)
            .pipe(take(1))
            .subscribe();
          break;
        case 'save':
          this.eventTemplateDataService.update(result.eventTemplate);
          break;
        case 'delete':
          this.eventTemplateDataService.delete(result.eventTemplate.id);
          break;
        default:
          break;
      }
      dialogRef.close();
    });
  }

}
