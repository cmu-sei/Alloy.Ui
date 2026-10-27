// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, inject, input, output } from '@angular/core';
import { Subscription, finalize } from 'rxjs';
import {
  CrucibleDialogComponent,
  CrucibleDialogContentDirective,
} from '@cmusei/crucible-common';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import FileDownloadUtils from 'src/app/utilities/file-download-utils';
import ArchiveErrorUtils from 'src/app/utilities/archive-error-utils';

/**
 * Exports Event Templates to a JSON file: an object for one template, an array for several.
 */
@Component({
  selector: 'app-event-template-export',
  templateUrl: './event-template-export.component.html',
  styleUrls: ['./event-template-export.component.scss'],
  imports: [CrucibleDialogComponent, CrucibleDialogContentDirective],
})
export class EventTemplateExportComponent implements OnDestroy {
  private eventTemplateDataService = inject(EventTemplateDataService);

  /** The Event Templates to export. */
  readonly ids = input<string[]>([]);
  /** Whether the ids are an explicit selection rather than every template in the list. */
  readonly selected = input(false);
  /** Export every Event Template by sending no ids. The count shown is still ids().length. */
  readonly all = input(false);
  /** Whether nothing is selected and the search hides some of the list, so the ids are the ones it shows. */
  readonly filtered = input(false);
  /** How many Event Templates in the list or the selection were left out because the user cannot view them. */
  readonly skipped = input(0);

  readonly complete = output<boolean>();

  loading = false;
  errorMessage = '';
  private request: Subscription | null = null;

  export() {
    this.loading = true;
    this.errorMessage = '';
    this.request = this.eventTemplateDataService
      .export(this.all() ? [] : this.ids())
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (result) => {
          FileDownloadUtils.downloadFile(result.blob, result.filename);
          this.complete.emit(true);
        },
        error: async (err) =>
          (this.errorMessage = await ArchiveErrorUtils.message(
            err,
            'The Event Templates could not be exported.',
          )),
      });
  }

  cancel() {
    this.abort();
    this.complete.emit(false);
  }

  /** Closing the dialog any other way (Escape, the backdrop) aborts a request still running, too. */
  ngOnDestroy() {
    this.abort();
  }

  /** Unsubscribing aborts the HTTP request, so no file is downloaded after the user cancelled. */
  private abort() {
    this.request?.unsubscribe();
    this.request = null;
  }
}
