// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  EventTemplateMembership,
  EventTemplateMembershipsService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { EventTemplateMembershipDataService } from './event-template-membership-data.service';

function membership(
  overrides: Partial<EventTemplateMembership> = {},
): EventTemplateMembership {
  return {
    id: 'm1',
    eventTemplateId: 'template-1',
    userId: 'user-1',
    roleId: 'role-member',
    ...overrides,
  };
}

function setup() {
  const api = {
    getAllEventTemplateMemberships: vi.fn(() =>
      of<EventTemplateMembership[]>([]),
    ),
    createEventTemplateMembership: vi.fn(
      (_templateId: string, m: EventTemplateMembership) =>
        of({ ...m, id: 'created' }),
    ),
    updateEventTemplateMembership: vi.fn(
      (_id: string, m: EventTemplateMembership) => of(m),
    ),
    deleteEventTemplateMembership: vi.fn(() => of({})),
  } satisfies ApiStub<EventTemplateMembershipsService>;
  TestBed.configureTestingModule({
    providers: [{ provide: EventTemplateMembershipsService, useValue: api }],
  });
  return { service: TestBed.inject(EventTemplateMembershipDataService), api };
}

describe('EventTemplateMembershipDataService', () => {
  /**
   * Verifies: loadMemberships publishes the template's memberships.
   * Interacts with: EventTemplateMembershipsService.getAllEventTemplateMemberships, eventTemplateMemberships$.
   * Data: one membership for template-1.
   */
  it('loadMemberships publishes the API list', async () => {
    const { service, api } = setup();
    api.getAllEventTemplateMemberships.mockReturnValueOnce(
      of([membership({ id: 'a' })]),
    );

    await firstValueFrom(service.loadMemberships('template-1'));

    expect(api.getAllEventTemplateMemberships).toHaveBeenCalledWith(
      'template-1',
    );
    expect(
      (await firstValueFrom(service.eventTemplateMemberships$)).map(
        (m) => m.id,
      ),
    ).toEqual(['a']);
  });

  /**
   * Verifies: create, edit and delete keep the published list in step with the API responses.
   * Interacts with: EventTemplateMembershipsService create/update/delete, eventTemplateMemberships$, recordEmissions.
   * Data: a membership created, its role edited, then deleted.
   */
  it('create, edit and delete update the list', async () => {
    const { service } = setup();
    const seen = recordEmissions(service.eventTemplateMemberships$);

    await firstValueFrom(
      service.createMembership('template-1', membership({ id: undefined })),
    );
    await firstValueFrom(
      service.editMembership(
        membership({ id: 'created', roleId: 'role-owner' }),
      ),
    );
    await firstValueFrom(service.deleteMembership('created'));

    expect(seen.map((list) => list.map((m) => `${m.id}:${m.roleId}`))).toEqual([
      [],
      ['created:role-member'],
      ['created:role-owner'],
      [],
    ]);
  });

  /**
   * Verifies: a refused delete errors to the caller and keeps the membership.
   * Interacts with: EventTemplateMembershipsService.deleteEventTemplateMembership (error).
   * Data: one membership; the API answers 403.
   */
  it('deleteMembership keeps the membership when the API refuses', async () => {
    const { service, api } = setup();
    service.updateStore(membership({ id: 'a' }));
    api.deleteEventTemplateMembership.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );

    await expect(firstValueFrom(service.deleteMembership('a'))).rejects.toEqual(
      {
        status: 403,
      },
    );
    expect(
      (await firstValueFrom(service.eventTemplateMemberships$)).map(
        (m) => m.id,
      ),
    ).toEqual(['a']);
  });

  /**
   * Verifies: the SignalR entry points upsert and remove memberships by id.
   * Interacts with: updateStore / deleteFromStore (called by SignalRService).
   * Data: two memberships pushed, one deleted.
   */
  it('updateStore and deleteFromStore follow hub messages', async () => {
    const { service } = setup();

    service.updateStore(membership({ id: 'a' }));
    service.updateStore(membership({ id: 'b' }));
    service.deleteFromStore('a');

    expect(
      (await firstValueFrom(service.eventTemplateMemberships$)).map(
        (m) => m.id,
      ),
    ).toEqual(['b']);
  });
});
