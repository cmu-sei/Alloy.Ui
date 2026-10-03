// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { EventRole, EventRolesService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { EventRoleDataService } from './event-role-data.service';

function setup() {
  const api = {
    getAllEventRoles: vi.fn(() =>
      of<EventRole[]>([
        { id: 'r1', name: 'Manager', allPermissions: true },
        { id: 'r2', name: 'Member', permissions: [] },
      ]),
    ),
  } satisfies ApiStub<EventRolesService>;
  TestBed.configureTestingModule({
    providers: [{ provide: EventRolesService, useValue: api }],
  });
  return { service: TestBed.inject(EventRoleDataService), api };
}

describe('EventRoleDataService', () => {
  /**
   * Verifies: loadRoles publishes the API's roles on eventRoles$, which starts empty.
   * Interacts with: EventRolesService.getAllEventRoles, eventRoles$, recordEmissions.
   * Data: two roles.
   */
  it('loadRoles publishes the roles', async () => {
    const { service } = setup();
    const seen = recordEmissions(service.eventRoles$);

    await firstValueFrom(service.loadRoles());

    expect(seen.map((roles) => roles.map((r) => r.name))).toEqual([
      [],
      ['Manager', 'Member'],
    ]);
  });

  /**
   * Verifies: a failed load errors to the caller and leaves eventRoles$ empty.
   * Interacts with: EventRolesService.getAllEventRoles (error), eventRoles$.
   * Data: the API answers 500.
   */
  it('loadRoles leaves the list empty when the request fails', async () => {
    const { service, api } = setup();
    api.getAllEventRoles.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    await expect(firstValueFrom(service.loadRoles())).rejects.toEqual({
      status: 500,
    });
    expect(await firstValueFrom(service.eventRoles$)).toEqual([]);
  });
});
