// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { A11yModule } from '@angular/cdk/a11y';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { CRUCIBLE_DIALOG_IMPORTS } from '@cmusei/crucible-common';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import { renderComponent } from 'src/app/test-utils/render-component';
import { NameDialogComponent } from './name-dialog.component';

async function renderNameDialog(data: Record<string, unknown>) {
  const { dialogRef, close } = dialogRefStub<NameDialogComponent>();
  const rendered = await renderComponent(NameDialogComponent, {
    declarations: [NameDialogComponent],
    imports: [A11yModule, MatInputModule, ...CRUCIBLE_DIALOG_IMPORTS],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRef },
    ],
    componentProperties: { title: 'Rename Group' },
  });
  return { ...rendered, user: userEvent.setup(), close };
}

describe('NameDialogComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers, shows the title and the current name, and Save stays disabled until the name changes.
   * Interacts with: MAT_DIALOG_DATA nameValue, the crucible-dialog Save button.
   * Data: nameValue 'Blue Team'.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderNameDialog({ nameValue: 'Blue Team' });

    expect(fixture.componentInstance).toBeInstanceOf(NameDialogComponent);
    expect(
      screen.getByRole('heading', { name: 'Rename Group' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Blue Team');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  /**
   * Verifies: Save closes the dialog with the data, its nameValue set to the edited name.
   * Interacts with: Name input (user-event type), Save button, MatDialogRef.close spy.
   * Data: nameValue 'Blue Team' changed to 'Navy Team'.
   */
  it('closes with the edited name on Save', async () => {
    const { user, close } = await renderNameDialog({ nameValue: 'Blue Team' });

    const name = screen.getByLabelText('Name');
    await user.clear(name);
    await user.type(name, 'Navy Team');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({
        nameValue: 'Navy Team',
        removeArtifacts: false,
      }),
    );
  });

  /**
   * Verifies: with showDescription the dialog offers a Description field seeded from the data and returns it on Save.
   * Interacts with: MAT_DIALOG_DATA showDescription/descriptionValue, Description textarea (user-event type), MatDialogRef.close spy.
   * Data: nameValue 'Blue Team', descriptionValue 'Old'; description changed to 'New'.
   */
  it('edits the description when showDescription is set', async () => {
    const { user, close } = await renderNameDialog({
      nameValue: 'Blue Team',
      showDescription: true,
      descriptionValue: 'Old',
    });

    const description = screen.getByLabelText('Description');
    expect(description).toHaveValue('Old');
    await user.clear(description);
    await user.type(description, 'New');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    expect(close).toHaveBeenCalledWith(
      expect.objectContaining({
        nameValue: 'Blue Team',
        descriptionValue: 'New',
      }),
    );
  });
});
