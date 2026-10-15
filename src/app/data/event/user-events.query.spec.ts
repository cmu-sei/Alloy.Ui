// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { UserEventsStore } from './user-events.store';
import { UserEventsQuery } from './user-events.query';

function makeEvent(overrides: Partial<AlloyEvent> = {}): AlloyEvent {
  return {
    id: 'event-1',
    name: 'Event 1',
    eventTemplateId: 'template-1',
    status: 'Active',
    ...overrides,
  };
}

describe('UserEventsQuery', () => {
  let store: UserEventsStore;
  let query: UserEventsQuery;

  beforeEach(() => {
    store = new UserEventsStore();
    query = new UserEventsQuery(store);
  });

  /**
   * Verifies: userEventsByTemplateId$() keeps only the user's events for the given template.
   * Interacts with: UserEventsStore.set, UserEventsQuery.userEventsByTemplateId$.
   * Data: events across two templates.
   */
  it('filters the user events to one template', async () => {
    store.set([
      makeEvent({ id: 'a', eventTemplateId: 'template-1' }),
      makeEvent({ id: 'b', eventTemplateId: 'template-2' }),
    ]);

    const events = await firstValueFrom(
      query.userEventsByTemplateId$('template-1'),
    );

    expect(events.map((e) => e.id)).toEqual(['a']);
  });

  /**
   * Verifies: userEventsByTemplateId$() emits again when a matching event is removed.
   * Interacts with: UserEventsStore.set/remove, recordEmissions.
   * Data: one event on template-1, then removed.
   */
  it('re-emits when a matching event is removed', () => {
    store.set([makeEvent({ id: 'a', eventTemplateId: 'template-1' })]);
    const seen = recordEmissions(query.userEventsByTemplateId$('template-1'));

    store.remove('a');

    expect(seen.map((list) => list.map((e) => e.id))).toEqual([['a'], []]);
  });

  /**
   * Verifies: the store starts in the loading state and selectLoading() reports the change to false after set().
   * Interacts with: UserEventsStore.set, UserEventsQuery.selectLoading, recordEmissions.
   * Data: an empty store, then one event set.
   * Why: EventTemplateInfoComponent waits on !loading before it reads userEventsByTemplateId$, so this flip is what releases it.
   */
  it('starts loading and stops once events are set', () => {
    const seen = recordEmissions(query.selectLoading());

    store.set([makeEvent()]);

    expect(seen).toEqual([true, false]);
  });
});
