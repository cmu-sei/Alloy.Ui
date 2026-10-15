// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { Observable, of, Subject, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from 'ngx-clipboard';
import { ComnSettingsService } from '@cmusei/crucible-common';
import {
  Event as AlloyEvent,
  EventErrorDetail,
  EventService,
} from 'src/app/generated/alloy.api';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { EventEditComponent } from '../event-edit/event-edit.component';
import { AdminEventListComponent } from './event-list.component';

@Component({ selector: 'app-event-memberships', template: '' })
class EventMembershipsStubComponent {
  @Input() event: AlloyEvent;
  @Input() embedded: boolean;
}

function makeEvent(overrides: Partial<AlloyEvent> = {}): AlloyEvent {
  return {
    id: 'event-1',
    name: 'Cyber Range 101',
    username: 'Alex Doe',
    status: 'Active',
    ...overrides,
  };
}

const failedEvent = () =>
  makeEvent({
    id: 'event-1',
    name: 'Broken Range',
    status: 'Failed',
    errorMessage: 'Infrastructure deployment failed during plan.',
    lastLaunchInternalStatus: 'PlanningLaunch',
    workspaceId: 'ws-1',
    runId: 'run-1',
  });

function eventServiceStub(
  events: AlloyEvent[],
  errorDetail?: () => Observable<EventErrorDetail>,
) {
  return {
    getEvents: vi.fn(() => of(events)),
    getEventErrorDetail: vi.fn(
      errorDetail ??
        (() =>
          of<EventErrorDetail>({
            eventId: 'event-1',
            errorMessage: 'Infrastructure deployment failed during plan.',
            errorDetail: 'Error: invalid resource "foo"',
          })),
    ),
    createEvent: vi.fn((e: AlloyEvent) => of({ ...e, id: 'created' })),
    endEvent: vi.fn((id: string) => of(makeEvent({ id, status: 'Ending' }))),
    updateEvent: vi.fn((_id: string, e: AlloyEvent) => of(e)),
    deleteEvent: vi.fn(() => of({})),
  } satisfies ApiStub<EventService>;
}
type EventServiceStub = ReturnType<typeof eventServiceStub>;

async function renderAdminEventList(
  overrides: {
    events?: AlloyEvent[];
    grants?: PermissionGrants;
    settings?: Record<string, string>;
    errorDetail?: () => Observable<EventErrorDetail>;
    /** Runs on the EventService stub before render. */
    configureApi?: (api: EventServiceStub) => void;
  } = {},
) {
  const eventService = eventServiceStub(
    overrides.events ?? [],
    overrides.errorDetail,
  );
  overrides.configureApi?.(eventService);
  // The edit dialog is an edge here: the list only reacts to its editComplete
  // output, so the spec emits that output itself.
  const editComplete = new Subject<{ action: string; event: AlloyEvent }>();
  const { dialogRef, close } = dialogRefStub<EventEditComponent>();
  dialogRef.componentInstance = {
    editComplete,
  } as unknown as EventEditComponent;
  const dialog = { open: vi.fn(() => dialogRef) };

  const rendered = await renderComponent(AdminEventListComponent, {
    declarations: [AdminEventListComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatCheckboxModule,
      MatFormFieldModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSortModule,
      MatTableModule,
      MatTooltipModule,
      ClipboardModule,
      EventMembershipsStubComponent,
    ],
    providers: [
      { provide: EventService, useValue: eventService },
      { provide: MatDialog, useValue: dialog as unknown as MatDialog },
      ...permissionDataProviders(
        overrides.grants ?? { system: ['ViewEvents'] },
      ),
      {
        provide: ComnSettingsService,
        useValue: { settings: { ...overrides.settings } },
      },
    ],
  });

  return {
    ...rendered,
    eventService,
    dialog,
    editComplete,
    closeDialog: close,
    eventDataService: TestBed.inject(EventDataService),
    user: userEvent.setup(),
  };
}

// Role queries are scoped to the status checkboxes and the expanded detail cell.
const statusBox = (name: 'Active' | 'Ended' | 'Failed') =>
  within(document.querySelector('.status-selection') as HTMLElement).getByRole(
    'checkbox',
    { name },
  );
