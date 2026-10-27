// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { ImportEventTemplatesResult } from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
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
  const rendered = await renderComponent(EventTemplateImportComponent, {
    providers: [{ provide: EventTemplateDataService, useValue: data }],
  });
  const completed: boolean[] = [];
  rendered.fixture.componentInstance.complete.subscribe((x) =>
    completed.push(x),
  );
  const fileInput = rendered.container.querySelector(
    'input[type="file"]',
  ) as HTMLInputElement;
  return {
    ...rendered,
    user: userEvent.setup({ applyAccept: false }),
    data,
    completed,
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
   * Verifies: per-item failures are listed with their reason, and OK completes with true since something was imported.
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
    expect(completed).toEqual([true]);
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
      screen.getByText('The file is not an Event Template export'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Import' })).toBeInTheDocument();
    expect(completed).toEqual([]);
  });
});
