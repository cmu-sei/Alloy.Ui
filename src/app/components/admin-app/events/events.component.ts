// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  Component,
  EventEmitter,
  NgZone,
  OnInit,
  Output,
  inject,
  input,
} from '@angular/core';
import { UntypedFormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { Subject } from 'rxjs';
import { AdminEventListComponent } from './event-list/event-list.component';

@Component({
  selector: 'app-events',
  templateUrl: './events.component.html',
  styleUrls: ['./events.component.scss'],
  imports: [AdminEventListComponent],
})
export class EventsComponent implements OnInit {
  zone = inject(NgZone);

  readonly refresh = input<Subject<boolean>>(undefined);
  @Output() editComplete = new EventEmitter<boolean>();

  matcher = new UserErrorStateMatcher();
  isLinear = false;

  /**
   * Initialize component
   */
  ngOnInit() {}
} // End Class

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null,
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}