/** The expanded detail cell of the row whose failure summary is shown. */
const detailCell = () =>
  screen.getByText('Failure').closest('td') as HTMLElement;
const inDetail = (role: 'button' | 'link', name: RegExp) =>
  within(detailCell()).queryByRole(role, { name });

describe('AdminEventListComponent', () => {
  /**
   * Verifies: the list re-renders from the event store as events arrive and change status, and a Failed event moves out of the default (Active) view into the Failed one.
   * Interacts with: real EventDataService.stateCreate/stateUpdate (the SignalR entry points), EventStore/EventQuery, the Failed checkbox (user-event), rendered table.
   * Data: one Creating event, later updated to Failed.
   */
  it('follows event store updates and hides failed events by default', async () => {
    const { fixture, eventDataService, user } = await renderAdminEventList();

    eventDataService.stateCreate(makeEvent({ status: 'Creating' }));
    fixture.detectChanges();
    expect(screen.getByText('Cyber Range 101')).toBeInTheDocument();

    eventDataService.stateUpdate({ id: 'event-1', status: 'Failed' });
    fixture.detectChanges();
    expect(screen.queryByText('Cyber Range 101')).not.toBeInTheDocument();

    await user.click(statusBox('Failed'));
    expect(screen.getByText('Cyber Range 101')).toBeInTheDocument();
  });

  /**
   * Verifies: checking Failed shows failed events and checking Ended shows ended and expired ones.
   * Interacts with: the status checkboxes (user-event), filterAndSort, rendered table.
   * Data: one Active, one Failed, one Ended and one Expired event loaded by getAllEvents.
   */
  it('filters rows by the status checkboxes', async () => {
    const { user } = await renderAdminEventList({
      events: [
        makeEvent({ id: 'a', name: 'Running', status: 'Active' }),
        makeEvent({ id: 'f', name: 'Broken', status: 'Failed' }),
        makeEvent({ id: 'e', name: 'Finished', status: 'Ended' }),
        makeEvent({ id: 'x', name: 'Timed Out', status: 'Expired' }),
      ],
    });
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.queryByText('Broken')).not.toBeInTheDocument();

    await user.click(statusBox('Failed'));
    expect(await screen.findByText('Broken')).toBeInTheDocument();

    await user.click(statusBox('Ended'));
    expect(await screen.findByText('Finished')).toBeInTheDocument();
    expect(screen.getByText('Timed Out')).toBeInTheDocument();
  });

  /**
   * Verifies: typing in Search narrows the rows to matching events.
   * Interacts with: the search input (user-event keyup), applyFilter/MatTableDataSource filter.
   * Data: two active events, search 'alpha'.
   */
  it('narrows the rows with the search box', async () => {
    const { user } = await renderAdminEventList({
      events: [
        makeEvent({ id: 'a', name: 'Alpha Range' }),
        makeEvent({ id: 'b', name: 'Bravo Range' }),
      ],
    });

    await user.type(screen.getByPlaceholderText('Search'), 'alpha');

    await vi.waitFor(() =>
      expect(screen.queryByText('Bravo Range')).not.toBeInTheDocument(),
    );
    expect(screen.getByText('Alpha Range')).toBeInTheDocument();
  });

  /**
   * Verifies: the error detail is requested only when a failed row is expanded, shown with the failure summary and a Copy Details button, removed when the row collapses, and cached across the re-expand.
   * Interacts with: EventService.getEventErrorDetail spy, row click (user-event), rendered detail row.
   * Data: one Failed event with workspace and run ids; Failed checkbox enabled to show it.
   * Why: the detail can be kilobytes of Terraform output, so it is not on the Event model and must not be fetched until asked for.
   */
  it('loads the error detail on expand and caches it', async () => {
    const { user, eventService } = await renderAdminEventList({
      events: [failedEvent()],
    });
    await user.click(statusBox('Failed'));
    expect(eventService.getEventErrorDetail).not.toHaveBeenCalled();

    await user.click(await screen.findByText('Broken Range'));

    expect(
      await screen.findByText('Error: invalid resource "foo"'),
    ).toBeInTheDocument();
    expect(screen.getByText('Failed at: PlanningLaunch')).toBeInTheDocument();
    expect(screen.getByText('Workspace: ws-1')).toBeInTheDocument();
    expect(screen.getByText('Run: run-1')).toBeInTheDocument();
    expect(inDetail('button', /Copy Details/)).toBeInTheDocument();
    expect(eventService.getEventErrorDetail).toHaveBeenCalledWith('event-1');

    await user.click(screen.getByText('Broken Range'));
    expect(
      screen.queryByText('Error: invalid resource "foo"'),
    ).not.toBeInTheDocument();

    await user.click(screen.getByText('Broken Range'));
    expect(
      await screen.findByText('Error: invalid resource "foo"'),
    ).toBeInTheDocument();
    expect(eventService.getEventErrorDetail).toHaveBeenCalledTimes(1);
  });

  /**
   * Verifies: a 403 on the error detail leaves the row expanded with its summary, without a detail block or a stuck loading message.
   * Interacts with: EventService.getEventErrorDetail (403), rendered detail row.
   * Data: one Failed event; the detail endpoint refuses.
   * Why: the endpoint needs system ManageEvents, which an event-scoped manager lacks, so a 403 is a normal answer.
   */
  it('keeps the expanded row usable when the detail is forbidden', async () => {
    const { user } = await renderAdminEventList({
      events: [failedEvent()],
      errorDetail: () => throwError(() => ({ status: 403 })),
    });
    await user.click(statusBox('Failed'));

    await user.click(await screen.findByText('Broken Range'));

    expect(
      await screen.findByText('Infrastructure deployment failed during plan.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Loading details...')).not.toBeInTheDocument();
    expect(inDetail('button', /Copy Details/)).not.toBeInTheDocument();
    // The summary and its heading only render inside the expanded row.
    expect(screen.getByText('Failure')).toBeInTheDocument();
  });

  /**
   * Verifies: the Open Caster link is offered only when CasterUIAddress is configured.
   * Interacts with: ComnSettingsService.settings.CasterUIAddress, rendered detail row.
   * Data: one expanded Failed event, with and without the setting.
   */
  it.each([
    { settings: {}, expected: null },
    {
      settings: { CasterUIAddress: 'https://caster.example.com' },
      expected: 'https://caster.example.com',
    },
  ])(
    'offers Open Caster only when configured ($expected)',
    async ({ settings, expected }) => {
      const { user } = await renderAdminEventList({
        events: [failedEvent()],
        settings,
      });
      await user.click(statusBox('Failed'));

      await user.click(await screen.findByText('Broken Range'));
      await screen.findByText('Failed at: PlanningLaunch');

      const link = inDetail('link', /Open Caster/);
      expect(link?.getAttribute('href') ?? null).toBe(expected);
    },
  );

  describe('edit permission gate', () => {
    const editButtonFor = (name: string) =>
      within(screen.getByText(name).closest('tr') as HTMLElement).getByRole(
        'button',
        {
          name: 'Edit event',
        },
      );

    /**
     * Verifies: without EditEvents/ManageEvents or an EditEvent/ManageEvent claim on the event, the edit button is disabled.
     * Interacts with: real PermissionDataService (system and event-claim paths), canEdit/canManage, rendered button.
     * Data: one Active event; near misses: system ViewEvents and ExecuteEvents; a ViewEvent and ExecuteEvent claim on that event.
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'system ViewEvents and ExecuteEvents',
        grants: { system: ['ViewEvents', 'ExecuteEvents'] },
      },
      {
        label: 'a ViewEvent and ExecuteEvent claim on the event',
        grants: {
          system: ['ViewEvents'],
          events: [
            { eventId: 'event-1', permissions: ['ViewEvent', 'ExecuteEvent'] },
          ],
        },
      },
    ])('disables Edit with $label', async ({ grants }) => {
      await renderAdminEventList({ events: [makeEvent()], grants });
      expect(editButtonFor('Cyber Range 101')).toBeDisabled();
    });

    /**
     * Verifies: system EditEvents or ManageEvents enables the edit button on every event.
     * Interacts with: real PermissionDataService system gates, rendered buttons.
     * Data: two events; system EditEvents, then ManageEvents.
     */
    it.each<'EditEvents' | 'ManageEvents'>(['EditEvents', 'ManageEvents'])(
      'enables Edit on every event with %s',
      async (permission) => {
        await renderAdminEventList({
          events: [
            makeEvent({ id: 'a', name: 'One' }),
            makeEvent({ id: 'b', name: 'Two' }),
          ],
          grants: { system: ['ViewEvents', permission] },
        });
        expect(editButtonFor('One')).toBeEnabled();
        expect(editButtonFor('Two')).toBeEnabled();
      },
    );

    /**
     * Verifies: an event-scoped EditEvent or ManageEvent claim enables Edit on that event only.
     * Interacts with: real PermissionDataService event claims, rendered buttons.
     * Data: events a and b; a claim on a only.
     */
    it.each<'EditEvent' | 'ManageEvent'>(['EditEvent', 'ManageEvent'])(
      'enables Edit only on the event a %s claim covers',
      async (claim) => {
        await renderAdminEventList({
          events: [
            makeEvent({ id: 'a', name: 'Mine' }),
            makeEvent({ id: 'b', name: 'Theirs' }),
          ],
          grants: {
            system: ['ViewEvents'],
            events: [{ eventId: 'a', permissions: [claim] }],
          },
        });
        expect(editButtonFor('Mine')).toBeEnabled();
        expect(editButtonFor('Theirs')).toBeDisabled();
      },
    );
  });

  describe('failed requests', () => {
    type Rendered = Awaited<ReturnType<typeof renderAdminEventList>>;
    const openEditFor = async ({ user }: Rendered) =>
      user.click(
        within(
          screen.getByText('Cyber Range 101').closest('tr') as HTMLElement,
        ).getByRole('button', { name: 'Edit event' }),
      );

    /**
     * Verifies: each request the list subscribes to with no error callback lets a failure escape as an unhandled RxJS error, and the list is not refreshed (current behavior).
     * Interacts with: EventService.createEvent / endEvent / updateEvent / deleteEvent (error), the Edit button (user-event), the edit dialog's editComplete output (MatDialog stub), getEvents (refresh count), captureUnhandledRxErrors.
     * Data: one Active event; system ViewEvents and EditEvents; per row one failing request.
     */
    it.each<{
      method: string;
      fail: (api: EventServiceStub, failure: unknown) => void;
      act: (rendered: Rendered) => Promise<void>;
      failure: { status: number };
    }>([
      {
        method: 'addNewEvent()',
        fail: (api, failure) =>
          api.createEvent.mockReturnValue(throwError(() => failure)),
        // No template or caller invokes addNewEvent today.
        act: async ({ fixture }) => fixture.componentInstance.addNewEvent(),
        failure: { status: 400 },
      },
      {
        method: "editEvent() 'end'",
        fail: (api, failure) =>
          api.endEvent.mockReturnValue(throwError(() => failure)),
        act: async (rendered) => {
          await openEditFor(rendered);
          rendered.editComplete.next({ action: 'end', event: makeEvent() });
        },
        failure: { status: 403 },
      },
      {
        method: "editEvent() 'save'",
        fail: (api, failure) =>
          api.updateEvent.mockReturnValue(throwError(() => failure)),
        act: async (rendered) => {
          await openEditFor(rendered);
          rendered.editComplete.next({ action: 'save', event: makeEvent() });
        },
        failure: { status: 400 },
      },
      {
        method: "editEvent() 'delete'",
        fail: (api, failure) =>
          api.deleteEvent.mockReturnValue(throwError(() => failure)),
        act: async (rendered) => {
          await openEditFor(rendered);
          rendered.editComplete.next({ action: 'delete', event: makeEvent() });
        },
        failure: { status: 500 },
      },
    ])(
      '$method lets a failed request escape unhandled',
      async ({ fail, act, failure }) => {
        const unhandled = captureUnhandledRxErrors();
        const rendered = await renderAdminEventList({
          events: [makeEvent()],
          grants: { system: ['ViewEvents', 'EditEvents'] },
          configureApi: (api) => fail(api, failure),
        });
        const loads = rendered.eventService.getEvents.mock.calls.length;

        await act(rendered);
        await flush();

        expect(rendered.eventService.getEvents).toHaveBeenCalledTimes(loads);
        expect(unhandled).toEqual([failure]);
      },
    );
  });
});
