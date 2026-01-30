// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  EventEmitter,
  Inject,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  UntypedFormControl,
  FormGroupDirective,
  NgForm,
  Validators,
} from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  Directory,
  EventTemplate,
  ScenarioTemplate,
  View,
} from 'src/app/generated/alloy.api';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}

@Component({
  selector: 'app-event-template-edit',
  templateUrl: './event-template-edit.component.html',
  styleUrls: ['./event-template-edit.component.scss'],
})
export class EventTemplateEditComponent implements OnInit, OnDestroy {
  @Output() editComplete = new EventEmitter<any>();

  private _viewList: View[] = [];
  private _directoryList: Directory[] = [];
  private _scenarioTemplateList: ScenarioTemplate[] = [];
  private _viewFilter = '';
  private _directoryFilter = '';
  private _scenarioTemplateFilter = '';
  public filteredViewList = new BehaviorSubject<View[]>([]);
  public filteredDirectoryList = new BehaviorSubject<Directory[]>([]);
  public filteredScenarioTemplateList = new BehaviorSubject<ScenarioTemplate[]>(
    []
  );
  public eventTemplateNameFormControl = new UntypedFormControl('', [
    Validators.required,
    Validators.minLength(4),
  ]);
  public descriptionFormControl = new UntypedFormControl('', [
    Validators.required,
  ]);
  public durationHoursFormControl = new UntypedFormControl('', [
    Validators.required,
    Validators.pattern('^[0-9]*$'),
  ]);
  public viewIdFormControl = new UntypedFormControl('', []);
  public directoryIdFormControl = new UntypedFormControl('', []);
  public scenarioTemplateIdFormControl = new UntypedFormControl('', []);
  public isPublishedFormControl = new UntypedFormControl('', []);
  public useDynamicHostFormControl = new UntypedFormControl('', []);
  public matcher = new UserErrorStateMatcher();
  public viewSearchControl = new UntypedFormControl('', []);
  public directorySearchControl = new UntypedFormControl('', []);
  public scenarioTemplateSearchControl = new UntypedFormControl('', []);
  private unsubscribe$ = new Subject();

  constructor(
    public dialogService: DialogService,
    dialogRef: MatDialogRef<EventTemplateEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    dialogRef.disableClose = true;
  }

  /**
   * Initialize component
   */
  ngOnInit() {
    this.data.viewList.pipe(takeUntil(this.unsubscribe$)).subscribe((views) => {
      this._viewList = views;
      this.viewSearchControl.setValue(this.viewSearchControl.value);
    });
    this.data.directoryList
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((directories) => {
        this._directoryList = directories;
        this.directorySearchControl.setValue(this.directorySearchControl.value);
      });
    this.data.scenarioTemplateList
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((scenarioTemplates) => {
        this._scenarioTemplateList = scenarioTemplates;
        this.scenarioTemplateSearchControl.setValue(
          this.scenarioTemplateSearchControl.value
        );
      });
    this.viewSearchControl.valueChanges
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((filterTerm) => {
        this._viewFilter = filterTerm;
        this.filterViews();
      });
    this.directorySearchControl.valueChanges
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((filterTerm) => {
        this._directoryFilter = filterTerm;
        this.filterDirectories();
      });
    this.scenarioTemplateSearchControl.valueChanges
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((filterTerm) => {
        this._scenarioTemplateFilter = filterTerm;
        this.filterScenarioTemplates();
      });
    this.eventTemplateNameFormControl.setValue(this.data.eventTemplate.name);
    this.descriptionFormControl.setValue(this.data.eventTemplate.description);
    this.durationHoursFormControl.setValue(
      this.data.eventTemplate.durationHours
    );
    this.viewIdFormControl.setValue(this.data.eventTemplate.viewId);
    this.directoryIdFormControl.setValue(this.data.eventTemplate.directoryId);
    this.scenarioTemplateIdFormControl.setValue(
      this.data.eventTemplate.scenarioTemplateId
    );
    this.isPublishedFormControl.setValue(this.data.eventTemplate.isPublished);
    this.useDynamicHostFormControl.setValue(
      this.data.eventTemplate.useDynamicHost
    );
  }

