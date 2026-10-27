// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, of, throwError } from 'rxjs';
import { ImportEventTemplatesResult } from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { MatDialogRef } from '@angular/material/dialog';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateImportComponent } from './event-template-import.component';

const result = (
  overrides: Partial<ImportEventTemplatesResult> = {},
): ImportEventTemplatesResult => ({
  imported: [{ id: 'new-1', name: 'Range - Ada', durationHours: 1 }],
  failures: [],
  warnings: [],
  ...overrides,
});

async function renderImport() {
  const data = {
    import: vi.fn((_file: Blob, _match: boolean) => of(result())),
  } satisfies Partial<EventTemplateDataService>;
  // the dialog the component is opened in, whose Escape and close crucible-dialog drives
  const { dialogRef, close, keydown } =
    dialogRefStub<EventTemplateImportComponent>();
  const escape = () =>
    keydown.next(new KeyboardEvent('keydown', { key: 'Escape' }));
  const rendered = await renderComponent(EventTemplateImportComponent, {
    providers: [
      { provide: EventTemplateDataService, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
  });
  let completed = 0;
  rendered.fixture.componentInstance.complete.subscribe(() => completed++);
  const fileInput = rendered.container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  return {
    ...rendered,
    user: userEvent.setup({ applyAccept: false }),
    data,
    close,
    escape,
    completed: () => completed,
    fileInput,
  };
}

const jsonFile = () =>
  new File(['[]'], 'event-templates.json', { type: 'application/json' });

describe('EventTemplateImportComponent', () => {
  /**
   * Verifies: the file picker offers .json and .zip files, the two forms the API reads.
   * Interacts with: rendered file input.
   * Data: none.
   */
  it('offers .json and .zip files', async () => {
    const { fileInput } = await renderImport();

    expect(fileInput.accept.split(',')).toEqual(
      expect.arrayContaining(['.json', '.zip']),
    );
  });

  /**
   * Verifies: Import is disabled until a file is chosen.
   * Interacts with: form validity, submitDisabled.
   * Data: no file.
   */
  it('requires a file', async () => {
    await renderImport();

    expect(screen.getByRole('button', { name: 'Import' })).toBeDisabled();
  });

  /**
   * Verifies: the chosen file and the Match By Name option are sent, and the result names each change.
   * Interacts with: file input, mat-slide-toggle, EventTemplateDataService.import, result view.
   * Data: a .json file; the API renames one template and clears a reference.
   */
  it.each([
    ['event-templates.json', 'application/json'],
    ['event_templates.zip', 'application/zip'],
  ])('imports a %s and lists the changes', async (name, type) => {
    const { user, data, fileInput } = await renderImport();
    data.import.mockReturnValueOnce(
      of(
        result({
          warnings: [
            {
              id: 'new-1',
              name: 'Range - Ada',
              message:
                'Renamed to "Range - Ada" because an Event Template named "Range" already exists.',
            },
          ],
        }),
      ),
    );
    const file = new File(['x'], name, { type });

    await user.upload(fileInput, file);
    expect(screen.getByText(name)).toBeInTheDocument();
    await user.click(screen.getByRole('switch', { name: 'Match By Name' }));
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(data.import).toHaveBeenCalledWith(file, true);
    expect(screen.getByText('Imported with changes:')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Renamed to "Range - Ada" because an Event Template named "Range" already exists.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('Imported Event Templates: 1')).toBeInTheDocument();
  });

  /**
   * Verifies: per-item failures are listed with their reason, and OK closes the dialog.
   * Interacts with: result view, complete output.
   * Data: one imported template and one item that is not a template (no name).
   */
  it('lists failures and completes after OK', async () => {
    const { user, data, fileInput, completed } = await renderImport();
    data.import.mockReturnValueOnce(
      of(
        result({
          failures: [
            { id: null, name: null, reason: 'Item 2 is not an Event Template' },
          ],
        }),
      ),
    );

    await user.upload(fileInput, jsonFile());
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(
      screen.getByText('The following errors occurred:'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Item 2 is not an Event Template'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Name:')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'OK' }));
    expect(completed()).toBe(1);
  });

  /**
   * Verifies: a file refused as a whole keeps the form open with the API's reason.
   * Interacts with: EventTemplateDataService.import error path.
   * Data: a 400 whose ProblemDetails title says the file is not an export.
   */
  it('shows why a file was refused', async () => {
    const { user, data, fileInput, completed } = await renderImport();
    data.import.mockReturnValueOnce(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { title: 'The file is not an Event Template export' },
          }),
      ),
    );

    await user.upload(fileInput, jsonFile());
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(
      await screen.findByText('The file is not an Event Template export'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(completed()).toBe(0);
  });

  /**
   * Verifies: the messages of a ValidationProblemDetails are shown, and a 413 names the size limit.
   * Interacts with: EventTemplateDataService.import error path, ArchiveErrorUtils.message.
   * Data: a model-binding 400 with errors; a 413 with no body.
   */
  it.each([
    {
      error: new HttpErrorResponse({
        status: 400,
        error: {
          title: 'One or more validation errors occurred.',
          errors: { File: ['The File field is required.'] },
        },
      }),
      shown: 'The File field is required.',
    },
    {
      error: new HttpErrorResponse({ status: 413 }),
      shown:
        'The file is too large to upload. Event Template files can be up to 10 MB.',
    },
  ])('says what to fix for a $error.status', async ({ error, shown }) => {
    const { user, data, fileInput } = await renderImport();
    data.import.mockReturnValueOnce(throwError(() => error));

    await user.upload(fileInput, jsonFile());
    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(await screen.findByText(shown)).toBeInTheDocument();
  });

  /**
   * Verifies: before anything is sent, Cancel and Escape close the dialog.
   * Interacts with: the dialog's own Cancel button, complete output, crucible-dialog's Escape handling.
   * Data: no file chosen.
   */
  it('closes from Cancel or Escape before the file is sent', async () => {
    const { user, completed, close, escape } = await renderImport();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    escape();

    expect(completed()).toBe(1);
    expect(close).toHaveBeenCalled();
  });

  /**
   * Verifies: while the import runs nothing closes the dialog: Cancel is disabled, crucible-dialog ignores
   * Escape while loading, and Importing... shows; once the answer arrives OK closes it.
   * Interacts with: import, [loading], the Cancel and Import buttons, crucible-dialog's Escape handling.
   * Data: an import answered by the test.
   */
  it('cannot be closed while the import runs', async () => {
    const { user, data, fileInput, close, escape, completed } =
      await renderImport();
    const answer = new Subject<ImportEventTemplatesResult>();
    data.import.mockReturnValueOnce(answer);
    await user.upload(fileInput, jsonFile());

    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Importing/ })).toBeDisabled();
    escape();
    expect(close).not.toHaveBeenCalled();
    expect(completed()).toBe(0);

    answer.next(result());
    answer.complete();
    await user.click(await screen.findByRole('button', { name: 'OK' }));

    expect(completed()).toBe(1);
  });

  /**
   * Verifies: a refused import enables Cancel again, and keeps the form for another try.
   * Interacts with: import error path, finalize.
   * Data: a 403.
   */
  it('can be closed again after a refused import', async () => {
    const { user, data, fileInput } = await renderImport();
    data.import.mockReturnValueOnce(
      throwError(() => new HttpErrorResponse({ status: 403 })),
    );
    await user.upload(fileInput, jsonFile());

    await user.click(screen.getByRole('button', { name: 'Import' }));

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Import' })).toBeEnabled();
  });
});
