// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { GroupMembership, GroupService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { GroupMembershipService } from './group-membership.service';

function membership(overrides: Partial<GroupMembership> = {}): GroupMembership {
  return {
    id: 'm1',
    groupId: 'group-1',
    userId: 'user-1',
    role: 'Member',
    ...overrides,
  };
}

function setup() {
  const api = {
    getGroupMemberships: vi.fn(() => of<GroupMembership[]>([])),
    createGroupMembership: vi.fn((_groupId: string, m: GroupMembership) =>
      of({ ...m, id: 'created' }),
    ),
    editGroupMembership: vi.fn((_id: string, m: GroupMembership) => of(m)),
    deleteGroupMembership: vi.fn(() => of({})),
  } satisfies ApiStub<GroupService>;
  TestBed.configureTestingModule({
    providers: [{ provide: GroupService, useValue: api }],
  });
  return { service: TestBed.inject(GroupMembershipService), api };
}

describe('GroupMembershipService', () => {
  /**
   * Verifies: selectMemberships only emits the memberships of the requested group.
   * Interacts with: updateStore, selectMemberships.
   * Data: memberships in group-1 and group-2.
   */
  it('selectMemberships filters by group', async () => {
    const { service } = setup();
    service.updateStore(membership({ id: 'a', groupId: 'group-1' }));
    service.updateStore(membership({ id: 'b', groupId: 'group-2' }));

    const inGroup1 = await firstValueFrom(service.selectMemberships('group-1'));

    expect(inGroup1.map((m) => m.id)).toEqual(['a']);
  });

  /**
   * Verifies: loadMemberships merges into memberships already held (other groups, and entries the API no longer returns).
   * Interacts with: GroupService.getGroupMemberships, groupMemberships$.
   * Data: held memberships 'other' (group-2) and 'stale' (group-1); the API returns an updated 'a' and new 'b' for group-1.
   * Why: memberships of every group share one subject, so a load cannot replace the list; it only adds and overwrites.
   */
  it('loadMemberships merges rather than replaces', async () => {
    const { service, api } = setup();
    service.updateStore(membership({ id: 'other', groupId: 'group-2' }));
    service.updateStore(membership({ id: 'stale', groupId: 'group-1' }));
    service.updateStore(membership({ id: 'a', role: 'Member' }));
    api.getGroupMemberships.mockReturnValueOnce(
      of([membership({ id: 'a', role: 'Manager' }), membership({ id: 'b' })]),
    );

    await firstValueFrom(service.loadMemberships('group-1'));

    const all = await firstValueFrom(service.groupMemberships$);
    expect(all.map((m) => `${m.id}:${m.role}`)).toEqual([
      'other:Member',
      'stale:Member',
      'a:Manager',
      'b:Member',
    ]);
  });

  /**
   * Verifies: createMembership defaults a missing role to Member before posting.
   * Interacts with: GroupService.createGroupMembership, groupMemberships$.
   * Data: a membership with no role.
   */
  it('createMembership defaults the role to Member', async () => {
    const { service, api } = setup();

    await firstValueFrom(
      service.createMembership('group-1', { groupId: 'group-1', userId: 'u2' }),
    );

    expect(api.createGroupMembership).toHaveBeenCalledWith(
      'group-1',
      expect.objectContaining({ role: 'Member' }),
    );
    expect(
      (await firstValueFrom(service.groupMemberships$)).map((m) => m.id),
    ).toEqual(['created']);
  });

  /**
   * Verifies: createMembership keeps an explicit role.
   * Interacts with: GroupService.createGroupMembership.
   * Data: a membership with role Manager.
   */
  it('createMembership keeps an explicit role', async () => {
    const { service, api } = setup();

    await firstValueFrom(
      service.createMembership(
        'group-1',
        membership({ id: undefined, role: 'Manager' }),
      ),
    );

    expect(api.createGroupMembership).toHaveBeenCalledWith(
      'group-1',
      expect.objectContaining({ role: 'Manager' }),
    );
  });

  /**
   * Verifies: editMembership and deleteMembership update and remove the held membership.
   * Interacts with: GroupService.editGroupMembership / deleteGroupMembership, groupMemberships$, recordEmissions.
   * Data: one membership promoted to Manager, then deleted.
   */
  it('editMembership and deleteMembership keep the list current', async () => {
    const { service } = setup();
    service.updateStore(membership({ id: 'a' }));
    const seen = recordEmissions(service.groupMemberships$);

    await firstValueFrom(
      service.editMembership('a', membership({ id: 'a', role: 'Manager' })),
    );
    await firstValueFrom(service.deleteMembership('a'));

    expect(seen.map((list) => list.map((m) => `${m.id}:${m.role}`))).toEqual([
      ['a:Member'],
      ['a:Manager'],
      [],
    ]);
  });

  /**
   * Verifies: a failed loadMemberships errors to the caller and keeps the memberships already held.
   * Interacts with: GroupService.getGroupMemberships (error), groupMemberships$.
   * Data: one held membership; the load answers 403.
   */
  it('loadMemberships keeps the held list when the request fails', async () => {
    const { service, api } = setup();
    service.updateStore(membership({ id: 'a' }));
    api.getGroupMemberships.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );

    await expect(
      firstValueFrom(service.loadMemberships('group-1')),
    ).rejects.toEqual({ status: 403 });

    expect(
      (await firstValueFrom(service.groupMemberships$)).map((m) => m.id),
    ).toEqual(['a']);
  });

  /**
   * Verifies: a refused createMembership errors to the caller and adds nothing.
   * Interacts with: GroupService.createGroupMembership (error), groupMemberships$.
   * Data: an empty list; the create answers 409.
   */
  it('createMembership adds nothing on refusal', async () => {
    const { service, api } = setup();
    api.createGroupMembership.mockReturnValueOnce(
      throwError(() => ({ status: 409 })),
    );

    await expect(
      firstValueFrom(
        service.createMembership('group-1', membership({ id: undefined })),
      ),
    ).rejects.toEqual({ status: 409 });

    expect(await firstValueFrom(service.groupMemberships$)).toEqual([]);
  });

  /**
   * Verifies: refused editMembership and deleteMembership calls error to the caller and keep the held membership as it was.
   * Interacts with: GroupService.editGroupMembership / deleteGroupMembership (errors), groupMemberships$.
   * Data: membership 'a' as Member; the promotion and the delete both answer 403.
   */
  it('editMembership and deleteMembership keep the membership on refusal', async () => {
    const { service, api } = setup();
    service.updateStore(membership({ id: 'a' }));
    api.editGroupMembership.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );
    api.deleteGroupMembership.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );

    await expect(
      firstValueFrom(
        service.editMembership('a', membership({ id: 'a', role: 'Manager' })),
      ),
    ).rejects.toEqual({ status: 403 });
    await expect(firstValueFrom(service.deleteMembership('a'))).rejects.toEqual(
      { status: 403 },
    );

    expect(
      (await firstValueFrom(service.groupMemberships$)).map(
        (m) => `${m.id}:${m.role}`,
      ),
    ).toEqual(['a:Member']);
  });

  /**
   * Verifies: deleteFromStore (the GroupMembershipDeleted hub handler) removes by id.
   * Interacts with: deleteFromStore, groupMemberships$.
   * Data: two memberships, one removed.
   */
  it('deleteFromStore removes a membership', async () => {
    const { service } = setup();
    service.updateStore(membership({ id: 'a' }));
    service.updateStore(membership({ id: 'b' }));

    service.deleteFromStore('a');

    expect(
      (await firstValueFrom(service.groupMemberships$)).map((m) => m.id),
    ).toEqual(['b']);
  });
});
