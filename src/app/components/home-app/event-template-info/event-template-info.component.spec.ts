// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Component, input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { formatDate } from '@angular/common';
import { ActivatedRoute, Params } from '@angular/router';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { defer, of, Subject, throwError } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from 'ngx-clipboard';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import {
  Event as AlloyEvent,
  EventService,
  EventTemplate,
  EventTemplateService,
} from 'src/app/generated/alloy.api';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { ApiStub } from 'src/app/test-utils/api-stub';
import {
  failingPermissionProviders,
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { AnyProvider } from 'src/app/test-utils/unstubbed';
import { TopbarView } from '../../shared/top-bar/topbar.models';
import { EventTemplateInfoComponent } from './event-template-info.component';
import { TopbarComponent } from 'src/app/components/shared/top-bar/topbar.component';

const TEMPLATE_ID = 'template-1';
const USER_ID = 'user-1';

/** The part of jsdom's VirtualConsole the /view route tests listen on. */
interface JsdomVirtualConsole {
  on(event: 'jsdomError', listener: (error: Error) => void): void;
  off(event: 'jsdomError', listener: (error: Error) => void): void;
}

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  readonly title = input<string>(undefined);
  readonly topbarView = input<TopbarView>(undefined);
}

function template(): EventTemplate {
  return {
    id: TEMPLATE_ID,
    name: 'Cyber Range 101',
    description: 'Learn the range',
    durationHours: 4,
  };
}

function myEvent(overrides: Partial<AlloyEvent> = {}): AlloyEvent {
  return {
    id: 'event-1',
    userId: USER_ID,
    eventTemplateId: TEMPLATE_ID,
    status: 'Active',
    ...overrides,
  };
}

function eventServiceStub(
  events: AlloyEvent[] = [],
  myEvents: AlloyEvent[] = [],
  viewEvents: AlloyEvent[] = [],
) {
  return {
    getEvents: vi.fn(() => of<AlloyEvent[]>([])),
    getMyEventTemplateEvents: vi.fn(() => of(events)),
    getEventTemplateEvents: vi.fn(() => of(events)),
    getMyEvents: vi.fn(() => of(myEvents)),
    getMyViewEvents: vi.fn(() => of(viewEvents)),
    createEventFromEventTemplate: vi.fn(() =>
      of(myEvent({ id: 'new', status: 'Creating' })),
    ),
    getEvent: vi.fn((id: string) => of(myEvent({ id, status: 'Planning' }))),
    invite: vi.fn((id: string) => of(myEvent({ id, shareCode: 'abc' }))),
    recoverEvent: vi.fn(() => of(null)),
  } satisfies ApiStub<EventService>;
}
type EventServiceStub = ReturnType<typeof eventServiceStub>;

interface RenderOverrides {
  events?: AlloyEvent[];
  myEvents?: AlloyEvent[];
  viewEvents?: AlloyEvent[];
  routeParams?: Params;
  grants?: PermissionGrants;
  joinEvent?: (eventId: string) => Promise<void>;
  /** Runs on the EventService stub before render (ngOnInit loads at once). */
  configureApi?: (api: EventServiceStub) => void;
  providers?: AnyProvider[];
}

async function renderEventTemplateInfo(overrides: RenderOverrides = {}) {
  const eventService = eventServiceStub(
    overrides.events,
    overrides.myEvents,
    overrides.viewEvents,
  );
  overrides.configureApi?.(eventService);
  const eventTemplateService = {
    getEventTemplate: vi.fn(() => of(template())),
  } satisfies ApiStub<EventTemplateService>;
  // Records the calls only; the stub returns whatever `overrides.joinEvent`
  // returns, so a test controls the exact promise the component receives.
  const joinEvent = vi.fn<SignalRService['joinEvent']>(() => Promise.resolve());
  const joinImpl = overrides.joinEvent ?? (() => Promise.resolve());
  const signalR: Pick<SignalRService, 'joinEvent'> = {
    joinEvent: (eventId) => {
      joinEvent(eventId);
      return joinImpl(eventId);
    },
  };
  const auth: Pick<ComnAuthService, 'user$'> = {
    user$: of({
      profile: { name: 'Alex Doe', sub: USER_ID },
    }) as unknown as ComnAuthService['user$'],
  };

  const rendered = await renderComponent(EventTemplateInfoComponent, {
    childStubs: [{ replace: TopbarComponent, with: TopbarStubComponent }],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatDividerModule,
      MatExpansionModule,
      MatIconModule,
      MatMenuModule,
      MatProgressSpinnerModule,
      MatSlideToggleModule,
      MatSortModule,
      MatTableModule,
      MatTooltipModule,
      ClipboardModule,
      TopbarStubComponent,
    ],
    providers: [
      // The data services and Akita stores are real; only the generated API
      // clients and the hub are stubbed.
      { provide: EventService, useValue: eventService },
      { provide: EventTemplateService, useValue: eventTemplateService },
      { provide: ComnAuthService, useValue: auth },
      { provide: SignalRService, useValue: signalR },
      {
        provide: ActivatedRoute,
        useValue: activatedRouteStub(
          {},
          overrides.routeParams ?? { id: TEMPLATE_ID },
        ).route,
      },
      {
        provide: ComnSettingsService,
        useValue: {
          settings: { AppTopBarText: 'Alloy', PollingIntervalMS: '3500' },
        },
      },
      ...permissionDataProviders(overrides.grants ?? {}),
      ...(overrides.providers ?? []),
    ],
  });

  return {
    ...rendered,
    eventService,
    joinEvent,
    eventDataService: TestBed.inject(EventDataService),
    user: userEvent.setup(),
  };
}

