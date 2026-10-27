// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, EventEmitter, Optional, Output } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import {
  CrucibleDialogActionsDirective,
  CrucibleDialogComponent,
  CrucibleDialogContentDirective,
} from '@cmusei/crucible-common';
import { MatDialogRef } from '@angular/material/dialog';
import { finalize } from 'rxjs';
import { ImportEventTemplatesResult } from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';

/**
 * Imports an Event Template archive, following Player's View import dialog. Unlike Player, a reference
 * that cannot be resolved does not fail the template: it is cleared and listed as a warning.
 */
@Component({
  selector: 'app-event-template-import',
  templateUrl: './event-template-import.component.html',
  styleUrls: ['./event-template-import.component.scss'],
  imports: [
    CrucibleDialogComponent,
    CrucibleDialogContentDirective,
    CrucibleDialogActionsDirective,
    ReactiveFormsModule,
    MatButton,
    MatSlideToggle,
    MatTooltip,
  ],
})
export class EventTemplateImportComponent {
  @Output() complete = new EventEmitter<boolean>();

  form: UntypedFormGroup;
  loading = false;
  errorMessage = '';
  result: ImportEventTemplatesResult | null = null;
  private completeEmitted = false;

  constructor(
    private eventTemplateDataService: EventTemplateDataService,
    formBuilder: UntypedFormBuilder,
    @Optional()
    private dialogRef?: MatDialogRef<EventTemplateImportComponent>,
  ) {
    this.form = formBuilder.group({
      archive: [null, Validators.required],
      matchReferencesByName: [false],
    });

    this.dialogRef?.beforeClosed().subscribe(() => {
      if (this.result) {
        this.emitComplete();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.patchValue({ archive: input.files?.[0] ?? null });
  }

  import() {
    this.loading = true;
    this.errorMessage = '';
    this.eventTemplateDataService
      .import(this.form.value.archive, !!this.form.value.matchReferencesByName)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.result = result),
        // A request that is rejected as a whole (not an archive, no permission) keeps the form open
        error: (err) =>
          (this.errorMessage =
            err?.error?.title ?? 'The archive could not be imported.'),
      });
  }

  cancel() {
    this.emitComplete();
  }

  private emitComplete() {
    if (this.completeEmitted) {
      return;
    }

    this.completeEmitted = true;
    this.complete.emit(!!this.result);
  }
}
