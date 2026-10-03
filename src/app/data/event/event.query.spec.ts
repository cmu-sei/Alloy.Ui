// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { EventStore } from './event.store';
import { EventQuery } from './event.query';

// Fresh objects per call: Akita deep-freezes stored state in dev mode, so a
// shared fixture would be frozen by the first test that stores it.
function makeEvent(overrides: Partial<AlloyEvent> = {}): AlloyEvent {
  return {
    id: 'event-1',
    name: 'Event 1',
    eventTemplateId: 'template-1',
    viewId: 'view-1',
    status: 'Active',
    ...overrides,
  };
}

describe('EventQuery', () => {
  let store: EventStore;
  let query: EventQuery;

  beforeEach(() => {
    // A pure store/query pair needs no TestBed; a new instance per test also
    // replaces the previous one in Akita's global store registry.
    store = new EventStore();
    query = new EventQuery(store);
  });

  /**
   * Verifies: selectAll() returns events ordered by name ascending, per the @QueryConfig sortBy.
   * Interacts with: EventStore.set, EventQuery.selectAll.
   * Data: three events inserted out of name order.
   */
  it('sorts events by name ascending', async () => {
    store.set([
      makeEvent({ id: 'c', name: 'Charlie' }),
      makeEvent({ id: 'a', name: 'Alpha' }),
      makeEvent({ id: 'b', name: 'Bravo' }),
    ]);

    const events = await firstValueFrom(query.selectAll());

    expect(events.map((e) => e.name)).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  /**
   * Verifies: selectById() emits the matching event and re-emits when that event is updated.
   * Interacts with: EventStore.set/update, EventQuery.selectById, recordEmissions.
   * Data: one Active event later updated to Ending.
   */
  it('selectById emits the event and its later updates', () => {
    store.set([makeEvent({ id: 'event-1', status: 'Active' })]);
    const seen = recordEmissions(query.selectById('event-1'));

    store.update('event-1', { status: 'Ending' });

    expect(seen.map((e) => e.status)).toEqual(['Active', 'Ending']);
  });

  /**
   * Verifies: selectById() emits undefined for an id the store does not hold.
   * Interacts with: EventQuery.selectById.
   * Data: an empty store.
   */
  it('selectById emits undefined for an unknown id', async () => {
    expect(await firstValueFrom(query.selectById('missing'))).toBeUndefined();
  });

  /**
   * Verifies: selectByEventTemplateId() keeps only the events launched from the given template.
   * Interacts with: EventStore.set, EventQuery.selectByEventTemplateId.
   * Data: two events on template-1 and one on template-2.
   */
  it('selectByEventTemplateId filters to one template', async () => {
    store.set([
      makeEvent({ id: 'a', name: 'A', eventTemplateId: 'template-1' }),
      makeEvent({ id: 'b', name: 'B', eventTemplateId: 'template-2' }),
      makeEvent({ id: 'c', name: 'C', eventTemplateId: 'template-1' }),
    ]);

    const events = await firstValueFrom(
      query.selectByEventTemplateId('template-1'),
    );

    expect(events.map((e) => e.id)).toEqual(['a', 'c']);
  });

  /**
   * Verifies: selectByEventTemplateId() picks up an event added after subscription.
   * Interacts with: EventStore.upsert, EventQuery.selectByEventTemplateId, recordEmissions.
   * Data: empty store, then one event upserted for template-1.
   */
  it('selectByEventTemplateId emits again when a matching event arrives', () => {
    const seen = recordEmissions(query.selectByEventTemplateId('template-1'));

    store.upsert('a', makeEvent({ id: 'a', eventTemplateId: 'template-1' }));

    expect(seen.map((list) => list.map((e) => e.id))).toEqual([[], ['a']]);
  });

  /**
   * Verifies: selectByViewId() keeps only the events attached to the given Player view.
   * Interacts with: EventStore.set, EventQuery.selectByViewId.
   * Data: events on view-1, view-2, and one with no view.
   */
  it('selectByViewId filters to one view', async () => {
    store.set([
      makeEvent({ id: 'a', name: 'A', viewId: 'view-1' }),
      makeEvent({ id: 'b', name: 'B', viewId: 'view-2' }),
      makeEvent({ id: 'c', name: 'C', viewId: null }),
    ]);

    const events = await firstValueFrom(query.selectByViewId('view-1'));

    expect(events.map((e) => e.id)).toEqual(['a']);
  });
});