  /**
   * Delete an event template after confirmation
   */
  deleteEventTemplate(): void {
    this.dialogService
      .confirm(
        'Delete Event Template',
        'Are you sure that you want to delete Event Template ' +
          this.data.eventTemplate.name +
          '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.editComplete.emit({
            action: 'delete',
            eventTemplate: this.data.eventTemplate,
          });
        }
      });
  }

  /**
   * Saves the current event template Ids
   */
  saveEventIds(event, changedField): void {
    let shouldUpdate = false;
    switch (changedField) {
      case 'viewId':
        if (this.data.eventTemplate.viewId !== event.option.value) {
          this.data.eventTemplate = {
            ...this.data.eventTemplate,
            viewId: event.option.value,
          };
        }
        this.viewSearchControl.setValue('');
        this.viewIdFormControl.setValue(this.data.eventTemplate.viewId);
        break;
      case 'directoryId':
        if (this.data.eventTemplate.directoryId !== event.option.value) {
          this.data.eventTemplate = {
            ...this.data.eventTemplate,
            directoryId: event.option.value,
          };
        }
        this.directorySearchControl.setValue('');
        this.directoryIdFormControl.setValue(
          this.data.eventTemplate.directoryId
        );
        break;
      case 'scenarioTemplateId':
        if (this.data.eventTemplate.scenarioTemplateId !== event.option.value) {
          this.data.eventTemplate = {
            ...this.data.eventTemplate,
            scenarioTemplateId: event.option.value,
          };
        }
        this.scenarioTemplateSearchControl.setValue('');
        this.scenarioTemplateIdFormControl.setValue(
          this.data.eventTemplate.scenarioTemplateId
        );
        break;
      default:
        break;
    }
  }

  filterViews() {
    const filteredList = this._viewList
      .sort((a: View, b: View) =>
        a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
      )
      .filter(
        (item) =>
          item.name.toLowerCase().includes(this._viewFilter.toLowerCase()) ||
          item.id.toLowerCase().includes(this._viewFilter.toLowerCase())
      );
    this.filteredViewList.next(filteredList);
  }

  filterDirectories() {
    const filteredList = this._directoryList
      .sort((a: Directory, b: Directory) =>
        a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
      )
      .filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(this._directoryFilter.toLowerCase()) ||
          item.id.toLowerCase().includes(this._directoryFilter.toLowerCase())
      );
    this.filteredDirectoryList.next(filteredList);
  }

  filterScenarioTemplates() {
    const filteredList = this._scenarioTemplateList
      .sort((a: View, b: View) =>
        a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
      )
      .filter(
        (item) =>
          item.name
            .toLowerCase()
            .includes(this._scenarioTemplateFilter.toLowerCase()) ||
          item.id
            .toLowerCase()
            .includes(this._scenarioTemplateFilter.toLowerCase())
      );
    this.filteredScenarioTemplateList.next(filteredList);
  }

  get selectedViewName() {
    return (selectedId) => {
      if (!selectedId) {
        selectedId = this.viewIdFormControl.value;
        if (!selectedId) {
          // no selected view
          return '';
        }
      }
      if (this._viewList.some((v) => v.id === selectedId)) {
        // selected view is in the list
        return this._viewList.find((v) => v.id === selectedId).name;
      } else {
        // selected view is not in the current list
        return selectedId;
      }
    };
  }

  get selectedDirectoryName() {
    return (selectedId) => {
      if (!selectedId) {
        selectedId = this.directoryIdFormControl.value;
        if (!selectedId) {
          // no selected directory
          return '';
        }
      }
      if (this._directoryList.some((v) => v.id === selectedId)) {
        // selected directory is in the list
        return this._directoryList.find((v) => v.id === selectedId).name;
      } else {
        // selected directory is not in the current list
        return selectedId;
      }
    };
  }

  get selectedEventTemplateName() {
    return (selectedId) => {
      if (!selectedId) {
        selectedId = this.scenarioTemplateIdFormControl.value;
        if (!selectedId) {
          // no selected scenarioTemplate template
          return '';
        }
      }
      if (this._scenarioTemplateList.some((v) => v.id === selectedId)) {
        // selected scenarioTemplate template is in the list
        return this._scenarioTemplateList.find((v) => v.id === selectedId).name;
      } else {
        // selected scenarioTemplate template is not in the current list
        return selectedId;
      }
    };
  }

  /**
   * Clone an event template after confirmation
   */
  cloneEventTemplate(): void {
    const newEventTemplate = {
      name: this.data.eventTemplate.name + ' - clone',
      description: this.data.eventTemplate.description,
      durationHours: this.data.eventTemplate.durationHours,
      viewId: this.data.eventTemplate.viewId,
      directoryId: this.data.eventTemplate.directoryId,
      scenarioTemplateId: this.data.eventTemplate.scenarioTemplateId,
    };
    this.editComplete.emit({
      action: 'clone',
      eventTemplate: newEventTemplate,
    });
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ action: '', eventTemplate: null });
    } else {
      this.editComplete.emit({
        action: 'save',
        eventTemplate: this.data.eventTemplate,
      });
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
} // End Class
