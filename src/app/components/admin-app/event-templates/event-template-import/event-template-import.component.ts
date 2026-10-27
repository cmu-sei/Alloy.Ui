// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, inject, output } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import {
  CrucibleDialogActionsDirective,
  CrucibleDialogComponent,
  CrucibleDialogContentDirective,
} from '@cmusei/crucible-common';
import { Subscription, finalize } from 'rxjs';
import { ImportEventTemplatesResult } from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import ArchiveErrorUtils from 'src/app/utilities/archive-error-utils';

/**
 * Imports a .json file of Event Templates written by export, or a .zip archive holding one. Each
 * template is created as a new template; a name already in use gets the importer's name appended,
 * and a reference that cannot be resolved is cleared. Both are listed as warnings.
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
export class EventTemplateImportComponent implements OnDestroy {
  private eventTemplateDataService = inject(EventTemplateDataService);
  private dialogRef = inject<MatDialogRef<EventTemplateImportComponent>>(
    MatDialogRef,
    { optional: true },
  );

  /** The file types the file picker offers. The API tells JSON from zip by content. */
  readonly accept = '.json,.zip,application/json,application/zip';

  readonly complete = output<boolean>();

  form: UntypedFormGroup = inject(UntypedFormBuilder).group({
    file: [null, Validators.required],
    matchReferencesByName: [false],
  });
  loading = false;
  errorMessage = '';
  result: ImportEventTemplatesResult | null = null;
  private completeEmitted = false;
  private request: Subscription | null = null;

  constructor() {
    this.dialogRef?.beforeClosed().subscribe(() => {
      if (this.result) {
        this.emitComplete();
      }
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.patchValue({ file: input.files?.[0] ?? null });
  }

  import() {
    this.loading = true;
    this.errorMessage = '';
    this.request = this.eventTemplateDataService
      .import(this.form.value.file, !!this.form.value.matchReferencesByName)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => (this.result = result),
        // A request that is rejected as a whole (not an export file, no permission) keeps the form open
        error: async (err) =>
          (this.errorMessage = await ArchiveErrorUtils.message(
            err,
            'The file could not be imported.',
          )),
      });
  }

  cancel() {
    this.abort();
    this.emitComplete();
  }

  /** Closing the dialog any other way (Escape, the backdrop) aborts a request still running, too. */
  ngOnDestroy() {
    this.abort();
  }

  /**
   * Unsubscribing aborts the HTTP request. The API imports a file in one transaction and rolls it back when
   * the request is aborted, so nothing from the file is imported.
   */
  private abort() {
    this.request?.unsubscribe();
    this.request = null;
  }

  private emitComplete() {
    if (this.completeEmitted) {
      return;
    }

    this.completeEmitted = true;
    this.complete.emit(!!this.result);
  }
}