// Role queries are scoped to the region under test.
const region = (selector: string) =>
  document.querySelector(selector) as HTMLElement;
const card = () => within(region('.event-info-container'));
const topRow = () => within(region('.top-row'));
const menuItem = (name: string) =>
  within(region('.cdk-overlay-container')).getByRole('menuitem', { name });

describe('EventTemplateInfoComponent', () => {
  /**
   * Verifies: the template's name, description and duration render, with Launch offered when the user has no event.
   * Interacts with: EventTemplateService.getEventTemplate → real EventTemplateStore/Query, rendered card.
   * Data: template-1 with no events.
   */
  it('shows the template and a Launch button when there is no current event', async () => {
    await renderEventTemplateInfo();

    expect(
      card().getByRole('heading', { name: 'Cyber Range 101' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Learn the range')).toBeInTheDocument();
    expect(screen.getByText('Duration: 4 hours')).toBeInTheDocument();
    expect(card().getByRole('button', { name: 'Launch' })).toBeInTheDocument();
  });

  describe('current event', () => {
    /**
     * Verifies: a Failed event is reported as the current event, the failure card replaces Launch, and the event's group is joined.
     * Interacts with: EventService.getMyEventTemplateEvents → real EventStore/Query, SignalRService.joinEvent spy, rendered card.
     * Data: one Failed event for this user and template.
     * Why: a failed event used to be filtered out, so the FAILED branch was unreachable and Launch silently came back.
     */
    it('reports a failed launch to the user', async () => {
      const { joinEvent } = await renderEventTemplateInfo({
        events: [
          myEvent({
            status: 'Failed',
            errorMessage: 'Infrastructure deployment failed during plan.',
          }),
        ],
      });

      expect(card().getByRole('alert')).toHaveTextContent(
        'This event failed to launch.',
      );
      expect(
        card().getByRole('button', { name: 'Launch Again' }),
      ).toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: 'Launch' }),
      ).not.toBeInTheDocument();
      // Without the group join the follow-up EventUpdated never arrives.
      expect(joinEvent).toHaveBeenCalledWith('event-1');
    });

    /**
     * Verifies: an in-progress event wins over an earlier failure, showing the wait card.
     * Interacts with: real EventQuery.selectAll, resolveCurrentEvent, rendered card.
     * Data: a Failed event and a Planning event for this user and template.
     */
    it('prefers an in-progress event over a previous failure', async () => {
      await renderEventTemplateInfo({
        events: [
          myEvent({ id: 'event-1', status: 'Failed' }),
          myEvent({ id: 'event-2', status: 'Planning' }),
        ],
      });

      expect(
        card().getByRole('heading', { name: 'Please wait!' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Status: Planning')).toBeInTheDocument();
      expect(card().queryByRole('alert')).not.toBeInTheDocument();
    });

    /**
     * Verifies: a failure older than a later attempt that has since ended is no longer reported, so Launch returns.
     * Interacts with: resolveCurrentEvent (ordered by dateCreated), rendered card.
     * Data: Failed at 10:00, Ended at 11:00.
     * Why: Failed is terminal and stays in the store; if it kept winning it would pin the page to the failure card for good.
     */
    it('stops reporting a failure once a newer attempt has come and gone', async () => {
      await renderEventTemplateInfo({
        events: [
          myEvent({
            id: 'event-1',
            status: 'Failed',
            dateCreated: new Date('2026-09-01T10:00:00Z'),
          }),
          myEvent({
            id: 'event-2',
            status: 'Ended',
            dateCreated: new Date('2026-09-01T11:00:00Z'),
          }),
        ],
      });

      expect(card().queryByRole('alert')).not.toBeInTheDocument();
      expect(
        card().getByRole('button', { name: 'Launch' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: with several failures, the newest one is reported, and the failure card's copy button describes that event.
     * Interacts with: resolveCurrentEvent, failure card, MatTooltip (aria-describedby on the copy button).
     * Data: Failed at 10:00 and Failed at 12:00, stored oldest first.
     */
    it('reports the newest failure when there are several', async () => {
      await renderEventTemplateInfo({
        events: [
          myEvent({
            id: 'event-1',
            status: 'Failed',
            dateCreated: new Date('2026-09-01T10:00:00Z'),
          }),
          myEvent({
            id: 'event-2',
            status: 'Failed',
            dateCreated: new Date('2026-09-01T12:00:00Z'),
          }),
        ],
      });

      // MatTooltip registers its message as the button's description after a
      // microtask, so let it run before reading the card.
      await flush();
      const copy = within(card().getByRole('alert')).getByRole('button', {
        name: 'Copy failure details',
      });
      expect(copy).toHaveAccessibleDescription(/^Event event-2 launched/);
    });

    /**
     * Verifies: events of another user, or of another template, never become the current event.
     * Interacts with: currentEvent$ filtering by userId and route template id.
     * Data: a Failed event for someone else on this template, and one for this user on another template.
     */
    it('ignores events belonging to another user or template', async () => {
      await renderEventTemplateInfo({
        events: [
          myEvent({ id: 'event-1', userId: 'someone-else', status: 'Failed' }),
          myEvent({
            id: 'event-2',
            eventTemplateId: 'another-template',
            status: 'Failed',
          }),
        ],
      });

      expect(card().queryByRole('alert')).not.toBeInTheDocument();
      expect(
        card().getByRole('button', { name: 'Launch' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: a status pushed through the store (as SignalR does) moves the card from waiting to launched.
     * Interacts with: real EventDataService.stateUpdate, EventStore/Query, rendered card.
     * Data: a Planning event updated to Active.
     */
    it('follows status updates from the event store', async () => {
      const { fixture, eventDataService } = await renderEventTemplateInfo({
        events: [myEvent({ status: 'Planning' })],
      });
      expect(
        card().getByRole('heading', { name: 'Please wait!' }),
      ).toBeInTheDocument();

      eventDataService.stateUpdate({ id: 'event-1', status: 'Active' });
      fixture.detectChanges();

      expect(
        card().getByRole('button', { name: 'Open Event' }),
      ).toBeInTheDocument();
      expect(
        card().getByRole('button', { name: 'End Event' }),
      ).toBeInTheDocument();
    });
  });

  describe('an ended event inside its grace period', () => {
    const RECOVERABLE_UNTIL = '2026-11-06T18:30:00Z';
    const suspended = (overrides: Partial<AlloyEvent> = {}) =>
      myEvent({
        status: 'Suspended',
        recoverableUntil: new Date(RECOVERABLE_UNTIL),
        ...overrides,
      });

    /**
     * Verifies: the owner of a Suspended event sees the ended card with the time it stays recoverable and a Recover Event button, instead of Launch or the running event's controls.
     * Interacts with: EventService.getMyEventTemplateEvents → real EventStore/Query, resolveCurrentEvent, determineEventStatus, rendered card.
     * Data: one Suspended event of this user and template, recoverable until 2026-11-06T18:30:00Z, no error message.
     * Why: a Suspended event is not active, so without its own card the page would fall back to Launch and the owner could not recover it.
     */
    it('offers the owner of a Suspended event to recover it', async () => {
      await renderEventTemplateInfo({ events: [suspended()] });

      expect(
        card().getByRole('heading', { name: 'This event has ended' }),
      ).toBeInTheDocument();
      expect(
        card().getByText(
          // Testing Library collapses whitespace, including the narrow no-break
          // space the 'medium' format puts before AM/PM.
          'It can be recovered until ' +
            formatDate(RECOVERABLE_UNTIL, 'medium', 'en-US').replace(/\s+/g, ' '),
          { exact: false },
        ),
      ).toBeInTheDocument();
      expect(
        card().getByRole('button', { name: 'Recover Event' }),
      ).toBeEnabled();
      expect(card().queryByRole('alert')).not.toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: 'Launch' }),
      ).not.toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: 'Open Event' }),
      ).not.toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: 'End Event' }),
      ).not.toBeInTheDocument();
    });

    /**
     * Verifies: a Suspended event whose Player view could not be hidden shows the API's message on the ended card.
     * Interacts with: currentEvent.errorMessage, rendered card.
     * Data: one Suspended event of this user with the API's view-hiding error message.
     */
    it('shows the error message of a Suspended event', async () => {
      const message =
        'The event was ended, but its Player view could not be hidden.';
      await renderEventTemplateInfo({
        events: [suspended({ errorMessage: message })],
      });

      expect(card().getByRole('alert')).toHaveTextContent(message);
      expect(
        card().getByRole('button', { name: 'Recover Event' }),
      ).toBeInTheDocument();
    });

    /**
     * Verifies: an active event wins over a Suspended one, and a Suspended one wins over a newer failure.
     * Interacts with: resolveCurrentEvent, rendered card.
     * Data: per row, a Suspended event with an Active one, or with a Failed one created an hour later.
     * Why: a user who launched again cares about the new event; a failure must not hide the only way to get the ended one back.
     */
    it.each<{
      label: string;
      other: AlloyEvent;
      shown: 'Open Event' | 'Recover Event';
      hidden: 'Open Event' | 'Recover Event';
    }>([
      {
        label: 'an Active event over it',
        other: myEvent({ id: 'event-2', status: 'Active' }),
        shown: 'Open Event',
        hidden: 'Recover Event',
      },
      {
        label: 'it over a newer failure',
        other: myEvent({
          id: 'event-2',
          status: 'Failed',
          dateCreated: new Date('2026-11-06T12:00:00Z'),
        }),
        shown: 'Recover Event',
        hidden: 'Open Event',
      },
    ])('prefers $label', async ({ other, shown, hidden }) => {
      // The Suspended event is stored first, so taking the first candidate would pick it.
      await renderEventTemplateInfo({
        events: [
          suspended({ dateCreated: new Date('2026-11-06T11:00:00Z') }),
          other,
        ],
      });

      expect(card().getByRole('button', { name: shown })).toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: hidden }),
      ).not.toBeInTheDocument();
      expect(card().queryByRole('alert')).not.toBeInTheDocument();
    });

    /**
     * Verifies: Recover Event sends the recover request for the event, and the button reads Recovering... and is disabled until the request completes, then is enabled again.
     * Interacts with: Recover Event button (user-event), real EventDataService.recoverEvent → EventService.recoverEvent (a Subject the test settles), rendered button.
     * Data: one Suspended event of this user; the request answers 204 (null) and completes.
     * Why: the button must not send a second request while the first runs; the status then comes back through SignalR.
     */
    it('shows Recovering... while the request runs and re-enables the button when it succeeds', async () => {
      const response = new Subject<null>();
      const { user, eventService, fixture } = await renderEventTemplateInfo({
        events: [suspended()],
        configureApi: (api) => api.recoverEvent.mockReturnValue(response),
      });

      await user.click(card().getByRole('button', { name: 'Recover Event' }));

      expect(eventService.recoverEvent).toHaveBeenCalledExactlyOnceWith(
        'event-1',
      );
      expect(
        card().getByRole('button', { name: 'Recovering...' }),
      ).toBeDisabled();

      response.next(null);
      response.complete();
      fixture.detectChanges();

      expect(
        card().getByRole('button', { name: 'Recover Event' }),
      ).toBeEnabled();
    });

    /**
     * Verifies: a refused recovery re-enables Recover Event, and its error escapes as an unhandled RxJS error for the app's ErrorHandler to report.
     * Interacts with: Recover Event button (user-event), real EventDataService.recoverEvent → EventService.recoverEvent (a Subject the test fails), captureUnhandledRxErrors, rendered button.
     * Data: one Suspended event of this user; the request fails with 409 (the grace period is over).
     * Why: a stuck Recovering... button would leave the owner no way to retry; the global ErrorService shows the API's reason.
     */
    it('re-enables Recover Event when the request fails', async () => {
      const unhandled = captureUnhandledRxErrors();
      const response = new Subject<null>();
      const failure = { status: 409 };
      const { user, fixture } = await renderEventTemplateInfo({
        events: [suspended()],
        configureApi: (api) => api.recoverEvent.mockReturnValue(response),
      });

      await user.click(card().getByRole('button', { name: 'Recover Event' }));
      expect(
        card().getByRole('button', { name: 'Recovering...' }),
      ).toBeDisabled();

      response.error(failure);
      await flush();
      fixture.detectChanges();

      expect(
        card().getByRole('button', { name: 'Recover Event' }),
      ).toBeEnabled();
      expect(unhandled).toEqual([failure]);
    });

    /**
     * Verifies: a Recovering event shows the wait card with its status, without Launch or Recover.
     * Interacts with: determineEventStatus, rendered card; real EventDataService.stateUpdate (the SignalR entry point).
     * Data: one Suspended event of this user, updated to Recovering through the store.
     */
    it('shows a Recovering event as in progress', async () => {
      const { fixture, eventDataService } = await renderEventTemplateInfo({
        events: [suspended()],
      });

      eventDataService.stateUpdate({ id: 'event-1', status: 'Recovering' });
      fixture.detectChanges();

      expect(
        card().getByRole('heading', { name: 'Please wait!' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Status: Recovering')).toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: 'Recover Event' }),
      ).not.toBeInTheDocument();
      expect(
        card().queryByRole('button', { name: 'Launch' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('launchEvent()', () => {
    /**
     * Verifies: Launch creates the event, joins its group, then reads it back once and stores the result.
     * Interacts with: EventService.createEventFromEventTemplate/getEvent, SignalRService.joinEvent, real EventStore, rendered card.
     * Data: no events; the read-back returns the new event already Failed.
     * Why: the API only broadcasts to the event's group, so a failure between the launch response and the join is only seen through the read-back.
     */
    it('joins the new event, then reads it back', async () => {
      const { user, eventService, joinEvent } = await renderEventTemplateInfo();
      eventService.getEvent.mockReturnValueOnce(
        of(myEvent({ id: 'new', status: 'Failed' })),
      );

      await user.click(card().getByRole('button', { name: 'Launch' }));

      expect(eventService.createEventFromEventTemplate).toHaveBeenCalledWith(
        TEMPLATE_ID,
      );
      expect(joinEvent).toHaveBeenCalledWith('new');
      expect(eventService.getEvent).toHaveBeenCalledWith('new');
      expect(await card().findByRole('alert')).toHaveTextContent(
        'This event failed to launch.',
      );
    });

    /**
     * Verifies: a hub join that fails does not stop the read-back.
     * Interacts with: SignalRService.joinEvent (vi.fn that rejects), EventService.getEvent.
     * Data: joinEvent rejects with 'hub down'.
     * Why: launchEvent() chains on the join (from(...) + catchError), so a vi.fn rejection, which counts as handled, is enough here. SignalRService tells the user about a hub it cannot reach, so the component stays quiet.
     */
    it('still reads the event back when the hub join fails', async () => {
      const failure = new Error('hub down');
      const { user, eventService } = await renderEventTemplateInfo({
        joinEvent: vi.fn(() => Promise.reject(failure)),
      });

      await user.click(card().getByRole('button', { name: 'Launch' }));
      await flush();

      expect(eventService.getEvent).toHaveBeenCalledWith('new');
    });
  });

  describe('owner controls', () => {
    /**
     * Verifies: End Event and Invite are offered only to the event's owner; on the /view route another user's event still shows Open Event without them.
     * Interacts with: route params id + viewId (activatedRouteStub), EventService.getMyViewEvents → real EventStore/Query, isOwner, rendered card.
     * Data: an Active event on view-1, owned by the signed-in user (allowed) or by someone else (denied).
     */
    it.each<{ label: string; owner: string; expected: boolean }>([
      { label: 'shows them to the owner', owner: USER_ID, expected: true },
      {
        label: 'hides them from another user',
        owner: 'someone-else',
        expected: false,
      },
    ])('$label', async ({ owner, expected }) => {
      await renderEventTemplateInfo({
        routeParams: { id: TEMPLATE_ID, viewId: 'view-1' },
        viewEvents: [
          myEvent({ userId: owner, viewId: 'view-1', status: 'Active' }),
        ],
      });

      expect(
        card().getByRole('button', { name: 'Open Event' }),
      ).toBeInTheDocument();
      expect(card().queryByRole('button', { name: 'End Event' }) !== null).toBe(
        expected,
      );
      expect(card().queryByRole('button', { name: /Invite/ }) !== null).toBe(
        expected,
      );
    });
  });

  describe('the /view route', () => {
    /**
     * Verifies: on the /view route the template's events and the user's own events are never requested (current behavior).
     * Interacts with: route params id + viewId, EventDataService.loadEvents (cold Observable), EventService.getMyEventTemplateEvents / getMyEvents (subscriptions counted with defer).
     * Data: template-1 on view-1; system ViewEvents.
     */
    it('never subscribes to loadEvents on the view route', async () => {
      let myEventsRequests = 0;
      const { eventService } = await renderEventTemplateInfo({
        routeParams: { id: TEMPLATE_ID, viewId: 'view-1' },
        viewEvents: [myEvent({ viewId: 'view-1', status: 'Active' })],
        configureApi: (api) =>
          api.getMyEvents.mockImplementation(() =>
            defer(() => {
              myEventsRequests++;
              return of<AlloyEvent[]>([]);
            }),
          ),
      });

      expect(eventService.getMyViewEvents).toHaveBeenCalledWith('view-1');
      expect(eventService.getMyEventTemplateEvents).not.toHaveBeenCalled();
      expect(eventService.getEventTemplateEvents).not.toHaveBeenCalled();
      expect(myEventsRequests).toBe(0);
    });

    describe('when the event changes status', () => {
      const VIEW_PATH = '/templates/template-1/view/view-1';
      let navigations: string[];
      let stopRecording: () => void;

      // jsdom does not navigate: a write to location.href that would load another
      // document is reported as a "jsdomError" on the window's virtual console, which
      // the test environment forwards nowhere. Listening there is the only way to see
      // that window.top.location.href was set.
      beforeEach(() => {
        navigations = [];
        const record = (error: Error) => navigations.push(error.message);
        const host: object = window;
        if (!('_virtualConsole' in host)) {
          throw new Error('jsdom no longer exposes window._virtualConsole');
        }
        const virtualConsole = host._virtualConsole as JsdomVirtualConsole;
        virtualConsole.on('jsdomError', record);
        stopRecording = () => virtualConsole.off('jsdomError', record);
        window.history.pushState({}, '', VIEW_PATH);
      });

      afterEach(() => {
        stopRecording();
        window.history.replaceState({}, '', '/');
      });

      /**
       * Verifies: on the /view route an event that is ended into its grace period makes the page leave the Player view, and the card shows Recover Event only to the owner.
       * Interacts with: route params id + viewId, EventService.getMyViewEvents → real EventStore, real EventDataService.stateUpdate (the SignalR entry point), isEventActive, window.top.location (jsdom navigation report), isOwner, rendered card.
       * Data: an Active event on view-1 owned by the signed-in user (allowed) or by someone else (denied), then updated to Suspended; the page is at /templates/template-1/view/view-1.
       * Why: a Suspended event's Player view is hidden, so the iframe must not stay on it.
       */
      it.each<{ label: string; owner: string; recover: boolean }>([
        { label: 'with Recover for the owner', owner: USER_ID, recover: true },
        {
          label: 'without Recover for another user',
          owner: 'someone-else',
          recover: false,
        },
      ])(
        'leaves the view when the event is suspended, $label',
        async ({ owner, recover }) => {
          const { fixture, eventDataService } = await renderEventTemplateInfo({
            routeParams: { id: TEMPLATE_ID, viewId: 'view-1' },
            viewEvents: [
              myEvent({ userId: owner, viewId: 'view-1', status: 'Active' }),
            ],
          });
          expect(navigations).toEqual([]);

          eventDataService.stateUpdate({
            id: 'event-1',
            status: 'Suspended',
            recoverableUntil: new Date('2026-11-06T18:30:00Z'),
          });
          fixture.detectChanges();

          expect(navigations).toEqual([
            'Not implemented: navigation to another Document',
          ]);
          expect(
            card().getByRole('heading', { name: 'This event has ended' }),
          ).toBeInTheDocument();
          expect(
            card().queryByRole('button', { name: 'Recover Event' }) !== null,
          ).toBe(recover);
        },
      );

      /**
       * Verifies: on the /view route a Recovering event stays in the Player view and shows the wait card.
       * Interacts with: route params id + viewId, real EventDataService.stateUpdate, isEventActive, window.top.location (jsdom navigation report), rendered card.
       * Data: an Active event of this user on view-1 updated to Recovering; the page is at /templates/template-1/view/view-1.
       * Why: recovery makes the Player view visible again, so leaving it would throw the user out of the event they are getting back.
       */
      it('stays in the view while the event is recovering', async () => {
        const { fixture, eventDataService } = await renderEventTemplateInfo({
          routeParams: { id: TEMPLATE_ID, viewId: 'view-1' },
          viewEvents: [myEvent({ viewId: 'view-1', status: 'Active' })],
        });

        eventDataService.stateUpdate({ id: 'event-1', status: 'Recovering' });
        fixture.detectChanges();

        expect(navigations).toEqual([]);
        expect(screen.getByText('Status: Recovering')).toBeInTheDocument();
      });
    });
  });

  describe('hub joins', () => {
    /**
     * Verifies: each stream that joins event groups handles a rejection from the promise SignalRService.joinEvent returns.
     * Interacts with: SignalRService.joinEvent (returns a pending promise whose then/catch/finally are spied), real EventStore / UserEventsStore.
     * Data: per row, an Active event of this user on this template (currentEvent$) or an Active event another user invited them to (userEvents$).
     * Why: the real joinEvent rejects when the hub cannot be reached, and SignalRService has already told the user. A dropped rejection would reach the global error handler and tell them again. A rejection dropped inside NgZone is rethrown by TestBed after the test rather than logged, so captureUnhandledRejections() cannot see it; the spied promise shows the handler directly.
     */
    it.each<{
      stream: string;
      events: AlloyEvent[];
      myEvents: AlloyEvent[];
      joined: string;
    }>([
      {
        stream: 'currentEvent$',
        events: [myEvent({ id: 'mine', status: 'Active' })],
        myEvents: [],
        joined: 'mine',
      },
      {
        stream: 'userEvents$',
        events: [],
        myEvents: [
          myEvent({
            id: 'invited',
            userId: 'someone-else',
            createdBy: 'someone-else',
            status: 'Active',
          }),
        ],
        joined: 'invited',
      },
    ])(
      '$stream handles a failed joinEvent',
      async ({ events, myEvents, joined }) => {
        const pending = new Promise<void>(() => undefined);
        const handleRejection = vi.spyOn(pending, 'catch');
        const { joinEvent } = await renderEventTemplateInfo({
          events,
          myEvents,
          joinEvent: () => pending,
        });
        await flush();

        expect(joinEvent).toHaveBeenCalledWith(joined);
        expect(handleRejection).toHaveBeenCalledWith(expect.any(Function));
      },
    );
  });

  describe('failed requests', () => {
    /**
     * Verifies: each subscription the component makes with no error callback lets a failed request escape as an unhandled RxJS error (current behavior).
     * Interacts with: failingPermissionProviders (real PermissionDataService, system permissions fail), EventService.getMyEventTemplateEvents / invite (error), the Invite menu (user-event), captureUnhandledRxErrors.
     * Data: per row, one failing request: the permission load, the route's event load, or Generate Link on the owner's Active event.
     */
    it.each<{
      method: string;
      failure: { status: number };
      setup: (failure: unknown) => RenderOverrides;
      act: (
        rendered: Awaited<ReturnType<typeof renderEventTemplateInfo>>,
      ) => Promise<void>;
    }>([
      {
        method: 'the permission load',
        failure: { status: 500 },
        setup: (failure) => ({
          providers: failingPermissionProviders(failure),
        }),
        act: async () => undefined,
      },
      {
        method: 'the route event load',
        failure: { status: 503 },
        setup: (failure) => ({
          configureApi: (api) =>
            api.getMyEventTemplateEvents.mockReturnValue(
              throwError(() => failure),
            ),
        }),
        act: async () => undefined,
      },
      {
        method: 'inviteEvent()',
        failure: { status: 403 },
        setup: (failure) => ({
          events: [myEvent({ status: 'Active' })],
          configureApi: (api) =>
            api.invite.mockReturnValue(throwError(() => failure)),
        }),
        act: async ({ user }) => {
          await user.click(card().getByRole('button', { name: /Invite/ }));
          await user.click(menuItem('Generate Link'));
        },
      },
    ])(
      '$method lets a failure escape unhandled',
      async ({ failure, setup, act }) => {
        const unhandled = captureUnhandledRxErrors();
        const rendered = await renderEventTemplateInfo(setup(failure));
        await act(rendered);
        await flush();

        expect(unhandled).toEqual([failure]);
      },
    );
  });

  describe('Administration button', () => {
    /**
     * Verifies: the Administration button is hidden from a user without any View* system permission or ManageMembership group claim.
     * Interacts with: real PermissionDataService.canViewAdministration (system and group paths), rendered top row.
     * Data: near misses: CreateEvents and ManageEventTemplates (non-View system permissions); a ViewEventTemplate claim on this template (View at resource scope, not system); an EditGroup claim (a group claim other than ManageMembership).
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'non-View system permissions',
        grants: { system: ['CreateEvents', 'ManageEventTemplates'] },
      },
      {
        label: 'a template-scoped ViewEventTemplate claim',
        grants: {
          eventTemplates: [
            {
              eventTemplateId: TEMPLATE_ID,
              permissions: ['ViewEventTemplate'],
            },
          ],
        },
      },
      {
        label: 'an EditGroup group claim',
        grants: { groups: [{ groupId: 'g1', permissions: ['EditGroup'] }] },
      },
    ])('is hidden with $label', async ({ grants }) => {
      await renderEventTemplateInfo({ grants });

      expect(
        topRow().queryByRole('button', { name: 'Show Administration Page' }),
      ).not.toBeInTheDocument();
    });

    /**
     * Verifies: a View* system permission, or a ManageMembership group claim, shows the Administration button.
     * Interacts with: real PermissionDataService.canViewAdministration (system and group paths), rendered top row.
     * Data: ViewEventTemplates; then a ManageMembership group claim with no system permissions.
     */
    it.each<{ label: string; grants: PermissionGrants }>([
      {
        label: 'ViewEventTemplates',
        grants: { system: ['ViewEventTemplates'] },
      },
      {
        label: 'a ManageMembership group claim',
        grants: {
          groups: [{ groupId: 'g1', permissions: ['ManageMembership'] }],
        },
      },
    ])('is shown with $label', async ({ grants }) => {
      await renderEventTemplateInfo({ grants });

      expect(
        topRow().getByRole('button', { name: 'Show Administration Page' }),
      ).toBeInTheDocument();
    });
  });

  describe('failureReportText()', () => {
    /**
     * Verifies: the copyable report names the event, the template (name and id), the user (name and id) and the status date.
     * Interacts with: failureReportText (formatDate with the en-US locale).
     * Data: a Failed event with username and statusDate; the page template matches.
     * Why: the card tells the user only that the launch broke, so this string is the whole report an administrator gets.
     */
    it('builds a report from the event, template, user and status date', async () => {
      const { fixture } = await renderEventTemplateInfo();

      const text = fixture.componentInstance.failureReportText(
        myEvent({
          username: 'Alex Doe',
          status: 'Failed',
          statusDate: new Date('2026-09-01T12:00:00Z'),
        }),
        template(),
      );

      expect(text).toContain(
        'Event event-1 launched from event template Cyber Range 101 (template-1)',
      );
      expect(text).toContain(
        'has failed to launch for user Alex Doe (user-1) at ',
      );
      expect(text).toContain('September 1, 2026');
    });

    /**
     * Verifies: the template name is omitted when the page's template is not the event's template.
     * Interacts with: failureReportText.
     * Data: an event on another-template; the page shows template-1.
     * Why: the /view route resolves the current event by viewId, so the event on screen need not belong to the template on screen.
     */
    it('omits the template name when the page template is not the event template', async () => {
      const { fixture } = await renderEventTemplateInfo();

      const text = fixture.componentInstance.failureReportText(
        myEvent({ eventTemplateId: 'another-template', status: 'Failed' }),
        template(),
      );

      expect(text).toContain(
        'launched from event template another-template has',
      );
      expect(text).not.toContain('Cyber Range 101');
    });

    /**
     * Verifies: with no username the report names the user by id alone.
     * Interacts with: failureReportText.
     * Data: a Failed event without username or template argument.
     */
    it('reports the user id alone when the event carries no username', async () => {
      const { fixture } = await renderEventTemplateInfo();

      const text = fixture.componentInstance.failureReportText(
        myEvent({ status: 'Failed' }),
      );

      expect(text).toContain(
        'has failed to launch for user user-1 at unknown.',
      );
    });

    /**
     * Verifies: with no eventTemplateId on the event the report falls back to the page template.
     * Interacts with: failureReportText.
     * Data: a Failed event with eventTemplateId removed; the page shows template-1.
     */
    it('falls back to the page template when the event carries no template id', async () => {
      const { fixture } = await renderEventTemplateInfo();

      const text = fixture.componentInstance.failureReportText(
        { id: 'event-1', userId: USER_ID, status: 'Failed' },
        template(),
      );

      expect(text).toContain(
        'launched from event template Cyber Range 101 (template-1)',
      );
    });
  });
});
