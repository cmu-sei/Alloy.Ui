// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of, Subject, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ClipboardModule } from 'ngx-clipboard';
import {
  Directory,
  Event as AlloyEvent,
  EventService,
  EventTemplate,
  EventTemplateService,
  ScenarioTemplate,
  View,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateEditComponent } from '../event-template-edit/event-template-edit.component';
import { EventTemplateListComponent } from './event-template-list.component';

@Component({
  selector: 'app-event-template-memberships',
  template: '',
  standalone: false,
})
class EventTemplateMembershipsStubComponent {
  @Input() eventTemplateId: string;
  @Input() showHeader: boolean;
}

const templates = (): EventTemplate[] => [
  { id: 't1', name: 'Alpha', description: 'First', durationHours: 2 },
  { id: 't2', name: 'Bravo', description: 'Second', durationHours: 3 },
];

type EditResult = { action: string; eventTemplate: EventTemplate | null };

async function renderList(
  grants: PermissionGrants,
  options: { events?: AlloyEvent[] } = {},
) {
  const templateApi = {
    getEventTemplates: vi.fn(() => of(templates())),
    createEventTemplate: vi.fn((t: EventTemplate) =>
      of<EventTemplate>({ ...t, id: 't-new' }),
    ),
    updateEventTemplate: vi.fn((id: string, t: EventTemplate) =>
      of<EventTemplate>({ ...t, id }),
    ),
    deleteEventTemplate: vi.fn(() => of({})),
  } satisfies ApiStub<EventTemplateService>;
  const eventApi = {
    getEventTemplateEvents: vi.fn(() => of(options.events ?? [])),
  } satisfies ApiStub<EventService>;
  // The edit dialog is an edge here: the list only reacts to its editComplete
  // output and calls showSaveError, so the spec drives both itself.
  const editComplete = new Subject<EditResult>();
  const showSaveError = vi.fn();
  const { dialogRef, close } = dialogRefStub<EventTemplateEditComponent>();
  dialogRef.componentInstance = {
    editComplete,
    showSaveError,
  } as unknown as EventTemplateEditComponent;
  const dialog = { open: vi.fn(() => dialogRef) };
  const lists = {
    viewList: of<View[]>([]),
    directoryList: of<Directory[]>([]),
    scenarioTemplateList: of<ScenarioTemplate[]>([]),
  };

  const rendered = await renderComponent(EventTemplateListComponent, {
    declarations: [
      EventTemplateListComponent,
      EventTemplateMembershipsStubComponent,
    ],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSortModule,
      MatTableModule,
      ClipboardModule,
    ],
    providers: [
      { provide: EventTemplateService, useValue: templateApi },
      { provide: EventService, useValue: eventApi },
      { provide: MatDialog, useValue: dialog as unknown as MatDialog },
      ...permissionDataProviders(grants),
    ],
    inputs: { ...lists, eventTemplates: templates() },
  });
  let refreshes = 0;
  rendered.fixture.componentInstance.refreshTemplates.subscribe(
    () => refreshes++,
  );
  return {
    ...rendered,
    user: userEvent.setup(),
    templateApi,
    eventApi,
    dialog,
    editComplete,
    showSaveError,
    close,
    lists,
    refreshes: () => refreshes,
  };
}

const table = () => screen.getByRole('table');
const rowOf = (name: string) =>
  within(table()).getByText(name).closest('tr') as HTMLElement;
/** The data the list passed to the last edit dialog it opened. */
const dialogData = (dialog: { open: ReturnType<typeof vi.fn> }) =>
  (dialog.open.mock.lastCall?.[1] as { data: Record<string, unknown> }).data;

