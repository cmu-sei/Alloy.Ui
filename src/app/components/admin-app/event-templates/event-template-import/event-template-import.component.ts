// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, inject, output } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { MatTooltip } from '@angular/material/tooltip';
import {
  CrucibleDialogActionsDirective,
  CrucibleDialogComponent,
  CrucibleDialogContentDirective,
} from '@cmusei/crucible-common';
import { finalize } from 'rxjs';
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
    MatProgressSpinner,
  ],
})
export class EventTemplateImportComponent {
  private eventTemplateDataService = inject(EventTemplateDataService);

  /** The file types the file picker offers. The API tells JSON from zip by content. */
  readonly accept = '.json,.zip,application/json,application/zip';

  /** Asks the host to close the dialog: from Cancel before anything is sent, or from OK after the result. */
  readonly complete = output<void>();

  form: UntypedFormGroup = inject(UntypedFormBuilder).group({
    file: [null, Validators.required],
    matchReferencesByName: [false],
  });
  loading = false;
  errorMessage = '';
  result: ImportEventTemplatesResult | null = null;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.form.patchValue({ file: input.files?.[0] ?? null });
  }

  /**
   * Sends the file. Until the answer arrives the dialog cannot be closed: Cancel is disabled, and crucible-dialog
   * ignores Escape while loading and the backdrop always. Once the request is sent the browser cannot know whether
   * the API has committed it, so no cancel could be honest. The import is one short transaction; closing the tab
   * is still a way out, and the API rolls back an import whose client goes away before the commit.
   */
  import() {
    this.loading = true;
    this.errorMessage = '';
    this.eventTemplateDataService
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

  close() {
    if (!this.loading) {
      this.complete.emit();
    }
  }
}
