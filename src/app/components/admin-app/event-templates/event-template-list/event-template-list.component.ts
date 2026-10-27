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
  Input,
  OnDestroy,
  OnInit,
  TemplateRef,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import {
  UntypedFormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort, MatSortHeader } from '@angular/material/sort';
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
  EventTemplatePermission,
  SystemPermission,
  View,
} from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventTemplateEditComponent } from '../event-template-edit/event-template-edit.component';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { EventService } from 'src/app/generated/alloy.api';
import { MatIcon } from '@angular/material/icon';
import { DatePipe } from '@angular/common';
import { MatFormField, MatInput, MatSuffix } from '@angular/material/input';
import { MatIconButton } from '@angular/material/button';
import { ClipboardModule } from 'ngx-clipboard';
import { EventTemplateMembershipsComponent } from '../event-template-memberships/event-template-memberships/event-template-memberships.component';
import { MatCard } from '@angular/material/card';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatBadge } from '@angular/material/badge';
import { MatTooltip } from '@angular/material/tooltip';
import { EventTemplateExportComponent } from '../event-template-export/event-template-export.component';
import { EventTemplateImportComponent } from '../event-template-import/event-template-import.component';

@Component({
  selector: 'app-event-template-list',
  templateUrl: './event-template-list.component.html',
  styleUrls: ['./event-template-list.component.scss'],
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0' })),
      state('expanded', style({ height: '*' })),
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
    ReactiveFormsModule,
    MatIconButton,
    MatSuffix,
    MatPaginator,
    MatTable,
    MatSort,
    MatColumnDef,
    MatHeaderCellDef,
    MatHeaderCell,
    MatCellDef,
    MatCell,
    ClipboardModule,
    MatSortHeader,
    EventTemplateMembershipsComponent,
    MatHeaderRowDef,
    MatHeaderRow,
    MatRowDef,
    MatRow,
    MatCard,
    MatProgressSpinner,
    DatePipe,
    MatCheckbox,
    MatBadge,
    MatTooltip,
    EventTemplateExportComponent,
    EventTemplateImportComponent,
  ],
})
export class EventTemplateListComponent
  implements AfterViewInit, OnDestroy, OnInit
{
  dialog = inject(MatDialog);
  private eventTemplateDataService = inject(EventTemplateDataService);
  private settingsService = inject(ComnSettingsService);
  private permissionDataService = inject(PermissionDataService);
  private eventService = inject(EventService);

  readonly viewList = input<Observable<View[]>>(undefined);
  readonly directoryList = input<Observable<Directory[]>>(undefined);
  readonly scenarioTemplateList = input<Observable<EventTemplate[]>>(undefined);
  @Input() set eventTemplates(value: EventTemplate[]) {
    this.eventTemplateDataSource.data = value || [];
    this.pruneSelection();
  }
  @Input() isLoading: boolean;
  readonly adminMode = input(false);
  readonly refreshTemplates = output<void>();

  readonly sort = viewChild(MatSort);
  readonly paginator = viewChild<MatPaginator>('paginator');

  filterControl = new UntypedFormControl();
  displayedColumns: string[] = [
    'select',
    'actions',
    'name',
    'description',
    'durationHours',
    'dateCreated',
  ];
  eventTemplateDataSource = new MatTableDataSource<EventTemplate>([]);
  expandedEventTemplateId: string | null = null;
  systemPermissions: SystemPermission[] = [];
  /** Event Template ids chosen for export. */
  selection = new SelectionModel<string>(true, []);
  private archiveDialogRef: MatDialogRef<any>;
  private unsubscribe$ = new Subject();

  constructor() {
    this.eventTemplateDataService.loadTemplates();
    this.isLoading = false;
    this.permissionDataService
      .load()
      .subscribe(
        (x) =>
          (this.systemPermissions = this.permissionDataService.permissions),
      );
  }

  ngOnInit() {
    this.eventTemplateDataSource.filterPredicate = (data, filter) =>
      !filter ||
      data.name?.toLowerCase().includes(filter) ||
      data.description?.toLowerCase().includes(filter);

    this.eventTemplateDataSource.sortingDataAccessor = (item, property) => {
      switch (property) {
        case 'name':
          return item.name?.toLowerCase() ?? '';
        case 'description':
          return item.description?.toLowerCase() ?? '';
        case 'dateCreated':
          return item.dateCreated ?? '';
        default:
          return (item as any)[property] ?? '';
      }
    };

    this.filterControl.valueChanges
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((term) => {
        this.eventTemplateDataSource.filter = (term || '').trim().toLowerCase();
      });
  }

  ngAfterViewInit() {
    this.eventTemplateDataSource.sort = this.sort();
    this.eventTemplateDataSource.paginator = this.paginator();
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  clearFilter() {
    this.filterControl.setValue('');
  }

  selectEventTemplate(id: string) {
    this.expandedEventTemplateId =
      this.expandedEventTemplateId === id ? null : id;
  }

  /** Whether every Event Template that passes the current filter is selected. */
  isAllSelected(): boolean {
    const rows = this.eventTemplateDataSource.filteredData;
    return (
      rows.length > 0 && rows.every((row) => this.selection.isSelected(row.id))
    );
  }

  /** Selects every Event Template that passes the current filter, or clears the selection. */
  toggleAllRows() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.selection.select(
          ...this.eventTemplateDataSource.filteredData.map((row) => row.id),
        );
  }

  /**
   * Drops selected ids whose Event Template is no longer in the list (deleted, or gone on a reload), so the
   * badge, the export count and the header checkbox only count templates the user can see.
   */
  private pruneSelection() {
    const ids = new Set(this.eventTemplateDataSource.data.map((row) => row.id));
    const gone = this.selection.selected.filter((id) => !ids.has(id));

    if (gone.length > 0) {
      this.selection.deselect(...gone);
    }
  }

  /** The Event Templates an export would take: the selection, or with nothing selected, what the search shows. */
  private exportCandidates(): EventTemplate[] {
    return this.selection.hasValue()
      ? this.eventTemplateDataSource.data.filter((row) =>
          this.selection.isSelected(row.id),
        )
      : this.eventTemplateDataSource.filteredData;
  }

  /**
   * Whether the user may export an Event Template, as the API decides: the ViewEventTemplates system
   * permission, or ViewEventTemplate on the template. A user without ViewEventTemplates also sees every
   * published template in the list, and the API refuses the whole export if one of them is asked for.
   */
  private canExport(eventTemplate: EventTemplate): boolean {
    return (
      this.systemPermissions.includes(SystemPermission.ViewEventTemplates) ||
      (eventTemplate.eventTemplatePermissions ?? []).some((claim) =>
        claim.split(',').includes(EventTemplatePermission.ViewEventTemplate),
      )
    );
  }

  /** The ids to export: the export candidates the user may export. */
  exportIds(): string[] {
    return this.exportCandidates()
      .filter((row) => this.canExport(row))
      .map((row) => row.id);
  }

  /** How many export candidates are left out because the user may not export them. */
  exportSkipped(): number {
    return this.exportCandidates().length - this.exportIds().length;
  }

  /** Whether nothing is selected and the search hides part of the list. */
  exportFiltered(): boolean {
    return (
      !this.selection.hasValue() &&
      this.eventTemplateDataSource.filteredData.length <
        this.eventTemplateDataSource.data.length
    );
  }

  /**
   * Whether an export can ask for every template rather than list each id: nothing is selected, the search
   * hides nothing, and the user holds the ViewEventTemplates system permission. It keeps a long list of ids
   * out of the query string.
   */
  canExportAll(): boolean {
    return (
      !this.selection.hasValue() &&
      !this.exportFiltered() &&
      this.systemPermissions.includes(SystemPermission.ViewEventTemplates)
    );
  }

  /** The export button's name, which says how many are selected, since the badge alone is not read out. */
  exportLabel(): string {
    const count = this.selection.selected.length;
    return count > 0
      ? `Export ${count} Selected Event Template${count === 1 ? '' : 's'}`
      : 'Export Event Templates';
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
        viewList: this.viewList(),
        directoryList: this.directoryList(),
        scenarioTemplateList: this.scenarioTemplateList(),
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

    this.eventService
      .getEventTemplateEvents(eventTemplate.id)
      .pipe(take(1))
      .subscribe((events) => {
        const hasEvents = events && events.length > 0;

        const dialogRef = this.dialog.open(EventTemplateEditComponent, {
          minWidth: '400px',
          maxWidth: '90vw',
          width: '600px',
          data: {
            eventTemplate: { ...eventTemplate },
            viewList: this.viewList(),
            directoryList: this.directoryList(),
            scenarioTemplateList: this.scenarioTemplateList(),
            canEdit: this.permissionDataService.canEditEventTemplate(
              eventTemplate.id,
            ),
            canManage: this.permissionDataService.canManageEventTemplate(
              eventTemplate.id,
            ),
            canCreate: this.permissionDataService.canCreateEventTemplates(),
            hasEvents: hasEvents,
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
                  error: (err) =>
                    dialogRef.componentInstance.showSaveError(err),
                });
              return;
            case 'save':
              this.eventTemplateDataService
                .update(result.eventTemplate)
                .subscribe({
                  next: () => dialogRef.close(),
                  error: (err) =>
                    dialogRef.componentInstance.showSaveError(err),
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
