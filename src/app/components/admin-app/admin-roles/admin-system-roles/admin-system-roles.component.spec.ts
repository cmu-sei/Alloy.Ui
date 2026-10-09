// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { SystemRole, SystemRolesService } from 'src/app/generated/alloy.api';
import { NameDialogComponent } from 'src/app/shared/name-dialog/name-dialog.component';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminSystemRolesComponent } from './admin-system-roles.component';

const roles = (): SystemRole[] => [
  { id: 'r2', name: 'Observer', immutable: false, permissions: ['ViewEvents'] },
  {
    id: 'r1',
    name: 'Administrator',
    immutable: true,
    allPermissions: true,
    permissions: [],
  },
];

async function renderSystemRoles(
  grants: PermissionGrants,
  options: { nameResult?: { nameValue: string }; confirm?: boolean } = {},
) {
  const rolesApi = {
    getAllSystemRoles: vi.fn(() => of(roles())),
    updateSystemRole: vi.fn((id: string, r: SystemRole) =>
      of<SystemRole>({ ...r, id }),
    ),
    createSystemRole: vi.fn((r: SystemRole) =>
      of<SystemRole>({ ...r, id: 'r-new', permissions: [] }),
    ),
    deleteSystemRole: vi.fn(() => of({})),
  } satisfies ApiStub<SystemRolesService>;
  const signalR: Pick<SignalRService, 'startConnection'> = {
    startConnection: vi.fn(() => Promise.resolve()),
  };
  const nameDialog = dialogRefStub<NameDialogComponent, { nameValue: string }>(
    options.nameResult,
  );
  nameDialog.dialogRef.componentInstance = {
    title: '',
    message: '',
  } as NameDialogComponent;
  const dialog = { open: vi.fn(() => nameDialog.dialogRef) };
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(options.confirm).dialogRef,
  );
  const crucibleDialog: Pick<CrucibleDialogService, 'confirm'> = { confirm };

  const rendered = await renderComponent(AdminSystemRolesComponent, {
    declarations: [AdminSystemRolesComponent],
    imports: [
      MatButtonModule,
      MatCheckboxModule,
      MatIconModule,
      MatTableModule,
      MatTooltipModule,
    ],
    providers: [
      { provide: SystemRolesService, useValue: rolesApi },
      { provide: SignalRService, useValue: signalR },
      { provide: MatDialog, useValue: dialog as unknown as MatDialog },
      { provide: CrucibleDialogService, useValue: crucibleDialog },
      ...permissionDataProviders(grants),
    ],
  });
  return {
    ...rendered,
    user: userEvent.setup(),
    rolesApi,
    signalR,
    dialog,
    confirm,
  };
}

const table = () => screen.getByRole('table');
const addButton = () =>
  within(table()).getByRole('button', { description: 'Add New Role' });
/** The checkboxes of one permission row, in column order; a role with allPermissions has one only in the All row. Throws when the row has none. */
const checkboxesFor = (permission: string): HTMLElement[] =>
  within(
    within(table()).getByText(permission).closest('tr') as HTMLElement,
  ).getAllByRole('checkbox');

