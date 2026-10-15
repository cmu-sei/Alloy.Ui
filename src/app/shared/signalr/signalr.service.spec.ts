// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import {
  Event as AlloyEvent,
  EventMembershipsService,
  EventService,
  EventTemplateMembershipsService,
  EventTemplateService,
  GroupService,
} from 'src/app/generated/alloy.api';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventMembershipDataService } from 'src/app/data/event/event-membership-data.service';
import { EventQuery } from 'src/app/data/event/event.query';
import { EventTemplateMembershipDataService } from 'src/app/data/event-template/event-template-membership-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { GroupMembershipService } from 'src/app/data/group/group-membership.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { unstubbed } from 'src/app/test-utils/unstubbed';
import {
  FakeHubConnection,
  mockHubConnectionBuilder,
} from 'src/app/test-utils/fake-hub-connection';
import {
  captureUnhandledRejections,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { SignalRService } from './signalr.service';

let connections: FakeHubConnection[];
let builder: ReturnType<typeof mockHubConnectionBuilder>;
/** Set by a test to make the first connection's start() reject with it. */
let firstStartFailure: Error | undefined;

/** The arguments of every `invoke(method, ...)` call on a connection. */
function invokedWith(connection: FakeHubConnection, method: string) {
  return connection.invoke.mock.calls
    .filter(([m]) => m === method)
    .map(([, ...args]) => args);
}

function setup() {
  let tokens = 0;
  const auth: Pick<ComnAuthService, 'getAuthorizationToken'> = {
    getAuthorizationToken: () => `token-${++tokens}`,
  };
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ComnSettingsService,
        useValue: { settings: { ApiUrl: 'https://alloy.test' } },
      },
      { provide: ComnAuthService, useValue: auth },
      // The real data services and stores receive the hub messages; their
      // generated API clients are never called by a handler.
      unstubbed(EventService),
      unstubbed(EventTemplateService),
      unstubbed(EventMembershipsService),
      unstubbed(EventTemplateMembershipsService),
      unstubbed(GroupService),
      unstubbed(PermissionDataService),
    ],
  });
  return {
    service: TestBed.inject(SignalRService),
    eventQuery: TestBed.inject(EventQuery),
    eventDataService: TestBed.inject(EventDataService),
    eventTemplateQuery: TestBed.inject(EventTemplateQuery),
    eventMemberships: TestBed.inject(EventMembershipDataService),
    eventTemplateMemberships: TestBed.inject(
      EventTemplateMembershipDataService,
    ),
    groupMemberships: TestBed.inject(GroupMembershipService),
  };
}

function makeEvent(overrides: Partial<AlloyEvent> = {}): AlloyEvent {
  return { id: 'e1', name: 'Event 1', status: 'Active', ...overrides };
}

