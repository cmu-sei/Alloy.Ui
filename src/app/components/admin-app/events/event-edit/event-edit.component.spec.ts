// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ClipboardModule } from 'ngx-clipboard';
import {
  CRUCIBLE_DIALOG_IMPORTS,
  CrucibleDialogService,
} from '@cmusei/crucible-common';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventEditComponent } from './event-edit.component';

const makeEvent = (overrides: Partial<AlloyEvent> = {}): AlloyEvent => ({
  id: 'e1',
  name: 'Cyber Range 101',
  description: 'Practice',
  username: 'Alex Doe',
  userId: 'u1',
  status: 'Active',
  internalStatus: 'Launched',
  ...overrides,
});

async function renderEdit(
  data: { event: AlloyEvent; canEdit: boolean; canManage: boolean },
  options: { confirm?: boolean } = {},
) {
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(options.confirm).dialogRef,
  );
  const crucibleDialog: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const rendered = await renderComponent(EventEditComponent, {
    declarations: [EventEditComponent],
    imports: [
      ...CRUCIBLE_DIALOG_IMPORTS,
      MatButtonModule,
      MatIconModule,
      MatInputModule,
      ClipboardModule,
    ],
    providers: [
      { provide: MAT_DIALOG_DATA, useValue: data },
      { provide: MatDialogRef, useValue: dialogRefStub().dialogRef },
      { provide: CrucibleDialogService, useValue: crucibleDialog },
    ],
  });
  const emitted: { action: string; event: AlloyEvent | null }[] = [];
  rendered.fixture.componentInstance.editComplete.subscribe((e) =>
    emitted.push(e),
  );
  return { ...rendered, user: userEvent.setup(), confirm, emitted };
}

// Role queries for the action buttons are scoped to the dialog's action row.
const actionsEl = () => document.querySelector('.bottom-button') as HTMLElement;
const button = (name: string) =>
  within(actionsEl()).getByRole('button', { name });
const field = (name: string) =>
  screen.getByLabelText(name, { selector: 'input, textarea' });

