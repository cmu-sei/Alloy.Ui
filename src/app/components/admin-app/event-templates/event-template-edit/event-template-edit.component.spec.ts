// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from 'ngx-clipboard';
import {
  CRUCIBLE_DIALOG_IMPORTS,
  CrucibleDialogService,
} from '@cmusei/crucible-common';
import {
  Directory,
  EventTemplate,
  ScenarioTemplate,
  View,
} from 'src/app/generated/alloy.api';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateEditComponent } from './event-template-edit.component';

interface EditData {
  eventTemplate: EventTemplate;
  canEdit: boolean;
  canManage: boolean;
  canCreate: boolean;
  hasEvents?: boolean;
  isNew?: boolean;
  views?: View[];
}

const template = (): EventTemplate => ({
  id: 't1',
  name: 'Range Template',
  description: 'A practice range',
  durationHours: 4,
  viewId: 'v1',
  isPublished: false,
  useDynamicHost: false,
});

async function renderEdit(data: EditData, options: { confirm?: boolean } = {}) {
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(options.confirm).dialogRef,
  );
  const crucibleDialog: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const rendered = await renderComponent(EventTemplateEditComponent, {
    declarations: [EventTemplateEditComponent],
    imports: [
      ...CRUCIBLE_DIALOG_IMPORTS,
      MatAutocompleteModule,
      MatButtonModule,
      MatCheckboxModule,
      MatIconModule,
      MatInputModule,
      MatTooltipModule,
      ClipboardModule,
    ],
    providers: [
      {
        provide: MAT_DIALOG_DATA,
        useValue: {
          hasEvents: false,
          ...data,
          viewList: of<View[]>(
            data.views ?? [
              { id: 'v1', name: 'Range View', defaultTeamId: 'team-1' },
            ],
          ),
          directoryList: of<Directory[]>([]),
          scenarioTemplateList: of<ScenarioTemplate[]>([]),
        },
      },
      { provide: MatDialogRef, useValue: dialogRefStub().dialogRef },
      { provide: CrucibleDialogService, useValue: crucibleDialog },
    ],
  });
  const emitted: { action: string; eventTemplate: EventTemplate | null }[] = [];
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
const allowed = { canEdit: true, canManage: true, canCreate: true };

