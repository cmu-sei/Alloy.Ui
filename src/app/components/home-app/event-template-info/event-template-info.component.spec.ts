// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Params } from '@angular/router';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { defer, of, throwError } from 'rxjs';
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

const TEMPLATE_ID = 'template-1';
const USER_ID = 'user-1';

@Component({ selector: 'app-topbar', template: '' })
class TopbarStubComponent {
  @Input() title?: string;
  @Input() topbarView?: TopbarView;
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
    declarations: [EventTemplateInfoComponent],
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

describe('EventTemplateInfoComponent', () => {
  /**
   * Verifies: the template's name, description and duration render, with Launch offered when the user has no event.
   * Interacts with: EventTemplateService.getEventTemplate → real EventTemplateStore/Query, rendered card.
   * Data: template-1 with no events.
   */
  it('shows the template and a Launch button when there is no current event', async () => {
    await renderEventTemplateInfo();

    expect(
      screen.getByRole('heading', { name: 'Cyber Range 101' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Learn the range')).toBeInTheDocument();
    expect(screen.getByText('Duration: 4 hours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Launch' })).toBeInTheDocument();
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

      expect(screen.getByRole('alert')).toHaveTextContent(
        'This event failed to launch.',
      );
      expect(
        screen.getByRole('button', { name: 'Launch Again' }),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Launch' }),
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
        screen.getByRole('heading', { name: 'Please wait!' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Status: Planning')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
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

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Launch' }),
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
      const copy = within(screen.getByRole('alert')).getByRole('button', {
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

      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Launch' }),
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
        screen.getByRole('heading', { name: 'Please wait!' }),
      ).toBeInTheDocument();

      eventDataService.stateUpdate({ id: 'event-1', status: 'Active' });
      fixture.detectChanges();

      expect(
        screen.getByRole('button', { name: 'Open Event' }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'End Event' }),
      ).toBeInTheDocument();
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

      await user.click(screen.getByRole('button', { name: 'Launch' }));

      expect(eventService.createEventFromEventTemplate).toHaveBeenCalledWith(
        TEMPLATE_ID,
      );
      expect(joinEvent).toHaveBeenCalledWith('new');
      expect(eventService.getEvent).toHaveBeenCalledWith('new');
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'This event failed to launch.',
      );
    });

    /**
     * Verifies: a hub join that fails does not stop the read-back.
     * Interacts with: SignalRService.joinEvent (vi.fn that rejects), EventService.getEvent, console.log spy.
     * Data: joinEvent rejects with 'hub down'.
     * Why: launchEvent() chains on the join (from(...) + catchError), so a vi.fn rejection, which counts as handled, is enough here; the other join call sites drop the promise and are pinned under 'hub joins'.
     */
    it('still reads the event back when the hub join fails', async () => {
      const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
      const failure = new Error('hub down');
      const { user, eventService } = await renderEventTemplateInfo({
        joinEvent: vi.fn(() => Promise.reject(failure)),
      });

      await user.click(screen.getByRole('button', { name: 'Launch' }));
      await flush();

      expect(eventService.getEvent).toHaveBeenCalledWith('new');
      expect(log).toHaveBeenCalledWith(failure);
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
        screen.getByRole('button', { name: 'Open Event' }),
      ).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'End Event' }) !== null).toBe(
        expected,
      );
      expect(screen.queryByRole('button', { name: /Invite/ }) !== null).toBe(
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
  });

  describe('hub joins', () => {
    /**
     * Verifies: each stream that joins event groups drops the promise SignalRService.joinEvent returns, attaching no then/catch/finally (current behavior).
     * Interacts with: SignalRService.joinEvent (returns a pending promise whose then/catch/finally are spied), real EventStore / UserEventsStore.
     * Data: per row, an Active event of this user on this template (currentEvent$) or an Active event another user invited them to (userEvents$).
     * Why: the real joinEvent rejects when the hub cannot be reached. A rejection dropped inside NgZone is rethrown by TestBed after the test rather than logged, so captureUnhandledRejections() cannot see it; the spied promise shows the missing handler directly.
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
      '$stream drops the joinEvent promise',
      async ({ events, myEvents, joined }) => {
        const pending = new Promise<void>(() => undefined);
        const handlers = [
          vi.spyOn(pending, 'then'),
          vi.spyOn(pending, 'catch'),
          vi.spyOn(pending, 'finally'),
        ];
        const { joinEvent } = await renderEventTemplateInfo({
          events,
          myEvents,
          joinEvent: () => pending,
        });
        await flush();

        expect(joinEvent).toHaveBeenCalledWith(joined);
        handlers.forEach((handler) => expect(handler).not.toHaveBeenCalled());
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
          await user.click(screen.getByRole('button', { name: /Invite/ }));
          await user.click(
            screen.getByRole('menuitem', { name: 'Generate Link' }),
          );
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
        screen.queryByRole('button', { name: 'Show Administration Page' }),
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
        screen.getByRole('button', { name: 'Show Administration Page' }),
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
