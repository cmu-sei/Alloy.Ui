// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, NEVER, of, throwError } from 'rxjs';
import {
  Event as AlloyEvent,
  EventService,
  EventTemplateService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { unstubbed } from 'src/app/test-utils/unstubbed';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { EventDataService } from './event-data.service';
import { EventQuery } from './event.query';
import { UserEventsQuery } from './user-events.query';

function makeEvent(overrides: Partial<AlloyEvent> = {}): AlloyEvent {
  return {
    id: 'event-1',
    name: 'Event 1',
    eventTemplateId: 'template-1',
    userId: 'user-1',
    status: 'Active',
    ...overrides,
  };
}

function eventServiceStub() {
  return {
    getEvents: vi.fn(() => of<AlloyEvent[]>([])),
    getEventTemplateEvents: vi.fn(() => of<AlloyEvent[]>([])),
    getMyEventTemplateEvents: vi.fn(() => of<AlloyEvent[]>([])),
    getMyEvents: vi.fn(() => of<AlloyEvent[]>([])),
    getMyViewEvents: vi.fn(() => of<AlloyEvent[]>([])),
    createEventFromEventTemplate: vi.fn(() => of(makeEvent())),
    endEvent: vi.fn(() => of(makeEvent({ status: 'Ending' }))),
    redeployEvent: vi.fn(() => of(makeEvent())),
    getEvent: vi.fn(() => of(makeEvent())),
    invite: vi.fn(() => of(makeEvent({ shareCode: 'abc' }))),
    enlist: vi.fn(() => of(makeEvent())),
  } satisfies ApiStub<EventService>;
}

function setup(grants: PermissionGrants = {}) {
  const eventService = eventServiceStub();
  TestBed.configureTestingModule({
    providers: [
      { provide: EventService, useValue: eventService },
      // EventDataService takes EventTemplateDataService as a constructor
      // dependency but never calls it; the real one only needs this to exist.
      unstubbed(EventTemplateService),
      ...permissionDataProviders(grants),
    ],
  });
  return {
    service: TestBed.inject(EventDataService),
    eventQuery: TestBed.inject(EventQuery),
    userEventsQuery: TestBed.inject(UserEventsQuery),
    eventService,
  };
}

describe('EventDataService', () => {
  describe('getAllEvents()', () => {
    /**
     * Verifies: with an event-list permission, getAllEvents fetches every event and upserts it into the event store.
     * Interacts with: EventService.getEvents (stubbed), real EventStore/EventQuery, real PermissionDataService.
     * Data: ViewEvents system permission; two events from the API.
     */
    it('loads all events into the store for a user who can view the event list', async () => {
      const { service, eventQuery, eventService } = setup({
        system: ['ViewEvents'],
      });
      eventService.getEvents.mockReturnValueOnce(
        of([
          makeEvent({ id: 'a', name: 'A' }),
          makeEvent({ id: 'b', name: 'B' }),
        ]),
      );

      await firstValueFrom(service.getAllEvents());

      expect(eventService.getEvents).toHaveBeenCalledTimes(1);
      expect(eventQuery.getAll().map((e) => e.id)).toEqual(['a', 'b']);
    });

    /**
     * Verifies: getAllEvents still calls the admin-wide getEvents endpoint for a user with no event permissions (current behavior).
     * Interacts with: EventService.getEvents (stubbed), real PermissionDataService.
     * Data: near miss: ViewEventTemplates and ViewUsers (Administration access without any *Events permission).
     * Why: of(this.permissionDataService.canViewEventList) passes the method itself, which is always truthy, so the "isAdmin ? getEvents() : of([])" switch can never take the of([]) branch.
     */
    it('calls getEvents even without an event-list permission', async () => {
      const { service, eventService } = setup({
        system: ['ViewEventTemplates', 'ViewUsers'],
      });

      await firstValueFrom(service.getAllEvents());

      expect(eventService.getEvents).toHaveBeenCalledTimes(1);
    });

    /**
     * Verifies: events already in the store are merged with the fetched copy, not replaced wholesale.
     * Interacts with: EventDataService.stateCreate, getAllEvents, real EventStore (upsertMany).
     * Data: a stored event with a description; the API copy carries a new status and no description.
     */
    it('merges fetched events into existing store entries', async () => {
      const { service, eventQuery, eventService } = setup({
        system: ['ViewEvents'],
      });
      service.stateCreate(
        makeEvent({ id: 'a', status: 'Creating', description: 'kept' }),
      );
      eventService.getEvents.mockReturnValueOnce(
        of([{ id: 'a', status: 'Active' } as AlloyEvent]),
      );

      await firstValueFrom(service.getAllEvents());

      expect(eventQuery.getEntity('a')).toMatchObject({
        status: 'Active',
        description: 'kept',
      });
    });

    /**
     * Verifies: a null API body leaves the store untouched instead of throwing.
     * Interacts with: EventService.getEvents (stubbed to emit null), real EventStore.
     * Data: one stored event; getEvents emits null.
     */
    it('ignores a null response', async () => {
      const { service, eventQuery, eventService } = setup({
        system: ['ViewEvents'],
      });
      service.stateCreate(makeEvent({ id: 'a' }));
      eventService.getEvents.mockReturnValueOnce(of(null));

      expect(await firstValueFrom(service.getAllEvents())).toBeNull();
      expect(eventQuery.getAll().map((e) => e.id)).toEqual(['a']);
    });

    /**
     * Verifies: an API error propagates to the caller and leaves the store as it was.
     * Interacts with: EventService.getEvents (stubbed to error), real EventStore.
     * Data: one stored event; getEvents throws a 500.
     */
    it('surfaces API errors and leaves the store unchanged', async () => {
      const { service, eventQuery, eventService } = setup({
        system: ['ViewEvents'],
      });
      service.stateCreate(makeEvent({ id: 'a' }));
      eventService.getEvents.mockReturnValueOnce(
        throwError(() => ({ status: 500 })),
      );

      await expect(firstValueFrom(service.getAllEvents())).rejects.toEqual({
        status: 500,
      });
      expect(eventQuery.getAll().map((e) => e.id)).toEqual(['a']);
    });
  });

  describe('getTemplateEvents()', () => {
    /**
     * Verifies: a system ManageEventTemplates permission routes to the all-events-of-template endpoint.
     * Interacts with: EventService.getEventTemplateEvents / getMyEventTemplateEvents, real PermissionDataService.
     * Data: ManageEventTemplates system permission; template-1.
     */
    it('uses the admin endpoint for a system template manager', async () => {
      const { service, eventService } = setup({
        system: ['ManageEventTemplates'],
      });

      await firstValueFrom(service.getTemplateEvents('template-1'));

      expect(eventService.getEventTemplateEvents).toHaveBeenCalledWith(
        'template-1',
      );
      expect(eventService.getMyEventTemplateEvents).not.toHaveBeenCalled();
    });

    /**
     * Verifies: a ManageEventTemplate claim on this template also routes to the admin endpoint.
     * Interacts with: EventService.getEventTemplateEvents, real PermissionDataService (event-template claims).
     * Data: no system permissions; ManageEventTemplate claim on template-1.
     */
    it('uses the admin endpoint for a manager of this template', async () => {
      const { service, eventService } = setup({
        eventTemplates: [
          {
            eventTemplateId: 'template-1',
            permissions: ['ManageEventTemplate'],
          },
        ],
      });

      await firstValueFrom(service.getTemplateEvents('template-1'));

      expect(eventService.getEventTemplateEvents).toHaveBeenCalledWith(
        'template-1',
      );
    });

    /**
     * Verifies: a manage claim on a different template does not grant the admin endpoint for this one.
     * Interacts with: EventService.getMyEventTemplateEvents, real PermissionDataService.
     * Data: ManageEventTemplate claim on template-2; request for template-1.
     */
    it("uses the user's own endpoint when the claim is for another template", async () => {
      const { service, eventService } = setup({
        eventTemplates: [
          {
            eventTemplateId: 'template-2',
            permissions: ['ManageEventTemplate'],
          },
        ],
      });

      await firstValueFrom(service.getTemplateEvents('template-1'));

      expect(eventService.getMyEventTemplateEvents).toHaveBeenCalledWith(
        'template-1',
      );
      expect(eventService.getEventTemplateEvents).not.toHaveBeenCalled();
    });

    /**
     * Verifies: the user's own template events are upserted into the event store and visible through the template selector.
     * Interacts with: EventService.getMyEventTemplateEvents, real EventStore/EventQuery.
     * Data: no permissions; one event returned for template-1.
     */
    it("stores the user's template events", async () => {
      const { service, eventQuery, eventService } = setup();
      eventService.getMyEventTemplateEvents.mockReturnValueOnce(
        of([makeEvent({ id: 'mine', eventTemplateId: 'template-1' })]),
      );

      const events = await firstValueFrom(
        service.getTemplateEvents('template-1'),
      );

      expect(events.map((e) => e.id)).toEqual(['mine']);
      expect(
        (
          await firstValueFrom(eventQuery.selectByEventTemplateId('template-1'))
        ).map((e) => e.id),
      ).toEqual(['mine']);
    });

    /**
     * Verifies: a null body is coerced to an empty array rather than emitted as null.
     * Interacts with: EventService.getMyEventTemplateEvents (null), Akita coerceArray.
     * Data: no permissions; the API emits null.
     */
    it('coerces a null response to an empty list', async () => {
      const { service, eventService } = setup();
      eventService.getMyEventTemplateEvents.mockReturnValueOnce(of(null));

      expect(
        await firstValueFrom(service.getTemplateEvents('template-1')),
      ).toEqual([]);
    });
  });

  describe('getUserEvents()', () => {
    /**
     * Verifies: the user's events go into the UserEvents store and not into the main event store.
     * Interacts with: EventService.getMyEvents, real UserEventsStore/UserEventsQuery and EventStore/EventQuery.
     * Data: one event returned by getMyEvents.
     */
    it('stores my events in the user-events store only', async () => {
      const { service, eventQuery, userEventsQuery, eventService } = setup();
      eventService.getMyEvents.mockReturnValueOnce(
        of([makeEvent({ id: 'mine' })]),
      );

      await firstValueFrom(service.getUserEvents());

      expect(userEventsQuery.getAll().map((e) => e.id)).toEqual(['mine']);
      expect(eventQuery.getAll()).toEqual([]);
    });
  });

  describe('loadEvents()', () => {
    /**
     * Verifies: loadEvents combines the all-events, template-events and my-events requests into one emission.
     * Interacts with: EventService.getEvents / getMyEventTemplateEvents / getMyEvents.
     * Data: ViewEvents permission; one event from each endpoint.
     */
    it('emits the three event lists together', async () => {
      const { service, eventService } = setup({ system: ['ViewEvents'] });
      eventService.getEvents.mockReturnValueOnce(
        of([makeEvent({ id: 'all' })]),
      );
      eventService.getMyEventTemplateEvents.mockReturnValueOnce(
        of([makeEvent({ id: 'template' })]),
      );
      eventService.getMyEvents.mockReturnValueOnce(
        of([makeEvent({ id: 'mine' })]),
      );

      const [all, template, mine] = await firstValueFrom(
        service.loadEvents('template-1'),
      );

      expect(
        [all, template, mine].map((list) => list.map((e) => e.id)),
      ).toEqual([['all'], ['template'], ['mine']]);
    });
  });

  describe('launchEvent()', () => {
    /**
     * Verifies: launching an event from a template stores the created event so the query reports it.
     * Interacts with: EventService.createEventFromEventTemplate, real EventStore/EventQuery, recordEmissions.
     * Data: template-1; the API returns event 'new' in Creating status.
     */
    it('upserts the created event into the store', async () => {
      const { service, eventQuery, eventService } = setup();
      eventService.createEventFromEventTemplate.mockReturnValueOnce(
        of(makeEvent({ id: 'new', status: 'Creating' })),
      );
      const seen = recordEmissions(eventQuery.selectById('new'));

      const created = await firstValueFrom(service.launchEvent('template-1'));

      expect(eventService.createEventFromEventTemplate).toHaveBeenCalledWith(
        'template-1',
      );
      expect(created.id).toBe('new');
      expect(seen.map((e) => e?.status)).toEqual([undefined, 'Creating']);
    });

    /**
     * Verifies: a failed launch request leaves the store empty and errors to the caller.
     * Interacts with: EventService.createEventFromEventTemplate (error), real EventStore.
     * Data: the API answers 400.
     */
    it('does not store anything when the launch is rejected', async () => {
      const { service, eventQuery, eventService } = setup();
      eventService.createEventFromEventTemplate.mockReturnValueOnce(
        throwError(() => ({ status: 400 })),
      );

      await expect(
        firstValueFrom(service.launchEvent('template-1')),
      ).rejects.toEqual({ status: 400 });
      expect(eventQuery.getAll()).toEqual([]);
    });
  });

  describe('endEvent() and redeployEvent()', () => {
    /**
     * Verifies: endEvent fires the end request itself and leaves the store for SignalR to update.
     * Interacts with: EventService.endEvent, real EventStore.
     * Data: one Active event in the store.
     */
    it('endEvent requests the end without touching the store', () => {
      const { service, eventQuery, eventService } = setup();
      service.stateCreate(makeEvent({ id: 'a', status: 'Active' }));

      service.endEvent('a');

      expect(eventService.endEvent).toHaveBeenCalledWith('a');
      expect(eventQuery.getEntity('a').status).toBe('Active');
    });

    /**
     * Verifies: redeployEvent fires the redeploy request.
     * Interacts with: EventService.redeployEvent.
     * Data: event id 'a'; the request never completes.
     * Why: NEVER keeps the subscription inert, so the test only asserts that the request was made.
     */
    it('redeployEvent requests the redeploy', () => {
      const { service, eventService } = setup();
      eventService.redeployEvent.mockReturnValueOnce(NEVER);

      service.redeployEvent('a');

      expect(eventService.redeployEvent).toHaveBeenCalledWith('a');
    });

    /**
     * Verifies: a failed end or redeploy request leaves the event as it was and its error escapes as an unhandled RxJS error (current behavior).
     * Interacts with: EventService.endEvent / redeployEvent (error), real EventStore/EventQuery, captureUnhandledRxErrors.
     * Data: one Active event 'a'; one failing endpoint per row.
     */
    it.each<{
      method: 'endEvent' | 'redeployEvent';
      failure: { status: number };
    }>([
      { method: 'endEvent', failure: { status: 403 } },
      { method: 'redeployEvent', failure: { status: 500 } },
    ])(
      '$method lets a failed request escape unhandled',
      async ({ method, failure }) => {
        const unhandled = captureUnhandledRxErrors();
        const { service, eventQuery, eventService } = setup();
        service.stateCreate(makeEvent({ id: 'a', status: 'Active' }));
        eventService[method].mockReturnValueOnce(throwError(() => failure));

        service[method]('a');
        await flush();

        expect(eventQuery.getEntity('a').status).toBe('Active');
        expect(unhandled).toEqual([failure]);
      },
    );
  });

  describe('state handlers', () => {
    /**
     * Verifies: stateCreate adds a new event and stateDelete removes it, as the SignalR handlers rely on.
     * Interacts with: EventDataService.stateCreate/stateDelete, real EventQuery, recordEmissions.
     * Data: one event created then deleted.
     */
    it('stateCreate adds and stateDelete removes an event', () => {
      const { service, eventQuery } = setup();
      const seen = recordEmissions(eventQuery.selectAll());

      service.stateCreate(makeEvent({ id: 'a' }));
      service.stateDelete(makeEvent({ id: 'a' }));

      expect(seen.map((list) => list.map((e) => e.id))).toEqual([
        [],
        ['a'],
        [],
      ]);
    });

    /**
     * Verifies: stateCreate on an id already in the store merges the new fields (upsert).
     * Interacts with: EventDataService.stateCreate, real EventQuery.
     * Data: an Active event, then a second create for the same id with status Ended.
     */
    it('stateCreate updates an event that already exists', () => {
      const { service, eventQuery } = setup();
      service.stateCreate(
        makeEvent({ id: 'a', status: 'Active', name: 'kept' }),
      );

      service.stateCreate({ id: 'a', status: 'Ended' });

      expect(eventQuery.getEntity('a')).toMatchObject({
        status: 'Ended',
        name: 'kept',
      });
    });

    /**
     * Verifies: stateUpdate merges into an existing event.
     * Interacts with: EventDataService.stateUpdate, real EventQuery.
     * Data: a Planning event updated to Applying.
     */
    it('stateUpdate merges into an existing event', () => {
      const { service, eventQuery } = setup();
      service.stateCreate(makeEvent({ id: 'a', status: 'Planning' }));

      service.stateUpdate({ id: 'a', status: 'Applying' });

      expect(eventQuery.getEntity('a').status).toBe('Applying');
    });

    /**
     * Verifies: stateUpdate for an event the store does not hold is dropped rather than added.
     * Interacts with: EventDataService.stateUpdate (Akita EntityStore.update skips unknown ids).
     * Data: an empty store and an update for 'unknown'.
     * Why: an EventUpdated message only adds an event if an EventCreated, a load, or a launch put it in the store first.
     */
    it('stateUpdate ignores an event the store does not hold', () => {
      const { service, eventQuery } = setup();

      service.stateUpdate(makeEvent({ id: 'unknown' }));

      expect(eventQuery.hasEntity('unknown')).toBe(false);
    });
  });

  describe('getViewEvents()', () => {
    /**
     * Verifies: the user's events for a Player view are upserted into the event store.
     * Interacts with: EventService.getMyViewEvents, real EventQuery.selectByViewId.
     * Data: view-1 with one event.
     */
    it('stores the events for a view', async () => {
      const { service, eventQuery, eventService } = setup();
      eventService.getMyViewEvents.mockReturnValueOnce(
        of([makeEvent({ id: 'v', viewId: 'view-1' })]),
      );

      await firstValueFrom(service.getViewEvents('view-1'));

      expect(eventService.getMyViewEvents).toHaveBeenCalledWith('view-1');
      expect(
        (await firstValueFrom(eventQuery.selectByViewId('view-1'))).map(
          (e) => e.id,
        ),
      ).toEqual(['v']);
    });
  });

  describe('pass-through requests', () => {
    /**
     * Verifies: getEvent, inviteEvent and enlistEvent forward their argument to the API without writing to the store.
     * Interacts with: EventService.getEvent / invite / enlist, real EventQuery.
     * Data: event id 'a' and share code 'code-1'.
     */
    it('forward the argument and leave the store alone', async () => {
      const { service, eventQuery, eventService } = setup();

      await firstValueFrom(service.getEvent('a'));
      await firstValueFrom(service.inviteEvent('a'));
      await firstValueFrom(service.enlistEvent('code-1'));

      expect(eventService.getEvent).toHaveBeenCalledWith('a');
      expect(eventService.invite).toHaveBeenCalledWith('a');
      expect(eventService.enlist).toHaveBeenCalledWith('code-1');
      expect(eventQuery.getAll()).toEqual([]);
    });
  });
});
