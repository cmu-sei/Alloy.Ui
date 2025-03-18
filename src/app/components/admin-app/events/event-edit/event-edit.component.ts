// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  EventEmitter,
  Input,
  NgZone,
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
import {
  Event,
  EventService,
  EventStatus,
  PlayerService,
  View,
} from '../../../../generated/alloy.api';
import { DialogService } from '../../../../services/dialog/dialog.service';

@Component({
  selector: 'app-event-edit',
  templateUrl: './event-edit.component.html',
  styleUrls: ['./event-edit.component.scss'],
})
export class EventEditComponent implements OnInit {
  @Input() event: Event;
  @Output() editComplete = new EventEmitter<boolean>();

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
  public views: View[];
  public selectedViewId: any;
  public changesWereMade = false;

  constructor(
    public eventService: EventService,
    public dialogService: DialogService,
    public zone: NgZone,
    public playerService: PlayerService
  ) {}

  /**
   * Initialize component
   */
  ngOnInit() {
    this.initForm();

    console.log(this.event);
    this.playerService.getViews().subscribe(
      (views) => {
        this.views = views.sort((x1, x2) => {
          return x1.name > x2.name ? 1 : x1.name < x2.name ? -1 : 0;
        });
      },
      (error) => {
        console.log('The Player API is not responding.  ' + error.message);
      }
    );

    this.setFormDisabled();
  }

  private initForm() {
    this.eventNameFormControl = new UntypedFormControl(this.event.name, [
      Validators.required,
      Validators.minLength(4),
    ]);
    this.descriptionFormControl = new UntypedFormControl(this.event.description, [
      Validators.required,
    ]);
    this.launchDateFormControl = new UntypedFormControl(this.event.launchDate, []);
    this.endDateFormControl = new UntypedFormControl(this.event.endDate, []);
    this.expirationDateFormControl = new UntypedFormControl(
      this.event.expirationDate,
      []
    );
    this.statusDateFormControl = new UntypedFormControl(this.event.statusDate, []);
    this.userIdFormControl = new UntypedFormControl(this.event.userId, [
      Validators.required,
    ]);
    this.usernameFormControl = new UntypedFormControl(this.event.username, [
      Validators.required,
    ]);
    this.statusFormControl = new UntypedFormControl(this.event.status, [
      Validators.required,
    ]);
    this.internalStatusFormControl = new UntypedFormControl(
      this.event.internalStatus,
      [Validators.required]
    );
    this.eventTemplateIdFormControl = new UntypedFormControl(
      this.event.eventTemplateId,
      []
    );
    this.viewIdFormControl = new UntypedFormControl(this.event.viewId, []);
    this.workspaceIdFormControl = new UntypedFormControl(this.event.workspaceId, []);
    this.runIdFormControl = new UntypedFormControl(this.event.runId, []);
    this.scenarioIdFormControl = new UntypedFormControl(this.event.scenarioId, []);
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
    if (this.event.status === 'Ended' || this.event.status === 'Failed') {
      this.eventNameFormControl.disable();
      this.descriptionFormControl.disable();
      this.expirationDateFormControl.disable();
    }
  }

  /**
   * Closes the edit screen
   */
  returnToEventList(changesWereMade: boolean): void {
    this.editComplete.emit(changesWereMade || this.changesWereMade);
  }

  /**
   * Delete an event after confirmation
   */
  deleteEvent(): void {
    this.dialogService
      .confirm(
        'Delete Event',
        'Are you sure that you want to delete event ' + this.event.name + '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.eventService.deleteEvent(this.event.id).subscribe((deleted) => {
            console.log('successfully deleted event');
            this.returnToEventList(true);
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
        'Are you sure that you want to end event ' + this.event.name + '?'
      )
      .subscribe((result) => {
        if (result['confirm']) {
          this.eventService.endEvent(this.event.id).subscribe((event) => {
            console.log('successfully ended event ' + event.id);
            this.returnToEventList(true);
          });
        }
      });
  }

  /**
   * Saves the current event
   */
  saveEvent(changedField): void {
    let shouldUpdate = false;
    switch (changedField) {
      case 'name':
        if (
          !this.eventNameFormControl.hasError('minlength') &&
          !this.eventNameFormControl.hasError('required') &&
          this.event.name !== this.eventNameFormControl.value
        ) {
          this.event.name = this.eventNameFormControl.value;
          shouldUpdate = true;
        }
        break;
      case 'description':
        if (
          !this.descriptionFormControl.hasError('required') &&
          this.event.description !== this.descriptionFormControl.value
        ) {
          this.event.description = this.descriptionFormControl.value;
          shouldUpdate = true;
        }
        break;
      case 'viewId':
        if (
          !this.viewIdFormControl.hasError('required') &&
          this.event.viewId !== this.viewIdFormControl.value
        ) {
          this.event.viewId = this.viewIdFormControl.value;
          shouldUpdate = true;
        }
        break;
      case 'launchDate':
        if (
          this.event.launchDate.toLocaleDateString() !==
          this.launchDateFormControl.value
        ) {
          if (this.launchDateFormControl.value > '') {
            this.event.launchDate = new Date(this.launchDateFormControl.value);
          } else {
            this.event.launchDate = null;
          }
          shouldUpdate = true;
        }
        break;
      case 'endDate':
        if (
          this.event.endDate.toLocaleDateString() !==
          this.endDateFormControl.value
        ) {
          if (this.endDateFormControl.value > '') {
            this.event.endDate = new Date(this.endDateFormControl.value);
          } else {
            this.event.endDate = null;
          }
          shouldUpdate = true;
        }
        break;
      case 'expirationDate':
        if (
          this.event.expirationDate.toLocaleDateString() !==
          this.expirationDateFormControl.value
        ) {
          if (this.expirationDateFormControl.value > '') {
            this.event.expirationDate = new Date(
              this.expirationDateFormControl.value
            );
          } else {
            this.event.expirationDate = null;
          }
          shouldUpdate = true;
        }
        break;
      case 'statusDate':
        if (
          this.event.statusDate.toLocaleDateString() !==
          this.statusDateFormControl.value
        ) {
          if (this.statusDateFormControl.value > '') {
            this.event.statusDate = new Date(this.statusDateFormControl.value);
          } else {
            this.event.statusDate = null;
          }
          shouldUpdate = true;
        }
        break;
      default:
        break;
    }
    if (shouldUpdate) {
      this.changesWereMade = true;
      this.eventService
        .updateEvent(this.event.id, this.event)
        .subscribe((updatedEvent) => {
          updatedEvent.launchDate = !updatedEvent.launchDate
            ? null
            : new Date(updatedEvent.launchDate);
          updatedEvent.endDate = !updatedEvent.endDate
            ? null
            : new Date(updatedEvent.endDate);
          updatedEvent.expirationDate = !updatedEvent.expirationDate
            ? null
            : new Date(updatedEvent.expirationDate);
          updatedEvent.statusDate = !updatedEvent.statusDate
            ? null
            : new Date(updatedEvent.statusDate);
          this.event = updatedEvent;
        });
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
