// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  EventMembership,
  EventMembershipsService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { EventMembershipDataService } from './event-membership-data.service';

function membership(overrides: Partial<EventMembership> = {}): EventMembership {
  return {
    id: 'm1',
    eventId: 'event-1',
    userId: 'user-1',
    roleId: 'role-member',
    ...overrides,
  };
}

function setup() {
  const api = {
    getAllEventMemberships: vi.fn(() => of<EventMembership[]>([])),
    createEventMembership: vi.fn((_eventId: string, m: EventMembership) =>
      of({ ...m, id: 'created' }),
    ),
    updateEventMembership: vi.fn((_id: string, m: EventMembership) => of(m)),
    deleteEventMembership: vi.fn(() => of({})),
  } satisfies ApiStub<EventMembershipsService>;
  TestBed.configureTestingModule({
    providers: [{ provide: EventMembershipsService, useValue: api }],
  });
  return { service: TestBed.inject(EventMembershipDataService), api };
}

describe('EventMembershipDataService', () => {
  /**
   * Verifies: loadMemberships publishes the event's memberships on eventMemberships$.
   * Interacts with: EventMembershipsService.getAllEventMemberships, eventMemberships$, recordEmissions.
   * Data: two memberships for event-1.
   */
  it('loadMemberships publishes the API list', async () => {
    const { service, api } = setup();
    api.getAllEventMemberships.mockReturnValueOnce(
      of([membership({ id: 'a' }), membership({ id: 'b' })]),
    );
    const seen = recordEmissions(service.eventMemberships$);

    await firstValueFrom(service.loadMemberships('event-1'));

    expect(api.getAllEventMemberships).toHaveBeenCalledWith('event-1');
    expect(seen.map((list) => list.map((m) => m.id))).toEqual([[], ['a', 'b']]);
  });

  /**
   * Verifies: createMembership posts to the event and appends the server's copy.
   * Interacts with: EventMembershipsService.createEventMembership, eventMemberships$.
   * Data: a new membership with no id; the server assigns 'created'.
   */
  it('createMembership appends the created membership', async () => {
    const { service, api } = setup();

    await firstValueFrom(
      service.createMembership('event-1', membership({ id: undefined })),
    );

    expect(api.createEventMembership).toHaveBeenCalledWith(
      'event-1',
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(
      (await firstValueFrom(service.eventMemberships$)).map((m) => m.id),
    ).toEqual(['created']);
  });

  /**
   * Verifies: editMembership merges the server's copy into the existing membership.
   * Interacts with: EventMembershipsService.updateEventMembership, eventMemberships$.
   * Data: one loaded membership whose role changes from member to owner.
   */
  it('editMembership merges the saved role into the list', async () => {
    const { service, api } = setup();
    api.getAllEventMemberships.mockReturnValueOnce(
      of([membership({ id: 'a' })]),
    );
    await firstValueFrom(service.loadMemberships('event-1'));

    await firstValueFrom(
      service.editMembership(membership({ id: 'a', roleId: 'role-owner' })),
    );

    const [only] = await firstValueFrom(service.eventMemberships$);
    expect(only).toMatchObject({
      id: 'a',
      roleId: 'role-owner',
      userId: 'user-1',
    });
  });

  /**
   * Verifies: deleteMembership removes the membership after the API confirms, and keeps it if the API refuses.
   * Interacts with: EventMembershipsService.deleteEventMembership, eventMemberships$.
   * Data: two loaded memberships; one delete succeeds, a second fails with 403.
   */
  it('deleteMembership removes only on success', async () => {
    const { service, api } = setup();
    api.getAllEventMemberships.mockReturnValueOnce(
      of([membership({ id: 'a' }), membership({ id: 'b' })]),
    );
    await firstValueFrom(service.loadMemberships('event-1'));

    await firstValueFrom(service.deleteMembership('a'));
    api.deleteEventMembership.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );
    await expect(firstValueFrom(service.deleteMembership('b'))).rejects.toEqual(
      {
        status: 403,
      },
    );

    expect(
      (await firstValueFrom(service.eventMemberships$)).map((m) => m.id),
    ).toEqual(['b']);
  });

  /**
   * Verifies: the SignalR entry points upsert a new membership, merge an existing one, and remove by id.
   * Interacts with: updateStore / deleteFromStore (called by SignalRService), eventMemberships$, recordEmissions.
   * Data: a created membership, an update to its role, then its deletion.
   */
  it('updateStore and deleteFromStore keep the list in step with hub messages', () => {
    const { service } = setup();
    const seen = recordEmissions(service.eventMemberships$);

    service.updateStore(membership({ id: 'a', roleId: 'role-member' }));
    service.updateStore(membership({ id: 'a', roleId: 'role-owner' }));
    service.deleteFromStore('a');

    expect(seen.map((list) => list.map((m) => `${m.id}:${m.roleId}`))).toEqual([
      [],
      ['a:role-member'],
      ['a:role-owner'],
      [],
    ]);
  });

  /**
   * Verifies: upsert mutates the existing membership object and re-emits the same array instance.
   * Interacts with: EventMembershipDataService.upsert, eventMemberships$.
   * Data: one membership, then an upsert changing its role.
   * Why: consumers receive the same array and entry instances after an upsert; this pins that contract, so a change to it shows up here.
   */
  it('upsert updates in place and re-emits the same array', async () => {
    const { service } = setup();
    service.updateStore(membership({ id: 'a' }));
    const before = await firstValueFrom(service.eventMemberships$);
    const entry = before[0];

    service.upsert('a', { roleId: 'role-owner' });

    const after = await firstValueFrom(service.eventMemberships$);
    expect(after).toBe(before);
    expect(after[0]).toBe(entry);
    expect(entry.roleId).toBe('role-owner');
  });
});
