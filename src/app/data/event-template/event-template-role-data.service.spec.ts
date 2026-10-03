// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  EventTemplateRole,
  EventTemplateRolesService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { EventTemplateRoleDataService } from './event-template-role-data.service';

function setup() {
  const api = {
    getAllEventTemplateRoles: vi.fn(() =>
      of<EventTemplateRole[]>([
        { id: 'r1', name: 'Manager', allPermissions: true },
        { id: 'r2', name: 'Member', permissions: [] },
      ]),
    ),
  } satisfies ApiStub<EventTemplateRolesService>;
  TestBed.configureTestingModule({
    providers: [{ provide: EventTemplateRolesService, useValue: api }],
  });
  return { service: TestBed.inject(EventTemplateRoleDataService), api };
}

describe('EventTemplateRoleDataService', () => {
  /**
   * Verifies: loadRoles publishes the API's roles on eventTemplateRoles$, which starts empty.
   * Interacts with: EventTemplateRolesService.getAllEventTemplateRoles, eventTemplateRoles$, recordEmissions.
   * Data: two roles.
   */
  it('loadRoles publishes the roles', async () => {
    const { service } = setup();
    const seen = recordEmissions(service.eventTemplateRoles$);

    await firstValueFrom(service.loadRoles());

    expect(seen.map((roles) => roles.map((r) => r.name))).toEqual([
      [],
      ['Manager', 'Member'],
    ]);
  });

  /**
   * Verifies: a failed load errors to the caller and leaves eventTemplateRoles$ empty.
   * Interacts with: EventTemplateRolesService.getAllEventTemplateRoles (error), eventTemplateRoles$.
   * Data: the API answers 500.
   */
  it('loadRoles leaves the list empty when the request fails', async () => {
    const { service, api } = setup();
    api.getAllEventTemplateRoles.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    await expect(firstValueFrom(service.loadRoles())).rejects.toEqual({
      status: 500,
    });
    expect(await firstValueFrom(service.eventTemplateRoles$)).toEqual([]);
  });
});
