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
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { UntypedFormControl } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
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
import { ComnSettingsService } from '@cmusei/crucible-common';
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
  displayedColumns: string[] = ['select', 'actions', 'name', 'description', 'durationHours', 'dateCreated'];
  eventTemplateDataSource = new MatTableDataSource<EventTemplate>([]);
  expandedEventTemplateId: string | null = null;
  systemPermissions: SystemPermission[] = [];
  /** Event Template ids chosen for export. */
  selection = new SelectionModel<string>(true, []);
  private archiveDialogRef: MatDialogRef<any>;
  private unsubscribe$ = new Subject();

  constructor(
    public dialog: MatDialog,
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

  /** Whether every Event Template that passes the current filter is selected. */
  isAllSelected(): boolean {
    const rows = this.eventTemplateDataSource.filteredData;
    return rows.length > 0 && rows.every((row) => this.selection.isSelected(row.id));
  }

  /** Selects every Event Template that passes the current filter, or clears the selection. */
  toggleAllRows() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.selection.select(...this.eventTemplateDataSource.filteredData.map((row) => row.id));
  }

  /** The selected Event Templates that are still in the list, or every one in the list if none are selected. */
  exportIds(): string[] {
    const ids = this.eventTemplateDataSource.data.map((row) => row.id);
    return this.selection.hasValue()
      ? ids.filter((id) => this.selection.isSelected(id))
      : ids;
  }

  /**
   * Whether an export with nothing selected can ask for every template rather than list each id. That needs
   * the ViewEventTemplates system permission, and keeps a long list of ids out of the query string.
   */
  canExportAll(): boolean {
    return (
      !this.selection.hasValue() &&
      this.systemPermissions.includes(SystemPermission.ViewEventTemplates)
    );
  }

  openDialog(templateRef: TemplateRef<any>) {
    this.archiveDialogRef = this.dialog.open(templateRef, {
      autoFocus: true,
      width: '480px',
      maxWidth: '90vw',
    });
  }

  closeDialog() {
    this.archiveDialogRef?.close();
  }

  importComplete() {
    // The data service reloads the list once the import returns
    this.archiveDialogRef?.close();
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
    // Refresh template lists from external services before opening dialog
    this.refreshTemplates.emit();

    const dialogRef = this.dialog.open(EventTemplateEditComponent, {
      minWidth: '400px',
      maxWidth: '90vw',
      width: '600px',
      data: {
        eventTemplate: <EventTemplate>{},
        viewList: this.viewList,
        directoryList: this.directoryList,
        scenarioTemplateList: this.scenarioTemplateList,
        // A new template has no id yet, so per-template edit/manage checks
        // don't apply. The create permission gates opening this dialog and
        // governs the template being created.
        canEdit: this.permissionDataService.canCreateEventTemplates(),
        canManage: this.permissionDataService.canCreateEventTemplates(),
        canCreate: this.permissionDataService.canCreateEventTemplates(),
        hasEvents: false,
        isNew: true,
      },
    });
    dialogRef.componentInstance.editComplete.subscribe((result) => {
      if (result.action === 'save' || result.action === 'clone') {
        // Close only once the create has been accepted. The API rejects a template whose
        // Player View has no default team, and closing first would discard the edits and
        // leave the user with no idea the save never happened.
        this.eventTemplateDataService
          .addNew(result.eventTemplate)
          .pipe(take(1))
          .subscribe({
            next: () => dialogRef.close(),
            error: (err) => dialogRef.componentInstance.showSaveError(err),
          });
        return;
      }
      dialogRef.close();
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
          width: '600px',
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
            // Both of these can be rejected by the API, so they close the dialog
            // themselves once the request succeeds and report the reason if it does not.
            case 'clone':
              this.eventTemplateDataService
                .addNew(result.eventTemplate)
                .pipe(take(1))
                .subscribe({
                  next: () => dialogRef.close(),
                  error: (err) => dialogRef.componentInstance.showSaveError(err),
                });
              return;
            case 'save':
              this.eventTemplateDataService
                .update(result.eventTemplate)
                .subscribe({
                  next: () => dialogRef.close(),
                  error: (err) => dialogRef.componentInstance.showSaveError(err),
                });
              return;
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