describe('EventEditComponent', () => {
  /**
   * Verifies: with canEdit and canManage on an active event, the editable fields, Save, End Event Now and Delete Event are enabled, and the record fields stay read-only.
   * Interacts with: MAT_DIALOG_DATA canEdit/canManage, rendered fields and buttons.
   * Data: an Active event; canEdit and canManage true.
   */
  it('enables editing, Save, End and Delete when allowed', async () => {
    await renderEdit({ event: makeEvent(), canEdit: true, canManage: true });

    expect(field('Name (required)')).toBeEnabled();
    expect(field('Description')).toBeEnabled();
    expect(field('Expiration Date')).toBeEnabled();
    expect(field('Username')).toBeDisabled();
    expect(button('Save')).toBeEnabled();
    expect(button('End Event Now')).toBeEnabled();
    expect(button('Delete Event')).toBeEnabled();
  });

  /**
   * Verifies: without canEdit and canManage every field, Save, End Event Now and Delete Event are disabled.
   * Interacts with: MAT_DIALOG_DATA gates (AdminEventListComponent passes false without EditEvent/ManageEvent rights), rendered fields and buttons.
   * Data: an Active event; canEdit and canManage false.
   */
  it('is read-only without canEdit or canManage', async () => {
    await renderEdit({ event: makeEvent(), canEdit: false, canManage: false });

    expect(field('Name (required)')).toBeDisabled();
    expect(field('Description')).toBeDisabled();
    expect(field('Expiration Date')).toBeDisabled();
    expect(button('Save')).toBeDisabled();
    expect(button('End Event Now')).toBeDisabled();
    expect(button('Delete Event')).toBeDisabled();
  });

  /**
   * Verifies: canEdit and canManage gate separately: canEdit alone allows Save but not End or Delete; canManage alone allows End and Delete but not Save or edits.
   * Interacts with: MAT_DIALOG_DATA gates, rendered fields and buttons.
   * Data: near misses on an Active event: canEdit without canManage; canManage without canEdit.
   */
  it.each([
    { label: 'canEdit without canManage', canEdit: true, canManage: false },
    { label: 'canManage without canEdit', canEdit: false, canManage: true },
  ])('gates Save and End/Delete separately with $label', async (gates) => {
    await renderEdit({ event: makeEvent(), ...gates });

    expect(field('Name (required)').hasAttribute('disabled')).toBe(
      !gates.canEdit,
    );
    expect(button('Save').hasAttribute('disabled')).toBe(!gates.canEdit);
    expect(button('End Event Now').hasAttribute('disabled')).toBe(
      !gates.canManage,
    );
    expect(button('Delete Event').hasAttribute('disabled')).toBe(
      !gates.canManage,
    );
  });

  /**
   * Verifies: an Ended or Expired event cannot be ended again, a Failed one can; Ended and Failed events lock the editable fields even with canEdit.
   * Interacts with: data.event.status, rendered fields and End button.
   * Data: canEdit and canManage true; status Ended, Expired, Failed.
   */
  it.each([
    { status: 'Ended', endable: false, editable: false },
    { status: 'Expired', endable: false, editable: true },
    { status: 'Failed', endable: true, editable: false },
  ] as const)(
    'with status $status, End is enabled: $endable, Name is editable: $editable',
    async ({ status, endable, editable }) => {
      await renderEdit({
        event: makeEvent({ status }),
        canEdit: true,
        canManage: true,
      });

      expect(button('End Event Now').hasAttribute('disabled')).toBe(!endable);
      expect(field('Name (required)').hasAttribute('disabled')).toBe(!editable);
    },
  );

  /**
   * Verifies: a name and a description edited and left (blur) are saved into the event that Save emits.
   * Interacts with: Name and Description inputs (user-event typing; each left by focusing the next control), saveEvent('name') and saveEvent('description') on blur, Save button, editComplete output.
   * Data: canEdit true; name changed to 'Cyber Range 102', description to 'Practice range'.
   */
  it('emits save with the edited name and description', async () => {
    const { user, emitted } = await renderEdit({
      event: makeEvent(),
      canEdit: true,
      canManage: true,
    });

    await user.clear(field('Name (required)'));
    await user.type(field('Name (required)'), 'Cyber Range 102');
    // Focusing the next control leaves the previous field, which fires its blur.
    await user.clear(field('Description'));
    await user.type(field('Description'), 'Practice range');
    await user.click(button('Save'));

    expect(emitted).toEqual([
      {
        action: 'save',
        event: expect.objectContaining({
          id: 'e1',
          name: 'Cyber Range 102',
          description: 'Practice range',
        }),
      },
    ]);
  });

  /**
   * Verifies: End Event Now and Delete Event ask for confirmation and emit only when confirmed.
   * Interacts with: the two buttons (user-event), CrucibleDialogService.confirm (answers per row), editComplete output.
   * Data: canManage true; per row the button, the confirm answer and the expected actions.
   */
  it.each([
    {
      name: 'End Event Now',
      title: 'End Event Now',
      answer: true,
      actions: ['end'],
    },
    {
      name: 'End Event Now',
      title: 'End Event Now',
      answer: false,
      actions: [],
    },
    {
      name: 'Delete Event',
      title: 'Delete Event',
      answer: true,
      actions: ['delete'],
    },
    { name: 'Delete Event', title: 'Delete Event', answer: false, actions: [] },
  ])(
    '$name emits only when confirmed (answer $answer)',
    async ({ name, title, answer, actions }) => {
      const { user, confirm, emitted } = await renderEdit(
        { event: makeEvent(), canEdit: false, canManage: true },
        { confirm: answer },
      );

      await user.click(button(name));

      expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title }));
      expect(emitted.map((e) => e.action)).toEqual(actions);
    },
  );

  /**
   * Verifies: Cancel emits an empty action.
   * Interacts with: Cancel button, editComplete output.
   * Data: canEdit true.
   */
  it('emits an empty action on Cancel', async () => {
    const { user, emitted } = await renderEdit({
      event: makeEvent(),
      canEdit: true,
      canManage: true,
    });

    await user.click(button('Cancel'));

    expect(emitted).toEqual([{ action: '', event: null }]);
  });

  /**
   * Verifies: a failed event shows its failure summary and the internal status it failed at.
   * Interacts with: data.event.errorMessage and lastLaunchInternalStatus, rendered failure block.
   * Data: a Failed event with an error message.
   */
  it('shows the failure summary of a failed event', async () => {
    await renderEdit({
      event: makeEvent({
        status: 'Failed',
        errorMessage: 'Plan failed.',
        lastLaunchInternalStatus: 'PlanningLaunch',
      }),
      canEdit: false,
      canManage: false,
    });

    expect(screen.getByText('Failure')).toBeInTheDocument();
    expect(screen.getByText('Plan failed.')).toBeInTheDocument();
    expect(screen.getByText('Failed at: PlanningLaunch')).toBeInTheDocument();
  });
});