describe('AdminSystemRolesComponent', () => {
  /**
   * Verifies: the roles load into columns (immutable first), each permission row shows the role's grants, and the hub connection is started.
   * Interacts with: SystemRolesService.getAllSystemRoles, real RoleDataService, SignalRService.startConnection, rendered table.
   * Data: Administrator (immutable, all permissions) and Observer (ViewEvents).
   */
  it('shows each role as a column with its permissions', async () => {
    const { signalR } = await renderSystemRoles({ system: ['ViewRoles'] });

    const headers = within(table())
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.trim());
    expect(headers).toEqual(['Permissions', 'Administrator', 'Observer']);
    // Administrator has allPermissions, so only the All row has its checkbox.
    expect(checkboxesFor('ViewEvents')).toHaveLength(1);
    expect(checkboxesFor('ViewEvents')[0]).toBeChecked();
    expect(checkboxesFor('ViewUsers')[0]).not.toBeChecked();
    expect(signalR.startConnection).toHaveBeenCalled();
  });

  /**
   * Verifies: with system ManageRoles, Add is enabled, a mutable role has Rename and Delete and enabled checkboxes, and an immutable role's checkboxes stay disabled.
   * Interacts with: real PermissionDataService.hasPermission(ManageRoles) (canEdit), rendered header buttons and checkboxes.
   * Data: Administrator (immutable), Observer (mutable); system ManageRoles.
   */
  it('enables role editing with ManageRoles', async () => {
    await renderSystemRoles({ system: ['ManageRoles'] });

    expect(addButton()).toBeEnabled();
    expect(
      within(table()).getAllByRole('button', { name: 'Rename Role' }),
    ).toHaveLength(1);
    expect(
      within(table()).getAllByRole('button', { name: 'Delete Role' }),
    ).toHaveLength(1);
    const [adminAll, observerAll] = checkboxesFor('All');
    expect(adminAll).toBeDisabled();
    expect(observerAll).toBeEnabled();
  });

  /**
   * Verifies: without system ManageRoles, Add is disabled, no Rename or Delete renders, and every checkbox is disabled.
   * Interacts with: real PermissionDataService.hasPermission(ManageRoles) (canEdit), rendered header buttons and checkboxes.
   * Data: near misses: system ViewRoles; ManageUsers and ManageGroups (other Manage permissions).
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ViewRoles', grants: { system: ['ViewRoles'] } },
    {
      label: 'ManageUsers and ManageGroups',
      grants: { system: ['ViewRoles', 'ManageUsers', 'ManageGroups'] },
    },
  ])('makes the roles read-only with $label', async ({ grants }) => {
    await renderSystemRoles(grants);

    expect(addButton()).toBeDisabled();
    expect(
      within(table()).queryByRole('button', { name: 'Rename Role' }),
    ).not.toBeInTheDocument();
    expect(
      within(table()).queryByRole('button', { name: 'Delete Role' }),
    ).not.toBeInTheDocument();
    for (const box of checkboxesFor('ViewUsers')) expect(box).toBeDisabled();
    for (const box of checkboxesFor('All')) expect(box).toBeDisabled();
  });

  /**
   * Verifies: checking a permission on a mutable role saves the role with that permission added.
   * Interacts with: the Observer checkbox in the ViewUsers row (user-event click), RoleDataService.editRole, SystemRolesService.updateSystemRole.
   * Data: system ManageRoles; Observer holds ViewEvents.
   */
  it('adds a permission to a role when its checkbox is checked', async () => {
    const { user, rolesApi } = await renderSystemRoles({
      system: ['ManageRoles'],
    });

    // Administrator has allPermissions, so Observer's is the row's only checkbox.
    await user.click(checkboxesFor('ViewUsers')[0]);

    expect(rolesApi.updateSystemRole).toHaveBeenCalledWith(
      'r2',
      expect.objectContaining({ permissions: ['ViewEvents', 'ViewUsers'] }),
    );
  });

  /**
   * Verifies: Add opens the name dialog and creates a role with the entered name, which becomes a new column.
   * Interacts with: the Add button (user-event click), MatDialog.open stub (closes with a name), SystemRolesService.createSystemRole.
   * Data: system ManageRoles; name 'Auditor'.
   */
  it('creates a role from the name dialog', async () => {
    const { user, rolesApi, dialog, fixture } = await renderSystemRoles(
      { system: ['ManageRoles'] },
      { nameResult: { nameValue: 'Auditor' } },
    );

    await user.click(addButton());
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledWith(
      NameDialogComponent,
      expect.objectContaining({ data: { nameValue: '' } }),
    );
    expect(rolesApi.createSystemRole).toHaveBeenCalledWith({ name: 'Auditor' });
    expect(
      within(table()).getByRole('columnheader', { name: /Auditor/ }),
    ).toBeInTheDocument();
  });

  /**
   * Verifies: Delete asks for confirmation and deletes the role only when confirmed, and its column leaves the table only then.
   * Interacts with: the Delete Role button (user-event click), CrucibleDialogService.confirm (answers per row), SystemRolesService.deleteSystemRole, real RoleDataService.
   * Data: system ManageRoles; Observer; confirm answers true, then false.
   */
  it.each([
    {
      answer: true,
      calls: [['r2']],
      headers: ['Permissions', 'Administrator'],
    },
    {
      answer: false,
      calls: [],
      headers: ['Permissions', 'Administrator', 'Observer'],
    },
  ])(
    'deletes a role only when confirmed (answer $answer)',
    async ({ answer, calls, headers }) => {
      const { user, rolesApi, confirm, fixture } = await renderSystemRoles(
        { system: ['ManageRoles'] },
        { confirm: answer },
      );

      await user.click(
        within(table()).getByRole('button', { name: 'Delete Role' }),
      );

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Are you sure you want to delete Observer?',
        }),
      );
      expect(rolesApi.deleteSystemRole.mock.calls).toEqual(calls);
      fixture.detectChanges();
      expect(
        within(table())
          .getAllByRole('columnheader')
          .map((h) => h.textContent?.trim()),
      ).toEqual(headers);
    },
  );
});
