// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { Group, GroupService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { GroupDataService } from './group-data.service';

function setup() {
  const api = {
    getAllGroups: vi.fn(() =>
      of<Group[]>([
        { id: 'g1', name: 'Blue' },
        { id: 'g2', name: 'Red' },
      ]),
    ),
    createGroup: vi.fn((g: Group) => of({ ...g, id: 'g3' })),
    updateGroup: vi.fn((_id: string, g: Group) => of(g)),
    deleteGroup: vi.fn(() => of({})),
  } satisfies ApiStub<GroupService>;
  TestBed.configureTestingModule({
    providers: [{ provide: GroupService, useValue: api }],
  });
  return { service: TestBed.inject(GroupDataService), api };
}

const names = (groups: Group[]) => groups.map((g) => g.name);

describe('GroupDataService', () => {
  /**
   * Verifies: load publishes the API's groups on groups$.
   * Interacts with: GroupService.getAllGroups, groups$, recordEmissions.
   * Data: two groups.
   */
  it('load publishes the groups', async () => {
    const { service } = setup();
    const seen = recordEmissions(service.groups$);

    await firstValueFrom(service.load());

    expect(seen.map(names)).toEqual([[], ['Blue', 'Red']]);
  });

  /**
   * Verifies: create appends, edit replaces by id, and delete removes the group.
   * Interacts with: GroupService.createGroup / updateGroup / deleteGroup, groups$.
   * Data: two loaded groups; Green created, Blue renamed Navy, Red deleted.
   */
  it('create, edit and delete keep groups$ current', async () => {
    const { service } = setup();
    await firstValueFrom(service.load());

    await firstValueFrom(service.create({ name: 'Green' }));
    await firstValueFrom(service.edit({ id: 'g1', name: 'Navy' }));
    await firstValueFrom(service.delete('g2'));

    expect(names(await firstValueFrom(service.groups$))).toEqual([
      'Navy',
      'Green',
    ]);
  });

  /**
   * Verifies: editing a group that was never loaded does not add it or re-emit.
   * Interacts with: GroupService.updateGroup, groups$, recordEmissions.
   * Data: an empty list and an edit for g9.
   */
  it('edit ignores a group that is not in the list', async () => {
    const { service } = setup();
    const seen = recordEmissions(service.groups$);

    await firstValueFrom(service.edit({ id: 'g9', name: 'Ghost' }));

    expect(seen).toEqual([[]]);
  });

  /**
   * Verifies: a failed delete errors to the caller and keeps the group.
   * Interacts with: GroupService.deleteGroup (error), groups$.
   * Data: two loaded groups; delete of g1 answers 403.
   */
  it('delete keeps the group when the API refuses', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.load());
    api.deleteGroup.mockReturnValueOnce(throwError(() => ({ status: 403 })));

    await expect(firstValueFrom(service.delete('g1'))).rejects.toEqual({
      status: 403,
    });
    expect(names(await firstValueFrom(service.groups$))).toEqual([
      'Blue',
      'Red',
    ]);
  });
});
