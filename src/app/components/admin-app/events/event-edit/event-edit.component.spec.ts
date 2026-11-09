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
import { formatDate } from '@angular/common';
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
  data: {
    event: AlloyEvent;
    canEdit: boolean;
    canManage: boolean;
    canEndNow?: boolean;
  },
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
  const emitted: {
    action: string;
    event: AlloyEvent | null;
    immediate?: boolean;
  }[] = [];
  rendered.fixture.componentInstance.editComplete.subscribe((e) =>
    emitted.push(e),
  );
  return { ...rendered, user: userEvent.setup(), confirm, emitted };
}

// Role queries for the action buttons are scoped to the dialog's action row.
const actionsEl = () => document.querySelector('.bottom-button') as HTMLElement;
const button = (name: string) =>
  within(actionsEl()).getByRole('button', { name });
/** The end button, whichever of its two labels canEndNow gives it. */
const endButton = () =>
  within(actionsEl()).getByRole('button', { name: /^End Event( Now)?$/ });
const field = (name: string) =>
  screen.getByLabelText(name, { selector: 'input, textarea' });

describe('EventEditComponent', () => {
  /**
   * Verifies: with canEdit and canManage on an active event, the editable fields, Save, the end button and Delete Event are enabled, and the record fields stay read-only.
   * Interacts with: MAT_DIALOG_DATA canEdit/canManage, rendered fields and buttons.
   * Data: an Active event; canEdit and canManage true, canEndNow unset.
   */
  it('enables editing, Save, End and Delete when allowed', async () => {
    await renderEdit({ event: makeEvent(), canEdit: true, canManage: true });

    expect(field('Name (required)')).toBeEnabled();
    expect(field('Description')).toBeEnabled();
    expect(field('Expiration Date')).toBeEnabled();
    expect(field('Username')).toBeDisabled();
    expect(button('Save')).toBeEnabled();
    expect(endButton()).toBeEnabled();
    expect(button('Delete Event')).toBeEnabled();
  });

  /**
   * Verifies: without canEdit and canManage every field, Save, the end button and Delete Event are disabled.
   * Interacts with: MAT_DIALOG_DATA gates (AdminEventListComponent passes false without EditEvent/ManageEvent rights), rendered fields and buttons.
   * Data: an Active event; canEdit and canManage false.
   */
  it('is read-only without canEdit or canManage', async () => {
    await renderEdit({ event: makeEvent(), canEdit: false, canManage: false });

    expect(field('Name (required)')).toBeDisabled();
    expect(field('Description')).toBeDisabled();
    expect(field('Expiration Date')).toBeDisabled();
    expect(button('Save')).toBeDisabled();
    expect(endButton()).toBeDisabled();
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
    expect(endButton().hasAttribute('disabled')).toBe(!gates.canManage);
    expect(button('Delete Event').hasAttribute('disabled')).toBe(
      !gates.canManage,
    );
  });

  /**
   * Verifies: without canEndNow an Ended, Expired or Suspended event cannot be ended again, a Failed or Recovering one can; Ended and Failed events lock the editable fields even with canEdit.
   * Interacts with: data.event.status, rendered fields and End Event button.
   * Data: canEdit and canManage true, canEndNow unset; status Ended, Expired, Suspended, Recovering, Failed.
   * Why: a Suspended event has already been ended and waits out its grace period; a Recovering one can be ended again (the API suspends it again).
   */
  it.each([
    { status: 'Ended', endable: false, editable: false },
    { status: 'Expired', endable: false, editable: true },
    { status: 'Suspended', endable: false, editable: true },
    { status: 'Recovering', endable: true, editable: true },
    { status: 'Failed', endable: true, editable: false },
  ] as const)(
    'with status $status, End is enabled: $endable, Name is editable: $editable',
    async ({ status, endable, editable }) => {
      await renderEdit({
        event: makeEvent({ status }),
        canEdit: true,
        canManage: true,
      });

      expect(button('End Event').hasAttribute('disabled')).toBe(!endable);
      expect(field('Name (required)').hasAttribute('disabled')).toBe(!editable);
    },
  );

  /**
   * Verifies: with canEndNow the button reads End Event Now and is enabled for every status but Ended and Expired, including a Suspended event, whose grace period it cuts short.
   * Interacts with: MAT_DIALOG_DATA canEndNow (system ManageEvents), data.event.status, rendered End Event Now button.
   * Data: canManage and canEndNow true; status Active, Suspended, Recovering, Failed, Ended, Expired.
   */
  it.each([
    { status: 'Active', endable: true },
    { status: 'Suspended', endable: true },
    { status: 'Recovering', endable: true },
    { status: 'Failed', endable: true },
    { status: 'Ended', endable: false },
    { status: 'Expired', endable: false },
  ] as const)(
    'with canEndNow and status $status, End Event Now is enabled: $endable',
    async ({ status, endable }) => {
      await renderEdit({
        event: makeEvent({ status }),
        canEdit: false,
        canManage: true,
        canEndNow: true,
      });

      expect(button('End Event Now').hasAttribute('disabled')).toBe(!endable);
      expect(
        within(actionsEl()).queryByRole('button', { name: 'End Event' }),
      ).not.toBeInTheDocument();
    },
  );

  /**
   * Verifies: canEndNow does not enable ending without canManage.
   * Interacts with: MAT_DIALOG_DATA canManage and canEndNow, rendered End Event Now button.
   * Data: near miss: an Active event with canEndNow true and canManage false.
   */
  it('disables End Event Now without canManage', async () => {
    await renderEdit({
      event: makeEvent(),
      canEdit: true,
      canManage: false,
      canEndNow: true,
    });

    expect(button('End Event Now')).toBeDisabled();
  });

  /**
   * Verifies: the confirmation and the emitted end action follow canEndNow: with it the dialog warns that the resources are destroyed at once and the action is immediate; without it the plain question is asked and the action is not immediate.
   * Interacts with: the end button (user-event), CrucibleDialogService.confirm (confirmed), editComplete output.
   * Data: an Active event named Cyber Range 101; canManage true; per row canEndNow true or false.
   */
  it.each([
    {
      canEndNow: true,
      name: 'End Event Now',
      message:
        'Are you sure that you want to end event Cyber Range 101 now? Its resources are destroyed right away, and it cannot be recovered.',
    },
    {
      canEndNow: false,
      name: 'End Event',
      message: 'Are you sure that you want to end event Cyber Range 101?',
    },
  ])(
    'with canEndNow $canEndNow, $name confirms and emits immediate $canEndNow',
    async ({ canEndNow, name, message }) => {
      const event = makeEvent();
      const { user, confirm, emitted } = await renderEdit(
        { event, canEdit: false, canManage: true, canEndNow },
        { confirm: true },
      );

      await user.click(button(name));

      expect(confirm).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ title: name, message }),
      );
      expect(emitted).toEqual([{ action: 'end', event, immediate: canEndNow }]);
    },
  );

  /**
   * Verifies: Recover Event is offered only for a Suspended event.
   * Interacts with: data.event.status, the dialog's action row.
   * Data: canEdit and canManage true; every other status an admin can open, including Recovering and Ending.
   */
  it.each([
    'Active',
    'Paused',
    'Creating',
    'Recovering',
    'Ending',
    'Ended',
    'Expired',
    'Failed',
  ] as const)('hides Recover Event for a %s event', async (status) => {
    await renderEdit({
      event: makeEvent({ status }),
      canEdit: true,
      canManage: true,
    });

    expect(endButton()).toBeInTheDocument();
    expect(
      within(actionsEl()).queryByRole('button', { name: 'Recover Event' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: with canManage, a Suspended event's Recover Event is enabled and describes the end of its grace period, and clicking it emits recover with the event and no confirmation.
   * Interacts with: MAT_DIALOG_DATA canManage, Recover Event button (user-event), its matTooltip description, CrucibleDialogService.confirm, editComplete output.
   * Data: a Suspended event recoverable until 2026-11-06T18:30:00Z; canManage true, canEdit false.
   * Why: nothing has been destroyed yet, so recovering asks nothing; the tooltip is the only place the dialog shows the deadline.
   */
  it('recovers a Suspended event without confirming when canManage', async () => {
    const recoverableUntil = new Date('2026-11-06T18:30:00Z');
    const event = makeEvent({ status: 'Suspended', recoverableUntil });
    const { user, confirm, emitted, fixture } = await renderEdit({
      event,
      canEdit: false,
      canManage: true,
    });
    await fixture.whenStable();
    fixture.detectChanges();

    const recover = button('Recover Event');
    expect(recover).toBeEnabled();
    expect(recover).toHaveAccessibleDescription(
      'Recoverable until ' + formatDate(recoverableUntil, 'medium', 'en-US'),
    );

    await user.click(recover);

    expect(confirm).not.toHaveBeenCalled();
    expect(emitted).toEqual([{ action: 'recover', event }]);
  });

  /**
   * Verifies: without canManage a Suspended event's Recover Event is shown but disabled, even with canEdit.
   * Interacts with: MAT_DIALOG_DATA canManage gate (AdminEventListComponent passes false without ManageEvent rights), Recover Event button.
   * Data: near miss: a Suspended event with canEdit true and canManage false.
   */
  it('disables Recover Event without canManage', async () => {
    await renderEdit({
      event: makeEvent({
        status: 'Suspended',
        recoverableUntil: new Date('2026-11-06T18:30:00Z'),
      }),
      canEdit: true,
      canManage: false,
    });

    expect(button('Recover Event')).toBeDisabled();
    expect(button('Save')).toBeEnabled();
  });

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
   * Verifies: End Event Now (with canEndNow), End Event (without) and Delete Event ask for confirmation and emit only when confirmed.
   * Interacts with: the three buttons (user-event), CrucibleDialogService.confirm (answers per row), editComplete output.
   * Data: canManage true; per row the button, canEndNow, the confirm answer and the expected actions.
   */
  it.each([
    {
      name: 'End Event Now',
      title: 'End Event Now',
      canEndNow: true,
      answer: true,
      actions: ['end'],
    },
    {
      name: 'End Event Now',
      title: 'End Event Now',
      canEndNow: true,
      answer: false,
      actions: [],
    },
    {
      name: 'End Event',
      title: 'End Event',
      canEndNow: false,
      answer: true,
      actions: ['end'],
    },
    {
      name: 'End Event',
      title: 'End Event',
      canEndNow: false,
      answer: false,
      actions: [],
    },
    {
      name: 'Delete Event',
      title: 'Delete Event',
      canEndNow: false,
      answer: true,
      actions: ['delete'],
    },
    {
      name: 'Delete Event',
      title: 'Delete Event',
      canEndNow: false,
      answer: false,
      actions: [],
    },
  ])(
    '$name emits only when confirmed (answer $answer)',
    async ({ name, title, canEndNow, answer, actions }) => {
      const { user, confirm, emitted } = await renderEdit(
        { event: makeEvent(), canEdit: false, canManage: true, canEndNow },
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
