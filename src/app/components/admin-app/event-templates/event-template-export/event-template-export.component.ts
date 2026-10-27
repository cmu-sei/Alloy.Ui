// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, EventEmitter, Input, Output } from '@angular/core';
import {
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
} from '@angular/forms';
import { MatFormField, MatLabel } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import {
  CrucibleDialogComponent,
  CrucibleDialogContentDirective,
} from '@cmusei/crucible-common';
import { finalize } from 'rxjs';
import { ArchiveType } from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import FileDownloadUtils from 'src/app/utilities/file-download-utils';

/**
 * Exports Event Templates to a zip or tar.gz archive, following Player's View export dialog.
 */
@Component({
  selector: 'app-event-template-export',
  templateUrl: './event-template-export.component.html',
  styleUrls: ['./event-template-export.component.scss'],
  imports: [
    CrucibleDialogComponent,
    CrucibleDialogContentDirective,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatSelect,
    MatOption,
  ],
})
export class EventTemplateExportComponent {
  /** The Event Templates to export. */
  @Input() ids: string[] = [];
  /** Whether the ids are an explicit selection rather than every template in the list. */
  @Input() selected = false;
  /** Export every Event Template by sending no ids. The count shown is still ids.length. */
  @Input() all = false;

  @Output() complete = new EventEmitter<boolean>();

  form: UntypedFormGroup;
  archiveTypes = Object.values(ArchiveType);
  loading = false;
  errorMessage = '';

  constructor(
    private eventTemplateDataService: EventTemplateDataService,
    formBuilder: UntypedFormBuilder,
  ) {
    this.form = formBuilder.group({
      archiveType: [this.archiveTypes[0]],
    });
  }

  export() {
    this.loading = true;
    this.errorMessage = '';
    this.eventTemplateDataService
      .export(this.all ? [] : this.ids, this.form.value.archiveType)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          FileDownloadUtils.downloadFile(result.blob, result.filename);
          this.complete.emit(true);
        },
        error: (err) => this.showError(err),
      });
  }

  /** A blob request returns its error body as a Blob too, so read the ProblemDetails out of it. */
  private async showError(err: any) {
    let title: string | undefined;
    try {
      title =
        err?.error instanceof Blob
          ? JSON.parse(await err.error.text())?.title
          : err?.error?.title;
    } catch {
      title = undefined;
    }
    this.errorMessage = title ?? 'The Event Templates could not be exported.';
  }

  cancel() {
    this.complete.emit(false);
  }
}