describe('SignalRService', () => {
  beforeEach(() => {
    firstStartFailure = undefined;
    builder = mockHubConnectionBuilder({
      // Only the first build fails, so a retry gets a connection that starts.
      // The service chains on start(), so a vi.fn rejection still leaves the
      // derived promise unhandled where the service has no .catch.
      onBuild: (connection, index) => {
        const failure = firstStartFailure;
        if (failure && index === 0) {
          connection.start.mockImplementation(() => Promise.reject(failure));
        }
      },
    });
    connections = builder.connections;
    // The service logs failed joins to the console; keep test output clean.
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  describe('startConnection()', () => {
    /**
     * Verifies: the first call builds a hub connection to /hubs/engine with the bearer token in the query string and starts it.
     * Interacts with: HubConnectionBuilder.withUrl/withAutomaticReconnect/build (spied), FakeHubConnection.start, ComnAuthService.getAuthorizationToken.
     * Data: ApiUrl https://alloy.test; first token 'token-1'.
     */
    it('connects to the engine hub with the bearer token', async () => {
      const { service } = setup();

      await service.startConnection();

      expect(builder.withUrl).toHaveBeenCalledWith(
        'https://alloy.test/hubs/engine?bearer=token-1',
      );
      expect(connections).toHaveLength(1);
      expect(connections[0].start).toHaveBeenCalledTimes(1);
    });

    /**
     * Verifies: concurrent callers share one promise and one connection.
     * Interacts with: SignalRService.startConnection memoization, HubConnectionBuilder.build.
     * Data: two calls before the first start resolves.
     */
    it('builds the connection once for concurrent callers', async () => {
      const { service } = setup();

      const first = service.startConnection();
      const second = service.startConnection();
      await Promise.all([first, second]);

      expect(second).toBe(first);
      expect(connections).toHaveLength(1);
    });

    /**
     * Verifies: a failed initial start is not memoized, so the next caller builds a new connection with a fresh token.
     * Interacts with: FakeHubConnection.start (the first connection's rejects, via onBuild), HubConnectionBuilder.withUrl, console.log spy.
     * Data: the first start rejects with 'expired token'; the retry uses token-2.
     * Why: withAutomaticReconnect does not cover the initial start, so this retry path is the only recovery from an expired token.
     */
    it('retries a failed start with a new connection and token', async () => {
      const { service } = setup();
      const failure = new Error('expired token');
      firstStartFailure = failure;

      await expect(service.startConnection()).rejects.toBe(failure);
      await flush();
      await service.startConnection();

      expect(connections).toHaveLength(2);
      expect(connections[1].start).toHaveBeenCalledTimes(1);
      expect(builder.withUrl).toHaveBeenLastCalledWith(
        'https://alloy.test/hubs/engine?bearer=token-2',
      );
      expect(vi.mocked(console.log)).toHaveBeenCalledWith(failure);
    });

    /**
     * Verifies: a connection that started stays memoized even when a group join on it fails.
     * Interacts with: FakeHubConnection.invoke (rejects JoinEvent), SignalRService.joinEvent/startConnection.
     * Data: JoinEvent rejects with 'forbidden'.
     */
    it('keeps a started connection when a join fails', async () => {
      const { service } = setup();
      await service.startConnection();
      connections[0].invoke.mockRejectedValueOnce(new Error('forbidden'));

      await expect(service.joinEvent('e1')).rejects.toThrow('forbidden');
      await service.startConnection();

      expect(connections).toHaveLength(1);
    });
  });

  describe('event groups', () => {
    /**
     * Verifies: joinEvent resolves only once the server has answered JoinEvent.
     * Interacts with: FakeHubConnection.invoke (held open with a deferred promise), SignalRService.joinEvent.
     * Data: event e1 on an already started connection.
     * Why: callers read the event back after this resolves; resolving early would let a broadcast sent before the join land nowhere.
     */
    it('joinEvent waits for the server to confirm the join', async () => {
      const { service } = setup();
      await service.startConnection();
      let confirm: () => void = () => undefined;
      connections[0].invoke.mockImplementationOnce(
        () => new Promise<void>((resolve) => (confirm = resolve)),
      );

      let joined = false;
      const join = service.joinEvent('e1').then(() => (joined = true));
      await flush();
      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([['e1']]);
      expect(joined).toBe(false);

      confirm();
      await join;
      expect(joined).toBe(true);
    });

    /**
     * Verifies: joining an event already joined on this connection does not invoke JoinEvent again, while a new event does.
     * Interacts with: SignalRService.joinEvent, FakeHubConnection.invoke.
     * Data: e1 joined twice, then e2.
     */
    it('only invokes JoinEvent for events not yet joined', async () => {
      const { service } = setup();
      await service.startConnection();
      await service.joinEvent('e1');

      await service.joinEvent('e1');
      await service.joinEvent('e2');

      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([
        ['e1'],
        ['e2'],
      ]);
    });

    /**
     * Verifies: the first joinEvent on a connection that is not started yet invokes JoinEvent twice for the same event (current behavior).
     * Interacts with: SignalRService.joinEvent → startConnection, FakeHubConnection.invoke.
     * Data: joinEvent('e1') before any startConnection().
     * Why: startConnection() and joinEvent() each chain joinGroups() on the same start promise; both compute "pending" before either JoinEvent returns.
     */
    it('joins twice when the first joinEvent also starts the connection', async () => {
      const { service } = setup();

      await service.joinEvent('e1');

      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([
        ['e1'],
        ['e1'],
      ]);
    });

    /**
     * Verifies: while the socket is down, joinEvent records the event without invoking, and the reconnect joins it.
     * Interacts with: FakeHubConnection.state/reconnect, SignalRService.joinEvent and its onreconnected handler.
     * Data: a started connection set to Reconnecting, then joinEvent('e2'), then a reconnect.
     */
    it('defers joins made while disconnected until the reconnect', async () => {
      const { service } = setup();
      await service.startConnection();
      connections[0].state = signalR.HubConnectionState.Reconnecting;

      await service.joinEvent('e2');
      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([]);

      connections[0].reconnect();
      await flush();
      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([['e2']]);
    });

    /**
     * Verifies: an automatic reconnect rejoins every tracked event group, since the server forgets groups on a new connection.
     * Interacts with: FakeHubConnection.reconnect (fires onreconnected), FakeHubConnection.invoke.
     * Data: e1 and e2 joined, then a reconnect.
     */
    it('rejoins every tracked event after a reconnect', async () => {
      const { service } = setup();
      await service.startConnection();
      await service.joinEvent('e1');
      await service.joinEvent('e2');
      connections[0].invoke.mockClear();

      connections[0].reconnect();
      await flush();

      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([
        ['e1'],
        ['e2'],
      ]);
    });

    /**
     * Verifies: leaveEvent invokes LeaveEvent and the event is not rejoined on the next reconnect.
     * Interacts with: SignalRService.leaveEvent, FakeHubConnection.invoke/reconnect.
     * Data: e1 and e2 joined, e1 left, then a reconnect.
     */
    it('leaveEvent leaves the group and stops tracking it', async () => {
      const { service } = setup();
      await service.startConnection();
      await service.joinEvent('e1');
      await service.joinEvent('e2');

      await service.leaveEvent('e1');
      connections[0].invoke.mockClear();
      connections[0].reconnect();
      await flush();

      expect(invokedWith(connections[0], 'JoinEvent')).toEqual([['e2']]);
    });

    /**
     * Verifies: joinAdmin and leaveAdmin invoke the admin hub methods once the connection is up.
     * Interacts with: SignalRService.joinAdmin/leaveAdmin, FakeHubConnection.invoke.
     * Data: one join then one leave.
     */
    it('joinAdmin and leaveAdmin invoke the admin hub methods', async () => {
      const { service } = setup();

      service.joinAdmin();
      await flush();
      service.leaveAdmin();
      await flush();

      expect(connections[0].invoke.mock.calls.map(([m]) => m)).toEqual([
        'JoinAdmin',
        'LeaveAdmin',
      ]);
    });

    /**
     * Verifies: when the connection cannot start, joinAdmin and leaveAdmin each leave an unhandled promise rejection (current behavior).
     * Interacts with: SignalRService.joinAdmin/leaveAdmin → startConnection, FakeHubConnection.start (rejects, via onBuild), captureUnhandledRejections (zone.js reports through console.error).
     * Data: a fresh service whose first start() rejects with 'hub offline'; one case per method.
     * Why: startConnection rethrows the start failure to its callers, and each of these methods chains .then() on it with no .catch.
     */
    it.each(['joinAdmin', 'leaveAdmin'] as const)(
      '%s leaves an unhandled rejection when the connection cannot start',
      async (method) => {
        const rejections = captureUnhandledRejections();
        const { service } = setup();
        const offline = new Error('hub offline');
        firstStartFailure = offline;

        service[method]();
        await flush();

        expect(rejections).toEqual([offline]);
        expect(connections[0].invoke).not.toHaveBeenCalled();
      },
    );

    /**
     * Verifies: after an automatic reconnect the admin groups are not rejoined (current behavior).
     * Interacts with: SignalRService.joinAdmin and its onreconnected handler, FakeHubConnection.reconnect/invoke.
     * Data: joinAdmin() on a started connection, then a reconnect.
     * Why: EngineHub.JoinAdmin adds the connection to the Admin* groups, and a reconnect is a new connection id the server knows nothing about.
     */
    it('does not rejoin the admin groups after a reconnect', async () => {
      const { service } = setup();
      service.joinAdmin();
      await flush();
      connections[0].invoke.mockClear();

      connections[0].reconnect();
      await flush();

      expect(invokedWith(connections[0], 'JoinAdmin')).toEqual([]);
    });
  });

  describe('event handlers', () => {
    /**
     * Verifies: EventCreated, then EventUpdated, flow into the real event store and out through EventQuery.
     * Interacts with: FakeHubConnection.trigger, real EventDataService/EventStore/EventQuery.
     * Data: e1 created as Creating, then updated to Active; each message is the full Event plus the modified property names (null on create), as EventSignalRHandlers.cs:51 sends them.
     */
    it('EventCreated and EventUpdated upsert into the event store', async () => {
      const { service, eventQuery } = setup();
      await service.startConnection();
      const hub = connections[0];

      hub.trigger(
        'EventCreated',
        makeEvent({ id: 'e1', status: 'Creating' }),
        null,
      );
      hub.trigger('EventUpdated', makeEvent({ id: 'e1', status: 'Active' }), [
        'status',
      ]);

      expect((await firstValueFrom(eventQuery.selectById('e1'))).status).toBe(
        'Active',
      );
    });

    /**
     * Verifies: EventDeleted carrying a bare id, which is what alloy.api sends, empties the whole event store (current behavior).
     * Interacts with: FakeHubConnection.trigger, EventDataService.stateDelete, real EventStore (Akita remove(undefined) removes all).
     * Data: e1 and e2 stored; EventDeleted with the string 'e1'.
     * Why: EventDeletedSignalRHandler (EventSignalRHandlers.cs:101) sends notification.Entity.Id, not an Event view model.
     */
    it("EventDeleted with the API's bare id clears every event", async () => {
      const { service, eventQuery, eventDataService } = setup();
      await service.startConnection();
      eventDataService.stateCreate(makeEvent({ id: 'e1' }));
      eventDataService.stateCreate(makeEvent({ id: 'e2' }));

      connections[0].trigger('EventDeleted', 'e1');

      expect(eventQuery.getAll()).toEqual([]);
    });

    /**
     * Verifies: an event-template deletion, as alloy.api broadcasts it (EventDeleted carrying the template id), clears every event and leaves the template in place (current behavior).
     * Interacts with: FakeHubConnection.trigger, real EventStore/EventQuery and EventTemplateStore/EventTemplateQuery.
     * Data: one event and template t1 stored; EventDeleted with the string 't1'.
     * Why: EventTemplateDeletedSignalRHandler in alloy.api sends EngineHubMethods.EventDeleted, so the EventTemplateDeleted handler never runs.
     */
    it('a template deletion broadcast clears events and keeps the template', async () => {
      const { service, eventQuery, eventTemplateQuery, eventDataService } =
        setup();
      await service.startConnection();
      eventDataService.stateCreate(makeEvent({ id: 'e1' }));
      connections[0].trigger(
        'EventTemplateCreated',
        { id: 't1', name: 'Template' },
        null,
      );

      connections[0].trigger('EventDeleted', 't1');

      expect(eventTemplateQuery.hasEntity('t1')).toBe(true);
      // The events are wiped by the UI's EventDeleted handler, which reads .id
      // from the bare id the API sends (see "EventDeleted with the API's bare
      // id clears every event").
      expect(eventQuery.getAll()).toEqual([]);
    });
  });

  describe('event template handlers', () => {
    /**
     * Verifies: EventTemplateCreated and EventTemplateUpdated maintain the real template store.
     * Interacts with: FakeHubConnection.trigger, real EventTemplateDataService/EventTemplateQuery.
     * Data: t1 created and renamed; t2 created alongside; each message is the template plus the modified property names (null on create), as EventTemplateSignalRHandlers.cs:53 sends them.
     */
    it('create and update keep the template store current', async () => {
      const { service, eventTemplateQuery } = setup();
      await service.startConnection();
      const hub = connections[0];

      hub.trigger('EventTemplateCreated', { id: 't1', name: 'Before' }, null);
      hub.trigger('EventTemplateCreated', { id: 't2', name: 'Other' }, null);
      hub.trigger('EventTemplateUpdated', { id: 't1', name: 'After' }, [
        'name',
      ]);

      expect(
        eventTemplateQuery.getAll().map((t) => `${t.id}:${t.name}`),
      ).toEqual(['t1:After', 't2:Other']);
    });

    /**
     * Verifies: EventTemplateDeleted carrying a bare id, the payload shape every alloy.api delete broadcast uses, empties the whole template store (current behavior).
     * Interacts with: FakeHubConnection.trigger, EventTemplateDataService.stateDelete, real EventTemplateStore (Akita remove(undefined) removes all).
     * Data: templates t1 and t2 stored; EventTemplateDeleted with the string 't1'.
     * Why: alloy.api never sends EventTemplateDeleted today (it sends EventDeleted, as the previous describe block shows), but its delete handlers send notification.Entity.Id (EventSignalRHandlers.cs:101, EventTemplateSignalRHandlers.cs:98), so this is what the handler receives once the API is fixed.
     */
    it("EventTemplateDeleted with the API's bare id clears every template", async () => {
      const { service, eventTemplateQuery } = setup();
      await service.startConnection();
      const hub = connections[0];
      hub.trigger('EventTemplateCreated', { id: 't1', name: 'One' }, null);
      hub.trigger('EventTemplateCreated', { id: 't2', name: 'Two' }, null);

      hub.trigger('EventTemplateDeleted', 't1');

      expect(eventTemplateQuery.getAll()).toEqual([]);
    });
  });

  describe('membership handlers', () => {
    /**
     * Verifies: EventMembershipCreated/Updated/Deleted maintain EventMembershipDataService's list (delete carries the id).
     * Interacts with: FakeHubConnection.trigger, real EventMembershipDataService.eventMemberships$.
     * Data: m1 and m2 created, m1 promoted to owner, m2 deleted; create and update carry the membership plus the modified property names (EventMembershipSignalRHandlers.cs:47), delete the bare id (:97).
     */
    it('event membership messages update the event membership list', async () => {
      const { service, eventMemberships } = setup();
      await service.startConnection();
      const hub = connections[0];

      hub.trigger(
        'EventMembershipCreated',
        { id: 'm1', eventId: 'e1', roleId: 'member' },
        null,
      );
      hub.trigger(
        'EventMembershipCreated',
        { id: 'm2', eventId: 'e1', roleId: 'member' },
        null,
      );
      hub.trigger(
        'EventMembershipUpdated',
        { id: 'm1', eventId: 'e1', roleId: 'owner' },
        ['roleId'],
      );
      hub.trigger('EventMembershipDeleted', 'm2');

      const list = await firstValueFrom(eventMemberships.eventMemberships$);
      expect(list.map((m) => `${m.id}:${m.roleId}`)).toEqual(['m1:owner']);
    });

    /**
     * Verifies: EventTemplateMembershipCreated/Updated/Deleted maintain EventTemplateMembershipDataService's list.
     * Interacts with: FakeHubConnection.trigger, real EventTemplateMembershipDataService.eventTemplateMemberships$.
     * Data: membership m1 created, updated, then deleted; create and update carry the membership alone, delete the bare id (EventTemplateMembershipSignalRHandler.cs:33, :51, :73).
     */
    it('event template membership messages update the template membership list', async () => {
      const { service, eventTemplateMemberships } = setup();
      await service.startConnection();
      const hub = connections[0];

      hub.trigger('EventTemplateMembershipCreated', {
        id: 'm1',
        roleId: 'member',
      });
      hub.trigger('EventTemplateMembershipUpdated', {
        id: 'm1',
        roleId: 'owner',
      });
      expect(
        (
          await firstValueFrom(
            eventTemplateMemberships.eventTemplateMemberships$,
          )
        )[0].roleId,
      ).toBe('owner');

      hub.trigger('EventTemplateMembershipDeleted', 'm1');
      expect(
        await firstValueFrom(
          eventTemplateMemberships.eventTemplateMemberships$,
        ),
      ).toEqual([]);
    });

    /**
     * Verifies: GroupMembershipCreated/Updated/Deleted maintain GroupMembershipService's list.
     * Interacts with: FakeHubConnection.trigger, real GroupMembershipService.selectMemberships.
     * Data: membership m1 in group g1 created, made Manager, then deleted; create and update carry the membership plus the modified property names (GroupMembershipHandlers.cs:59), delete the bare id (:45).
     */
    it('group membership messages update the group membership list', async () => {
      const { service, groupMemberships } = setup();
      await service.startConnection();
      const hub = connections[0];

      hub.trigger(
        'GroupMembershipCreated',
        { id: 'm1', groupId: 'g1', role: 'Member' },
        null,
      );
      hub.trigger(
        'GroupMembershipUpdated',
        { id: 'm1', groupId: 'g1', role: 'Manager' },
        ['role'],
      );
      expect(
        (await firstValueFrom(groupMemberships.selectMemberships('g1')))[0]
          .role,
      ).toBe('Manager');

      hub.trigger('GroupMembershipDeleted', 'm1');
      expect(
        await firstValueFrom(groupMemberships.selectMemberships('g1')),
      ).toEqual([]);
    });
  });

  describe('reconnect policy', () => {
    /**
     * Verifies: the retry delay doubles from 2s, caps at 60s, and adds 0–5s of whole-second jitter.
     * Interacts with: the RetryPolicy passed to withAutomaticReconnect, Math.random (spied).
     * Data: previousRetryCount 0, 1, 4, 5, 20 with jitter forced to 0s and to 5s.
     */
    it('backs off exponentially with jitter and a 60s cap', async () => {
      const { service } = setup();
      await service.startConnection();
      const policy = builder.retryPolicy()!;
      const delay = (previousRetryCount: number) =>
        policy.nextRetryDelayInMilliseconds({
          previousRetryCount,
          elapsedMilliseconds: 0,
          retryReason: new Error('lost'),
        });

      const random = vi.spyOn(Math, 'random').mockReturnValue(0);
      expect([0, 1, 4, 5, 20].map(delay)).toEqual([
        2000, 4000, 32000, 60000, 60000,
      ]);

      random.mockReturnValue(0.999);
      expect([0, 5].map(delay)).toEqual([7000, 65000]);
    });
  });
});
