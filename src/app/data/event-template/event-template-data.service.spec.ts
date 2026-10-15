// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  EventTemplate,
  EventTemplateService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { EventTemplateDataService } from './event-template-data.service';
import { EventTemplateQuery } from './event-template.query';

function makeTemplate(overrides: Partial<EventTemplate> = {}): EventTemplate {
  return {
    id: 'template-1',
    name: 'Template 1',
    durationHours: 4,
    ...overrides,
  };
}

function eventTemplateServiceStub() {
  return {
    getEventTemplates: vi.fn(() => of<EventTemplate[]>([])),
    getEventTemplate: vi.fn(() => of(makeTemplate())),
    createEventTemplate: vi.fn((t: EventTemplate) =>
      of(makeTemplate({ ...t, id: 'created' })),
    ),
    updateEventTemplate: vi.fn((_id: string, t: EventTemplate) => of(t)),
    deleteEventTemplate: vi.fn(() => of({})),
  } satisfies ApiStub<EventTemplateService>;
}

/** A successful first load of template 'a', which also clears loading. */
function loadAlpha(
  service: EventTemplateDataService,
  api: ReturnType<typeof eventTemplateServiceStub>,
) {
  api.getEventTemplates.mockReturnValueOnce(
    of([makeTemplate({ id: 'a', name: 'Alpha' })]),
  );
  service.loadTemplates();
}

function setup() {
  const api = eventTemplateServiceStub();
  TestBed.configureTestingModule({
    providers: [{ provide: EventTemplateService, useValue: api }],
  });
  return {
    service: TestBed.inject(EventTemplateDataService),
    query: TestBed.inject(EventTemplateQuery),
    api,
  };
}

