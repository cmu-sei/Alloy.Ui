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
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
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
import { NameDialogComponent } from 'src/app/shared/name-dialog/name-dialog.component';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { EventService } from 'src/app/generated/alloy.api';

@Component({
  selector: 'app-event-template-list',
  templateUrl: './event-template-list.component.html',
  styleUrls: ['./event-template-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ]),
  ],
  standalone: false
})
export class EventTemplateListComponent implements AfterViewInit, OnDestroy, OnInit {
  @Input() viewList: Observable<View[]>;
  @Input() directoryList: Observable<Directory[]>;
  @Input() scenarioTemplateList: Observable<EventTemplate[]>;
  @Input() set eventTemplates(value: EventTemplate[]) {
    this.eventTemplateDataSource.data = value || [];
  }
  @Input() isLoading: boolean;
  @Input() adminMode = false;
  @Output() refreshTemplates = new EventEmitter<void>();

  @ViewChild(MatSort) sort: MatSort;
  @ViewChild('paginator') paginator: MatPaginator;

  filterControl = new UntypedFormControl();
  displayedColumns: string[] = ['actions', 'name', 'description', 'durationHours', 'dateCreated'];
  eventTemplateDataSource = new MatTableDataSource<EventTemplate>([]);
  expandedEventTemplateId: string | null = null;
  systemPermissions: SystemPermission[] = [];
  private unsubscribe$ = new Subject();

  constructor(
    public dialog: MatDialog,
    public dialogService: DialogService,
    private eventTemplateDataService: EventTemplateDataService,
    private settingsService: ComnSettingsService,
    private permissionDataService: PermissionDataService,
    private eventService: EventService
  ) {
    this.eventTemplateDataService.loadTemplates();
    this.isLoading = false;
    this.permissionDataService
      .load()
      .subscribe(
        (x) => (this.systemPermissions = this.permissionDataService.permissions)
      );
  }

  ngOnInit() {
    this.eventTemplateDataSource.filterPredicate = (data, filter) =>
      !filter ||
      (data.name?.toLowerCase().includes(filter)) ||
      (data.description?.toLowerCase().includes(filter));

    this.eventTemplateDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name': return item.name?.toLowerCase() ?? '';
        case 'description': return item.description?.toLowerCase() ?? '';
        case 'dateCreated': return item.dateCreated ?? '';
        default: return (item as any)[property] ?? '';
      }
    };

    this.filterControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$)
      )
      .subscribe((term) => {
        this.eventTemplateDataSource.filter = (term || '').trim().toLowerCase();
      });
  }

  ngAfterViewInit() {
    this.eventTemplateDataSource.sort = this.sort;
    this.eventTemplateDataSource.paginator = this.paginator;
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  selectEventTemplate(id: string) {
    this.expandedEventTemplateId = this.expandedEventTemplateId === id ? null : id;
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

  addNewEventTemplate() {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      width: '500px',
      data: {
        title: 'Create New Event Template',
        nameValue: '',
        showDescription: true,
        descriptionValue: '',
      },
    });
    dialogRef.componentInstance.title = 'Create New Event Template';
    dialogRef.afterClosed().subscribe((result) => {
      if (result && !result.wasCancelled) {
        const eventTemplate = <EventTemplate>{
          name: result.nameValue,
          description: result.descriptionValue || '',
        };
        this.eventTemplateDataService
          .addNew(eventTemplate)
          .pipe(take(1))
          .subscribe();
      }
    });
  }

  editEventTemplate(eventTemplate: EventTemplate) {
    // Refresh template lists from external services before opening dialog
    this.refreshTemplates.emit();

    this.eventService.getEventTemplateEvents(eventTemplate.id)
      .pipe(take(1))
      .subscribe((events) => {
        const hasEvents = events && events.length > 0;

        const dialogRef = this.dialog.open(EventTemplateEditComponent, {
          minWidth: '400px',
          maxWidth: '90vw',
          width: 'auto',
          data: {
            eventTemplate: { ...eventTemplate },
            viewList: this.viewList,
            directoryList: this.directoryList,
            scenarioTemplateList: this.scenarioTemplateList,
            canEdit: this.permissionDataService.canEditEventTemplate(eventTemplate.id),
            canManage: this.permissionDataService.canManageEventTemplate(eventTemplate.id),
            canCreate: this.permissionDataService.canCreateEventTemplates(),
            hasEvents: hasEvents
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
      });
  }
}
