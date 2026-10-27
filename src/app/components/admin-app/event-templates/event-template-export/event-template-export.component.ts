// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, inject, input, output } from '@angular/core';
import { finalize } from 'rxjs';
import {
  CrucibleDialogComponent,
  CrucibleDialogContentDirective,
} from '@cmusei/crucible-common';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import FileDownloadUtils from 'src/app/utilities/file-download-utils';

/**
 * Exports Event Templates to a JSON file: an object for one template, an array for several.
 */
@Component({
  selector: 'app-event-template-export',
  templateUrl: './event-template-export.component.html',
  styleUrls: ['./event-template-export.component.scss'],
  imports: [CrucibleDialogComponent, CrucibleDialogContentDirective],
})
export class EventTemplateExportComponent {
  private eventTemplateDataService = inject(EventTemplateDataService);

  /** The Event Templates to export. */
  readonly ids = input<string[]>([]);
  /** Whether the ids are an explicit selection rather than every template in the list. */
  readonly selected = input(false);
  /** Export every Event Template by sending no ids. The count shown is still ids().length. */
  readonly all = input(false);

  readonly complete = output<boolean>();

  loading = false;
  errorMessage = '';

  export() {
    this.loading = true;
    this.errorMessage = '';
    this.eventTemplateDataService
      .export(this.all() ? [] : this.ids())
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
