// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import FileDownloadUtils from 'src/app/utilities/file-download-utils';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateExportComponent } from './event-template-export.component';

async function renderExport(inputs: {
  ids: string[];
  selected?: boolean;
  all?: boolean;
  filtered?: boolean;
  skipped?: number;
}) {
  const data = {
    export: vi.fn(() =>
      of({ blob: new Blob(['[]']), filename: 'event-templates.json' }),
    ),
  } satisfies Partial<EventTemplateDataService>;
  const download = vi
    .spyOn(FileDownloadUtils, 'downloadFile')
    .mockImplementation(() => undefined);
  const rendered = await renderComponent(EventTemplateExportComponent, {
    providers: [{ provide: EventTemplateDataService, useValue: data }],
    inputs,
  });
  const completed: boolean[] = [];
  rendered.fixture.componentInstance.complete.subscribe((x) =>
    completed.push(x),
  );
  return { ...rendered, user: userEvent.setup(), data, download, completed };
}

describe('EventTemplateExportComponent', () => {
  afterEach(() => vi.restoreAllMocks());

  /**
   * Verifies: Export asks for the selected ids, saves the file under the name the API gave it, and completes.
   * Interacts with: EventTemplateDataService.export, FileDownloadUtils.downloadFile, complete output.
   * Data: two selected ids.
   */
  it('exports the selected templates as the named file', async () => {
    const { user, data, download, completed } = await renderExport({
      ids: ['a', 'b'],
      selected: true,
    });

    expect(screen.getByText('Selected Event Templates: 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(data.export).toHaveBeenCalledWith(['a', 'b']);
    expect(download).toHaveBeenCalledWith(
      expect.any(Blob),
      'event-templates.json',
    );
    expect(completed).toEqual([true]);
  });

  /**
   * Verifies: with all set, the export sends no ids, so the API exports every template.
   * Interacts with: EventTemplateDataService.export.
   * Data: three ids in the list, nothing selected, all = true.
   */
  it('sends no ids when exporting every template', async () => {
    const { user, data } = await renderExport({
      ids: ['a', 'b', 'c'],
      all: true,
    });

    expect(screen.getByText('All Event Templates: 3')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(data.export).toHaveBeenCalledWith([]);
  });

  /**
   * Verifies: with nothing to export the dialog says so and Export is disabled.
   * Interacts with: rendered dialog, submitDisabled.
   * Data: no ids.
   */
  it('disables Export when there is nothing to export', async () => {
    await renderExport({ ids: [] });

    expect(
      screen.getByText('There are no Event Templates to export.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled();
  });

  /**
   * Verifies: a refused export shows the ProblemDetails title read out of the Blob error body, and does not complete.
   * Interacts with: EventTemplateDataService.export error path, showError.
   * Data: a 404 whose body is a Blob holding {"title": "Event Template x was not found."}.
   */
  it('shows the reason an export was refused', async () => {
    const { user, data, completed, download } = await renderExport({
      ids: ['x'],
      selected: true,
    });
    data.export.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 404,
            error: new Blob([
              JSON.stringify({ title: 'Event Template x was not found.' }),
            ]),
          }),
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Export' }));

    expect(
      await screen.findByText('Event Template x was not found.'),
    ).toBeInTheDocument();
    expect(download).not.toHaveBeenCalled();
    expect(completed).toEqual([]);
  });

  /**
   * Verifies: the count says when it is what the search shows, and how many templates the user cannot view are left out.
   * Interacts with: the filtered and skipped inputs.
   * Data: one id left after the search, one template left out.
   */
  it('names a search and the templates left out', async () => {
    await renderExport({ ids: ['t1'], filtered: true, skipped: 1 });

    expect(
      screen.getByText(/Event Templates the search shows: 1/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/1 Event Template that you can't view is left out/),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: Cancel, and closing the dialog any other way, abort a running export so no file arrives later.
   * Interacts with: cancel, ngOnDestroy, the request subscription.
   * Data: an export that never answers; its teardown counts the aborts.
   */
  it.each(['cancel', 'destroy'] as const)(
    'aborts a running export on %s',
    async (how) => {
      const { user, data, fixture, download } = await renderExport({
        ids: ['t1'],
        selected: true,
      });
      const aborted = vi.fn();
      data.export.mockReturnValueOnce(new Observable(() => aborted));
      await user.click(screen.getByRole('button', { name: 'Export' }));

      if (how === 'cancel') {
        fixture.componentInstance.cancel();
      } else {
        fixture.destroy();
      }

      expect(aborted).toHaveBeenCalledTimes(1);
      expect(download).not.toHaveBeenCalled();
    },
  );
});
