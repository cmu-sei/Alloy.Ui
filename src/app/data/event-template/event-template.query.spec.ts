// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { EventTemplate } from 'src/app/generated/alloy.api';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { EventTemplateStore } from './event-template.store';
import { EventTemplateQuery } from './event-template.query';

function makeTemplate(overrides: Partial<EventTemplate> = {}): EventTemplate {
  return {
    id: 'template-1',
    name: 'Template 1',
    durationHours: 4,
    isPublished: true,
    ...overrides,
  };
}

describe('EventTemplateQuery', () => {
  let store: EventTemplateStore;
  let query: EventTemplateQuery;

  beforeEach(() => {
    store = new EventTemplateStore();
    query = new EventTemplateQuery(store);
  });

  /**
   * Verifies: selectAll() orders templates by name ascending, per the @QueryConfig sortBy.
   * Interacts with: EventTemplateStore.set, EventTemplateQuery.selectAll.
   * Data: three templates inserted out of name order.
   */
  it('sorts templates by name ascending', async () => {
    store.set([
      makeTemplate({ id: 'z', name: 'Zulu' }),
      makeTemplate({ id: 'a', name: 'Alpha' }),
      makeTemplate({ id: 'm', name: 'Mike' }),
    ]);

    const templates = await firstValueFrom(query.selectAll());

    expect(templates.map((t) => t.name)).toEqual(['Alpha', 'Mike', 'Zulu']);
  });

  /**
   * Verifies: selectById() emits the template, then each update to it, then undefined once removed.
   * Interacts with: EventTemplateStore.set/update/remove, EventTemplateQuery.selectById, recordEmissions.
   * Data: one template renamed and then removed.
   */
  it('selectById tracks a template through update and removal', () => {
    store.set([makeTemplate({ id: 't', name: 'Before' })]);
    const seen = recordEmissions(query.selectById('t'));

    store.update('t', { name: 'After' });
    store.remove('t');

    expect(seen.map((t) => t?.name)).toEqual(['Before', 'After', undefined]);
  });

  /**
   * Verifies: selectLoading() starts true and turns false once templates are set.
   * Interacts with: EventTemplateStore.set, EventTemplateQuery.selectLoading, recordEmissions.
   * Data: an empty store, then one template.
   * Why: EventTemplateInfoComponent gates eventTemplate$ on !loading, so the page shows nothing until this flips.
   */
  it('reports loading until templates are set', () => {
    const seen = recordEmissions(query.selectLoading());

    store.set([makeTemplate()]);

    expect(seen).toEqual([true, false]);
  });
});
