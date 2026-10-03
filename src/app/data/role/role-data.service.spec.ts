// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { SystemRole, SystemRolesService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { RoleDataService } from './role-data.service';

function setup() {
  const api = {
    getAllSystemRoles: vi.fn(() =>
      of<SystemRole[]>([
        { id: 'r1', name: 'Administrator', allPermissions: true },
        { id: 'r2', name: 'Content Developer', permissions: ['ViewEvents'] },
      ]),
    ),
    createSystemRole: vi.fn((r: SystemRole) => of({ ...r, id: 'r3' })),
    updateSystemRole: vi.fn((_id: string, r: SystemRole) => of(r)),
    deleteSystemRole: vi.fn(() => of({})),
  } satisfies ApiStub<SystemRolesService>;
  TestBed.configureTestingModule({
    providers: [{ provide: SystemRolesService, useValue: api }],
  });
  return { service: TestBed.inject(RoleDataService), api };
}

describe('RoleDataService', () => {
  /**
   * Verifies: getRoles publishes the system roles on roles$.
   * Interacts with: SystemRolesService.getAllSystemRoles, roles$.
   * Data: two roles.
   */
  it('getRoles publishes the roles', async () => {
    const { service } = setup();

    await firstValueFrom(service.getRoles());

    expect((await firstValueFrom(service.roles$)).map((r) => r.name)).toEqual([
      'Administrator',
      'Content Developer',
    ]);
  });

  /**
   * Verifies: createRole appends, editRole merges by the edited role's id, deleteRole removes.
   * Interacts with: SystemRolesService create/update/delete, roles$.
   * Data: two loaded roles; Observer created, Content Developer granted ViewUsers, Administrator deleted.
   */
  it('create, edit and delete keep roles$ current', async () => {
    const { service } = setup();
    await firstValueFrom(service.getRoles());

    await firstValueFrom(service.createRole({ name: 'Observer' }));
    await firstValueFrom(
      service.editRole({
        id: 'r2',
        name: 'Content Developer',
        permissions: ['ViewUsers'],
      }),
    );
    await firstValueFrom(service.deleteRole('r1'));

    const roles = await firstValueFrom(service.roles$);
    expect(roles.map((r) => [r.id, r.permissions ?? null])).toEqual([
      ['r2', ['ViewUsers']],
      ['r3', null],
    ]);
  });

  /**
   * Verifies: a refused edit errors to the caller and leaves the role as loaded.
   * Interacts with: SystemRolesService.updateSystemRole (error), roles$.
   * Data: the API answers 403 for an immutable role.
   */
  it('editRole leaves the role unchanged when the API refuses', async () => {
    const { service, api } = setup();
    await firstValueFrom(service.getRoles());
    api.updateSystemRole.mockReturnValueOnce(
      throwError(() => ({ status: 403 })),
    );

    await expect(
      firstValueFrom(service.editRole({ id: 'r1', name: 'Renamed' })),
    ).rejects.toEqual({ status: 403 });
    expect((await firstValueFrom(service.roles$))[0].name).toBe(
      'Administrator',
    );
  });
});