describe('EventTemplateListComponent', () => {
  /**
   * Verifies: the templates are listed and the list loads the template store on construction.
   * Interacts with: eventTemplates input, EventTemplateService.getEventTemplates through the real EventTemplateDataService, rendered table.
   * Data: two templates; system ViewEventTemplates.
   */
  it('lists the templates', async () => {
    const { templateApi } = await renderList({
      system: ['ViewEventTemplates'],
    });

    expect(templateApi.getEventTemplates).toHaveBeenCalled();
    expect(within(table()).getByText('Alpha')).toBeInTheDocument();
    expect(within(table()).getByText('Bravo')).toBeInTheDocument();
  });

  describe('create gate', () => {
    /**
     * Verifies: system CreateEventTemplates shows the Add Event Template button.
     * Interacts with: real PermissionDataService.canCreateEventTemplates, rendered header button.
     * Data: system CreateEventTemplates.
     */
    it('shows Add with CreateEventTemplates', async () => {
      await renderList({ system: ['CreateEventTemplates'] });

      expect(
        within(table()).getByRole('button', { name: 'Add Event Template' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: without system CreateEventTemplates the Add Event Template button is hidden.
     * Interacts with: real PermissionDataService.canCreateEventTemplates, rendered header.
     * Data: near misses: Edit and Manage EventTemplates; CreateEvents.
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'EditEventTemplates and ManageEventTemplates',
        grants: { system: ['EditEventTemplates', 'ManageEventTemplates'] },
      },
      { label: 'CreateEvents', grants: { system: ['CreateEvents'] } },
    ])('hides Add with $label', async ({ grants }) => {
      await renderList(grants);

      expect(
        within(table()).queryByRole('button', { name: 'Add Event Template' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('edit gate', () => {
    /**
     * Verifies: the row button reads Edit with system Edit/ManageEventTemplates or an Edit/ManageEventTemplate claim on that template.
     * Interacts with: real PermissionDataService.canEditEventTemplate / canManageEventTemplate (system and claim paths), rendered row buttons.
     * Data: templates t1 (Alpha) and t2 (Bravo); one grant per row.
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'system EditEventTemplates',
        grants: { system: ['EditEventTemplates'] },
      },
      {
        label: 'system ManageEventTemplates',
        grants: { system: ['ManageEventTemplates'] },
      },
      {
        label: 'an EditEventTemplate claim',
        grants: {
          eventTemplates: [
            { eventTemplateId: 't1', permissions: ['EditEventTemplate'] },
          ],
        },
      },
      {
        label: 'a ManageEventTemplate claim',
        grants: {
          eventTemplates: [
            { eventTemplateId: 't1', permissions: ['ManageEventTemplate'] },
          ],
        },
      },
    ])('offers Edit with $label', async ({ grants }) => {
      await renderList(grants);

      expect(
        within(rowOf('Alpha')).getByRole('button', { name: 'Edit: Alpha' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: without edit or manage rights on a template, its row button reads View instead of Edit.
     * Interacts with: real PermissionDataService.canEditEventTemplate / canManageEventTemplate, rendered row buttons.
     * Data: near misses: system ViewEventTemplates; a ViewEventTemplate claim on t1; Edit and Manage claims on t2 only (Alpha is t1).
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'system ViewEventTemplates',
        grants: { system: ['ViewEventTemplates'] },
      },
      {
        label: 'a ViewEventTemplate claim',
        grants: {
          eventTemplates: [
            { eventTemplateId: 't1', permissions: ['ViewEventTemplate'] },
          ],
        },
      },
      {
        label: 'claims on another template',
        grants: {
          eventTemplates: [
            {
              eventTemplateId: 't2',
              permissions: ['EditEventTemplate', 'ManageEventTemplate'],
            },
          ],
        },
      },
    ])('offers only View without edit rights ($label)', async ({ grants }) => {
      await renderList(grants);

      expect(
        within(rowOf('Alpha')).queryByRole('button', { name: 'Edit: Alpha' }),
      ).not.toBeInTheDocument();
      expect(
        within(rowOf('Alpha')).getByRole('button', { name: 'View: Alpha' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: the edit dialog opened from a row gets canEdit, canManage and canCreate from the user's rights and hasEvents from the template's events.
     * Interacts with: the row's Edit or View button (user-event), EventService.getEventTemplateEvents, real PermissionDataService, MatDialog.open stub.
     * Data: per row the grants, the button they label (View: Alpha read-only, Edit: Alpha otherwise) and the dialog flags they produce; t1 has one event in the last row.
     */
    it.each<{
      label: string;
      grants: PermissionGrants;
      events: AlloyEvent[];
      button: string;
      expected: Record<string, boolean>;
    }>([
      {
        label: 'a ViewEventTemplate claim (read-only)',
        grants: {
          eventTemplates: [
            { eventTemplateId: 't1', permissions: ['ViewEventTemplate'] },
          ],
        },
        events: [],
        button: 'View: Alpha',
        expected: {
          canEdit: false,
          canManage: false,
          canCreate: false,
          hasEvents: false,
        },
      },
      {
        label: 'an EditEventTemplate claim',
        grants: {
          eventTemplates: [
            { eventTemplateId: 't1', permissions: ['EditEventTemplate'] },
          ],
        },
        events: [],
        button: 'Edit: Alpha',
        expected: {
          canEdit: true,
          canManage: false,
          canCreate: false,
          hasEvents: false,
        },
      },
      {
        label: 'system Manage and CreateEventTemplates',
        grants: { system: ['ManageEventTemplates', 'CreateEventTemplates'] },
        events: [{ id: 'e1' }],
        button: 'Edit: Alpha',
        expected: {
          canEdit: false,
          canManage: true,
          canCreate: true,
          hasEvents: true,
        },
      },
    ])(
      'opens the edit dialog with $label',
      async ({ grants, events, button, expected }) => {
        const { user, dialog, eventApi } = await renderList(grants, { events });

        await user.click(
          within(rowOf('Alpha')).getByRole('button', { name: button }),
        );

        expect(eventApi.getEventTemplateEvents).toHaveBeenCalledWith('t1');
        expect(dialog.open).toHaveBeenCalledWith(
          EventTemplateEditComponent,
          expect.anything(),
        );
        expect(dialogData(dialog)).toEqual(expect.objectContaining(expected));
      },
    );
  });

  /**
   * Verifies: Add refreshes the template lists and opens a new-template dialog whose gates all come from CreateEventTemplates.
   * Interacts with: Add button (user-event), refreshTemplates output, real PermissionDataService.canCreateEventTemplates, MatDialog.open stub.
   * Data: system CreateEventTemplates.
   */
  it('opens a new-template dialog from Add', async () => {
    const { user, dialog, refreshes, lists } = await renderList({
      system: ['CreateEventTemplates'],
    });

    await user.click(
      within(table()).getByRole('button', { name: 'Add Event Template' }),
    );

    expect(refreshes()).toBe(1);
    expect(dialogData(dialog)).toEqual({
      eventTemplate: {},
      ...lists,
      canEdit: true,
      canManage: true,
      canCreate: true,
      hasEvents: false,
      isNew: true,
    });
  });

  /**
   * Verifies: saving a new template creates it and closes the dialog; a rejected create keeps the dialog open and shows the error.
   * Interacts with: Add button, editComplete (save), EventTemplateService.createEventTemplate, dialog close spy, showSaveError spy.
   * Data: system CreateEventTemplates; the create succeeds, then fails with a 400.
   */
  it.each([
    { label: 'succeeds', fails: false, closes: 1, errors: 0 },
    { label: 'is rejected', fails: true, closes: 0, errors: 1 },
  ])('handles a create that $label', async ({ fails, closes, errors }) => {
    const rendered = await renderList({ system: ['CreateEventTemplates'] });
    const failure = { status: 400, error: { title: 'No default team' } };
    if (fails) {
      rendered.templateApi.createEventTemplate.mockReturnValue(
        throwError(() => failure),
      );
    }

    await rendered.user.click(
      within(table()).getByRole('button', { name: 'Add Event Template' }),
    );
    rendered.editComplete.next({
      action: 'save',
      eventTemplate: { name: 'Charlie' },
    });

    expect(rendered.templateApi.createEventTemplate).toHaveBeenCalledWith({
      name: 'Charlie',
    });
    expect(rendered.close).toHaveBeenCalledTimes(closes);
    expect(rendered.showSaveError).toHaveBeenCalledTimes(errors);
  });

  /**
   * Verifies: from the edit dialog, save updates the template and closes, a rejected save shows the error, clone creates a copy and closes, and delete deletes and closes.
   * Interacts with: the row button (user-event), editComplete, EventTemplateService update/create/delete, dialog close spy, showSaveError spy.
   * Data: system EditEventTemplates and ManageEventTemplates; one action per row.
   */
  it.each([
    {
      action: 'save',
      fails: false,
      call: 'updateEventTemplate',
      closes: 1,
      errors: 0,
    },
    {
      action: 'save',
      fails: true,
      call: 'updateEventTemplate',
      closes: 0,
      errors: 1,
    },
    {
      action: 'clone',
      fails: false,
      call: 'createEventTemplate',
      closes: 1,
      errors: 0,
    },
    {
      action: 'delete',
      fails: false,
      call: 'deleteEventTemplate',
      closes: 1,
      errors: 0,
    },
  ] as const)(
    'handles $action from the edit dialog (fails: $fails)',
    async ({ action, fails, call, closes, errors }) => {
      const rendered = await renderList({
        system: ['EditEventTemplates', 'ManageEventTemplates'],
      });
      if (fails) {
        rendered.templateApi.updateEventTemplate.mockReturnValue(
          throwError(() => ({ status: 400 })),
        );
      }

      await rendered.user.click(
        within(rowOf('Alpha')).getByRole('button', { name: 'Edit: Alpha' }),
      );
      rendered.editComplete.next({
        action,
        eventTemplate: { ...templates()[0] },
      });

      expect(rendered.templateApi[call]).toHaveBeenCalled();
      expect(rendered.close).toHaveBeenCalledTimes(closes);
      expect(rendered.showSaveError).toHaveBeenCalledTimes(errors);
    },
  );

  /**
   * Verifies: clicking a row expands it with that template's memberships, without the header.
   * Interacts with: row click (user-event), memberships stub inputs.
   * Data: system ViewEventTemplates; Alpha expanded.
   */
  it('expands a row to its memberships', async () => {
    const { fixture, user } = await renderList({
      system: ['ViewEventTemplates'],
    });

    await user.click(within(rowOf('Alpha')).getByText('Alpha'));

    const memberships = fixture.debugElement.query(
      By.directive(EventTemplateMembershipsStubComponent),
    ).componentInstance as EventTemplateMembershipsStubComponent;
    expect(memberships.eventTemplateId).toBe('t1');
    expect(memberships.showHeader).toBe(false);
  });
});