describe('EventTemplateDataService', () => {
  /**
   * Verifies: loadTemplates replaces the store contents with the API list and clears loading.
   * Interacts with: EventTemplateService.getEventTemplates, real EventTemplateStore/Query.
   * Data: a stale template in the store; the API returns two other templates.
   */
  it('loadTemplates replaces the store with the API list', () => {
    const { service, query, api } = setup();
    service.stateCreate(makeTemplate({ id: 'stale', name: 'Stale' }));
    api.getEventTemplates.mockReturnValueOnce(
      of([
        makeTemplate({ id: 'b', name: 'Bravo' }),
        makeTemplate({ id: 'a', name: 'Alpha' }),
      ]),
    );

    service.loadTemplates();

    expect(query.getAll().map((t) => t.id)).toEqual(['a', 'b']);
    expect(query.getValue().loading).toBe(false);
  });

  /**
   * Verifies: loadTemplate upserts one template without disturbing the others.
   * Interacts with: EventTemplateService.getEventTemplate, real EventTemplateQuery.
   * Data: one template already stored; another loaded by id.
   */
  it('loadTemplate adds a single template alongside existing ones', () => {
    const { service, query, api } = setup();
    service.stateCreate(makeTemplate({ id: 'a', name: 'Alpha' }));
    api.getEventTemplate.mockReturnValueOnce(
      of(makeTemplate({ id: 'b', name: 'Bravo' })),
    );

    service.loadTemplate('b');

    expect(api.getEventTemplate).toHaveBeenCalledWith('b');
    expect(query.getAll().map((t) => t.id)).toEqual(['a', 'b']);
  });

  /**
   * Verifies: addNew posts the template and stores the server's copy (with its id).
   * Interacts with: EventTemplateService.createEventTemplate, real EventTemplateQuery, recordEmissions.
   * Data: a new template without an id; the server assigns 'created'.
   */
  it('addNew stores the created template', async () => {
    const { service, query, api } = setup();
    const seen = recordEmissions(query.selectAll());

    const created = await firstValueFrom(service.addNew({ name: 'New' }));

    expect(api.createEventTemplate).toHaveBeenCalledWith({ name: 'New' });
    expect(created.id).toBe('created');
    expect(seen.map((list) => list.map((t) => t.id))).toEqual([
      [],
      ['created'],
    ]);
  });

  /**
   * Verifies: update stores the server's copy of a saved template.
   * Interacts with: EventTemplateService.updateEventTemplate, real EventTemplateQuery.
   * Data: a stored template renamed from Before to After.
   */
  it('update stores the saved template', async () => {
    const { service, query, api } = setup();
    service.stateCreate(makeTemplate({ id: 't', name: 'Before' }));

    await firstValueFrom(
      service.update(makeTemplate({ id: 't', name: 'After' })),
    );

    expect(api.updateEventTemplate).toHaveBeenCalledWith(
      't',
      expect.objectContaining({ name: 'After' }),
    );
    expect(query.getEntity('t').name).toBe('After');
  });

  /**
   * Verifies: a rejected save errors to the caller and leaves the stored template unchanged.
   * Interacts with: EventTemplateService.updateEventTemplate (error), real EventTemplateQuery.
   * Data: the API refuses the save with a 400 (e.g. a Player View with no default team).
   * Why: update() returns the request precisely so callers can tell a rejected save from a successful one.
   */
  it('update leaves the store unchanged when the API rejects the save', async () => {
    const { service, query, api } = setup();
    service.stateCreate(makeTemplate({ id: 't', name: 'Before' }));
    api.updateEventTemplate.mockReturnValueOnce(
      throwError(() => ({ status: 400 })),
    );

    await expect(
      firstValueFrom(service.update(makeTemplate({ id: 't', name: 'After' }))),
    ).rejects.toEqual({ status: 400 });
    expect(query.getEntity('t').name).toBe('Before');
  });

  /**
   * Verifies: delete removes the template from the store once the API confirms.
   * Interacts with: EventTemplateService.deleteEventTemplate, real EventTemplateQuery.
   * Data: one stored template.
   */
  it('delete removes the template after the API confirms', () => {
    const { service, query, api } = setup();
    service.stateCreate(makeTemplate({ id: 't' }));

    service.delete('t');

    expect(api.deleteEventTemplate).toHaveBeenCalledWith('t');
    expect(query.hasEntity('t')).toBe(false);
  });

  /**
   * Verifies: a failed request in each method that subscribes internally leaves the store as it was and lets the error escape as an unhandled RxJS error; a failed first loadTemplates() also leaves loading set (current behavior).
   * Interacts with: EventTemplateService.getEventTemplates / getEventTemplate / deleteEventTemplate (error), real EventTemplateStore/Query, captureUnhandledRxErrors.
   * Data: per row, the store either fresh (loading still true, as before the first load) or holding template 'a' from a successful load; then one failing request.
   * Why: these methods subscribe themselves, so RxJS reports the failure from a timer; flush() lets that report run before asserting.
   */
  it.each<{
    method: string;
    seed: (
      service: EventTemplateDataService,
      api: ReturnType<typeof eventTemplateServiceStub>,
    ) => void;
    fail: (
      api: ReturnType<typeof eventTemplateServiceStub>,
      failure: unknown,
    ) => void;
    call: (service: EventTemplateDataService) => void;
    failure: { status: number };
    ids: string[];
    loading: boolean;
  }>([
    {
      method: 'loadTemplates()',
      seed: () => undefined,
      fail: (api, failure) =>
        api.getEventTemplates.mockReturnValueOnce(throwError(() => failure)),
      call: (service) => service.loadTemplates(),
      failure: { status: 500 },
      ids: [],
      loading: true,
    },
    {
      method: 'loadTemplate()',
      seed: loadAlpha,
      fail: (api, failure) =>
        api.getEventTemplate.mockReturnValueOnce(throwError(() => failure)),
      call: (service) => service.loadTemplate('b'),
      failure: { status: 404 },
      ids: ['a'],
      loading: false,
    },
    {
      method: 'delete()',
      seed: loadAlpha,
      fail: (api, failure) =>
        api.deleteEventTemplate.mockReturnValueOnce(throwError(() => failure)),
      call: (service) => service.delete('a'),
      failure: { status: 403 },
      ids: ['a'],
      loading: false,
    },
  ])(
    '$method lets a failed request escape unhandled',
    async ({ seed, fail, call, failure, ids, loading }) => {
      const { service, query, api } = setup();
      const unhandled = captureUnhandledRxErrors();
      seed(service, api);
      fail(api, failure);

      call(service);
      await flush();

      expect(query.getAll().map((t) => t.id)).toEqual(ids);
      expect(query.getValue().loading).toBe(loading);
      expect(unhandled).toEqual([failure]);
    },
  );

  /**
   * Verifies: stateUpdate merges into a known template and ignores an unknown one.
   * Interacts with: EventTemplateDataService.stateUpdate (Akita update skips unknown ids), real EventTemplateQuery.
   * Data: template 't' stored; updates for 't' and for 'unknown'.
   */
  it('stateUpdate merges known templates and drops unknown ones', () => {
    const { service, query } = setup();
    service.stateCreate(
      makeTemplate({ id: 't', name: 'Before', durationHours: 2 }),
    );

    service.stateUpdate({ id: 't', name: 'After' });
    service.stateUpdate(makeTemplate({ id: 'unknown' }));

    expect(query.getEntity('t')).toMatchObject({
      name: 'After',
      durationHours: 2,
    });
    expect(query.hasEntity('unknown')).toBe(false);
  });
});