describe('EventTemplateEditComponent', () => {
  /**
   * Verifies: with canEdit, canManage and canCreate on an existing template, the dialog is titled Edit and the fields, Save, Clone and Delete are enabled.
   * Interacts with: MAT_DIALOG_DATA canEdit/canManage/canCreate, rendered fields and buttons.
   * Data: template t1 with a view that has a default team; no events.
   */
  it('enables editing, Save, Clone and Delete when allowed', async () => {
    await renderEdit({ eventTemplate: template(), ...allowed });

    expect(
      screen.getByRole('heading', { name: 'Edit Event Template' }),
    ).toBeInTheDocument();
    expect(field('Name (required)')).toBeEnabled();
    expect(field('Duration Hours (required)')).toBeEnabled();
    expect(screen.getByLabelText('Public')).toBeEnabled();
    expect(button('Save')).toBeEnabled();
    expect(button('Clone')).toBeEnabled();
    expect(button('Delete')).toBeEnabled();
  });

  /**
   * Verifies: without canEdit, canManage and canCreate the dialog is titled View and every field, Save, Clone and Delete are disabled.
   * Interacts with: MAT_DIALOG_DATA gates (EventTemplateListComponent passes false without EditEventTemplate/ManageEventTemplate/CreateEventTemplates), rendered fields and buttons.
   * Data: template t1; canEdit, canManage and canCreate false.
   */
  it('is read-only without canEdit, canManage or canCreate', async () => {
    const { fixture } = await renderEdit({
      eventTemplate: template(),
      canEdit: false,
      canManage: false,
      canCreate: false,
    });
    // NgModel applies [disabled] in a microtask; the checkboxes re-render after it.
    await fixture.whenStable();
    fixture.detectChanges();

    expect(
      screen.getByRole('heading', { name: 'View Event Template' }),
    ).toBeInTheDocument();
    expect(field('Name (required)')).toBeDisabled();
    expect(field('Duration Hours (required)')).toBeDisabled();
    expect(field('Player View Template')).toBeDisabled();
    expect(screen.getByLabelText('Public')).toBeDisabled();
    expect(button('Save')).toBeDisabled();
    expect(button('Clone')).toBeDisabled();
    expect(button('Delete')).toBeDisabled();
  });

  /**
   * Verifies: each of canManage and canCreate gates only its own button: Delete without canManage, Clone without canCreate, while Save stays enabled with canEdit.
   * Interacts with: MAT_DIALOG_DATA gates, rendered buttons.
   * Data: near misses: canEdit and canCreate without canManage; canEdit and canManage without canCreate.
   */
  it.each([
    {
      label: 'canManage',
      gates: { ...allowed, canManage: false },
      disabled: 'Delete',
      enabled: 'Clone',
    },
    {
      label: 'canCreate',
      gates: { ...allowed, canCreate: false },
      disabled: 'Clone',
      enabled: 'Delete',
    },
  ])(
    'disables $disabled without $label',
    async ({ gates, disabled, enabled }) => {
      await renderEdit({ eventTemplate: template(), ...gates });

      expect(button(disabled)).toBeDisabled();
      expect(button(enabled)).toBeEnabled();
      expect(button('Save')).toBeEnabled();
    },
  );

  /**
   * Verifies: a template that already has events cannot be deleted, even with canManage.
   * Interacts with: MAT_DIALOG_DATA hasEvents, Delete button.
   * Data: all gates true; hasEvents true.
   */
  it('disables Delete when the template has events', async () => {
    await renderEdit({
      eventTemplate: template(),
      ...allowed,
      hasEvents: true,
    });

    expect(button('Delete')).toBeDisabled();
  });

  /**
   * Verifies: a new template is titled Create and offers no Clone or Delete.
   * Interacts with: MAT_DIALOG_DATA isNew, rendered title and buttons.
   * Data: an empty template; all gates true; isNew true.
   */
  it('offers only Cancel and Save for a new template', async () => {
    await renderEdit({ eventTemplate: {}, ...allowed, isNew: true });

    expect(
      screen.getByRole('heading', { name: 'Create New Event Template' }),
    ).toBeInTheDocument();
    expect(
      within(actionsEl()).queryByRole('button', { name: 'Clone' }),
    ).not.toBeInTheDocument();
    expect(
      within(actionsEl()).queryByRole('button', { name: 'Delete' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: Save emits a save with the edited name and the duration as an integer.
   * Interacts with: Name and Duration inputs (user-event), Save button, editComplete output.
   * Data: all gates true; name changed to 'Range Template B', duration 6.
   */
  it('emits save with the edited values', async () => {
    const { user, emitted } = await renderEdit({
      eventTemplate: template(),
      ...allowed,
    });

    await user.type(field('Name (required)'), ' B');
    const duration = field('Duration Hours (required)');
    await user.clear(duration);
    await user.type(duration, '6');
    await user.click(button('Save'));

    expect(emitted).toEqual([
      {
        action: 'save',
        eventTemplate: expect.objectContaining({
          id: 't1',
          name: 'Range Template B',
          durationHours: 6,
        }),
      },
    ]);
  });

  /**
   * Verifies: Clone emits a clone of the template under a ' - clone' name, without its id.
   * Interacts with: Clone button (user-event), editComplete output.
   * Data: all gates true; template t1.
   */
  it('emits a clone under a new name', async () => {
    const { user, emitted } = await renderEdit({
      eventTemplate: template(),
      ...allowed,
    });

    await user.click(button('Clone'));

    expect(emitted).toEqual([
      {
        action: 'clone',
        eventTemplate: {
          name: 'Range Template - clone',
          description: 'A practice range',
          durationHours: 4,
          viewId: 'v1',
          directoryId: undefined,
          scenarioTemplateId: undefined,
        },
      },
    ]);
  });

  /**
   * Verifies: Delete asks for confirmation and emits delete only when confirmed.
   * Interacts with: Delete button (user-event), CrucibleDialogService.confirm (answers per row), editComplete output.
   * Data: all gates true; confirm answers true, then false.
   */
  it.each([
    { answer: true, actions: ['delete'] },
    { answer: false, actions: [] },
  ])(
    'emits delete only when confirmed (answer $answer)',
    async ({ answer, actions }) => {
      const { user, confirm, emitted } = await renderEdit(
        { eventTemplate: template(), ...allowed },
        { confirm: answer },
      );

      await user.click(button('Delete'));

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Event Template' }),
      );
      expect(emitted.map((e) => e.action)).toEqual(actions);
    },
  );

  /**
   * Verifies: a selected Player View with no default team shows the reason and disables Save and Clone.
   * Interacts with: MAT_DIALOG_DATA viewList, selectedViewLacksDefaultTeam, rendered error and buttons.
   * Data: all gates true; view v1 has no defaultTeamId.
   */
  it('blocks Save and Clone when the view has no default team', async () => {
    await renderEdit({
      eventTemplate: template(),
      ...allowed,
      views: [{ id: 'v1', name: 'Range View', defaultTeamId: null }],
    });

    expect(
      screen.getByText(/Set one on the view in Player/),
    ).toBeInTheDocument();
    expect(button('Save')).toBeDisabled();
    expect(button('Clone')).toBeDisabled();
  });

  /**
   * Verifies: showSaveError shows the ProblemDetails title, or a generic message when there is none.
   * Interacts with: showSaveError (called by the list on a rejected save), rendered alert.
   * Data: an error with a title; an error without one.
   */
  it.each([
    {
      error: { error: { title: 'View has no default team' } },
      text: 'View has no default team',
    },
    {
      error: { status: 500 },
      text: 'Could not save the event template. Please try again.',
    },
  ])('shows the save error "$text"', async ({ error, text }) => {
    const { fixture } = await renderEdit({
      eventTemplate: template(),
      ...allowed,
    });

    fixture.componentInstance.showSaveError(error);
    fixture.detectChanges();

    expect(screen.getByRole('alert')).toHaveTextContent(text);
  });
});
