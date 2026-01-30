// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  EventEmitter,
  Input,
  Inject,
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
import { Event, EventStatus } from '../../../../generated/alloy.api';
import {
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { DialogService } from 'src/app/services/dialog/dialog.service';

@Component({
  selector: 'app-event-edit',
  templateUrl: './event-edit.component.html',
  styleUrls: ['./event-edit.component.scss'],
})
export class EventEditComponent implements OnInit {
  @Output() editComplete = new EventEmitter<any>();

  public eventNameFormControl: UntypedFormControl;
  public descriptionFormControl: UntypedFormControl;
  public launchDateFormControl: UntypedFormControl;
  public endDateFormControl: UntypedFormControl;
  public expirationDateFormControl: UntypedFormControl;
  public statusDateFormControl: UntypedFormControl;
  public userIdFormControl: UntypedFormControl;
  public usernameFormControl: UntypedFormControl;
  public statusFormControl: UntypedFormControl;
  public internalStatusFormControl: UntypedFormControl;
  public eventTemplateIdFormControl: UntypedFormControl;
  public viewIdFormControl: UntypedFormControl;
  public workspaceIdFormControl: UntypedFormControl;
  public runIdFormControl: UntypedFormControl;
  public scenarioIdFormControl: UntypedFormControl;

  public eventStates = Object.values(EventStatus);
  public matcher = new UserErrorStateMatcher();
  public selectedViewId: any;
  public changesWereMade = false;

  constructor(
    public dialogService: DialogService,
    dialogRef: MatDialogRef<EventEditComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    dialogRef.disableClose = true;
  }

  /**
   * Initialize component
   */
  ngOnInit() {
    this.initForm();
    this.setFormDisabled();
  }

  private initForm() {
    this.eventNameFormControl = new UntypedFormControl(this.data.event.name, [
      Validators.required,
      Validators.minLength(4),
    ]);
    this.descriptionFormControl = new UntypedFormControl(
      this.data.event.description,
      [Validators.required]
    );
    this.launchDateFormControl = new UntypedFormControl(
      this.data.event.launchDate,
      []
    );
    this.endDateFormControl = new UntypedFormControl(
      this.data.event.endDate,
      []
    );
    this.expirationDateFormControl = new UntypedFormControl(
      this.data.event.expirationDate,
      []
    );
    this.statusDateFormControl = new UntypedFormControl(
      this.data.event.statusDate,
      []
    );
    this.userIdFormControl = new UntypedFormControl(this.data.event.userId, [
      Validators.required,
    ]);
    this.usernameFormControl = new UntypedFormControl(
      this.data.event.username,
      [Validators.required]
    );
    this.statusFormControl = new UntypedFormControl(this.data.event.status, [
      Validators.required,
    ]);
    this.internalStatusFormControl = new UntypedFormControl(
      this.data.event.internalStatus,
      [Validators.required]
    );
    this.eventTemplateIdFormControl = new UntypedFormControl(
      this.data.event.eventTemplateId,
      []
    );
    this.viewIdFormControl = new UntypedFormControl(this.data.event.viewId, []);
    this.workspaceIdFormControl = new UntypedFormControl(
      this.data.event.workspaceId,
      []
    );
    this.runIdFormControl = new UntypedFormControl(this.data.event.runId, []);
    this.scenarioIdFormControl = new UntypedFormControl(
      this.data.event.scenarioId,
      []
    );
  }

  private setFormDisabled() {
    this.usernameFormControl.disable();
    this.userIdFormControl.disable();
    this.statusFormControl.disable();
    this.internalStatusFormControl.disable();
    this.eventTemplateIdFormControl.disable();
    this.viewIdFormControl.disable();
    this.workspaceIdFormControl.disable();
    this.runIdFormControl.disable();
    this.scenarioIdFormControl.disable();
    this.launchDateFormControl.disable();
    this.endDateFormControl.disable();
    this.statusDateFormControl.disable();
    if (
      this.data.event.status === 'Ended' ||
      this.data.event.status === 'Failed' ||
      !this.data.canEdit
    ) {
      this.eventNameFormControl.disable();
      this.descriptionFormControl.disable();
      this.expirationDateFormControl.disable();
    }
  }

  /**
   * Closes the edit screen
   */
  handleEditComplete(saveChanges: boolean): void {
    if (!saveChanges) {
      this.editComplete.emit({ action: '', event: null });
    } else {
      this.editComplete.emit({
        action: 'save',
        event: this.data.event,
      });
    }
  }

  /**
   * Delete an event after confirmation
   */
  deleteEvent(): void {
    this.dialogService
      .confirm(
        'Delete Event',
        'Are you sure that you want to delete event ' +
          this.data.event.name +
          '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.editComplete.emit({
            action: 'delete',
            event: this.data.event,
          });
        }
      });
  }

  /**
   * End an event
   */
  endEvent(): void {
    this.dialogService
      .confirm(
        'End Event Now',
        'Are you sure that you want to end event ' + this.data.event.name + '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.editComplete.emit({
            action: 'end',
            event: this.data.event,
          });
        }
      });
  }

  /**
   * Saves the current event
   */
  saveEvent(changedField): void {
    switch (changedField) {
      case 'name':
        if (
          !this.eventNameFormControl.hasError('minlength') &&
          !this.eventNameFormControl.hasError('required') &&
          this.data.event.name !== this.eventNameFormControl.value
        ) {
          this.data.event.name = this.eventNameFormControl.value;
        }
        break;
      case 'description':
        if (
          !this.descriptionFormControl.hasError('required') &&
          this.data.event.description !== this.descriptionFormControl.value
        ) {
          this.data.event.description = this.descriptionFormControl.value;
        }
        break;
      case 'viewId':
        if (
          !this.viewIdFormControl.hasError('required') &&
          this.data.event.viewId !== this.viewIdFormControl.value
        ) {
          this.data.event.viewId = this.viewIdFormControl.value;
        }
        break;
      case 'launchDate':
        if (
          this.data.event.launchDate.toLocaleDateString() !==
          this.launchDateFormControl.value
        ) {
          if (this.launchDateFormControl.value > '') {
            this.data.event.launchDate = new Date(
              this.launchDateFormControl.value
            );
          } else {
            this.data.event.launchDate = null;
          }
        }
        break;
      case 'endDate':
        if (
          this.data.event.endDate.toLocaleDateString() !==
          this.endDateFormControl.value
        ) {
          if (this.endDateFormControl.value > '') {
            this.data.event.endDate = new Date(this.endDateFormControl.value);
          } else {
            this.data.event.endDate = null;
          }
        }
        break;
      case 'expirationDate':
        if (
          this.data.event.expirationDate.toLocaleDateString() !==
          this.expirationDateFormControl.value
        ) {
          if (this.expirationDateFormControl.value > '') {
            this.data.event.expirationDate = new Date(
              this.expirationDateFormControl.value
            );
          } else {
            this.data.event.expirationDate = null;
          }
        }
        break;
      case 'statusDate':
        if (
          this.data.event.statusDate.toLocaleDateString() !==
          this.statusDateFormControl.value
        ) {
          if (this.statusDateFormControl.value > '') {
            this.data.event.statusDate = new Date(
              this.statusDateFormControl.value
            );
          } else {
            this.data.event.statusDate = null;
          }
        }
        break;
      default:
        break;
    }
  }
} // End Class

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
