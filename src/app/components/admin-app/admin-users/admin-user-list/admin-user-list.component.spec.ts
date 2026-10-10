// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ClipboardModule } from 'ngx-clipboard';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  SystemRole,
  SystemRolesService,
  User,
  UserService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminUserListComponent } from './admin-user-list.component';

const users = (): User[] => [
  { id: 'u1', name: 'Alex Doe', roleId: 'r1' },
  { id: 'u2', name: 'Blair Roe', roleId: null },
];

async function renderUserList(
  canEdit: boolean,
  options: { confirm?: boolean } = {},
) {
  const rolesApi = {
    getAllSystemRoles: vi.fn(() =>
      of<SystemRole[]>([
        { id: 'r1', name: 'Administrator' },
        { id: 'r2', name: 'Observer' },
      ]),
    ),
  } satisfies ApiStub<SystemRolesService>;
  const userApi = {
    updateUser: vi.fn((id: string, u: User) => of<User>({ ...u, id })),
  } satisfies ApiStub<UserService>;
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(options.confirm).dialogRef,
  );
  const crucibleDialog: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const rendered = await renderComponent(AdminUserListComponent, {
    declarations: [AdminUserListComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      MatTooltipModule,
      ClipboardModule,
    ],
    providers: [
      { provide: SystemRolesService, useValue: rolesApi },
      { provide: UserService, useValue: userApi },
      { provide: CrucibleDialogService, useValue: crucibleDialog },
    ],
    inputs: { users: users(), isLoading: false, canEdit },
  });
  const created: User[] = [];
  const deleted: string[] = [];
  rendered.fixture.componentInstance.create.subscribe((u) => created.push(u));
  rendered.fixture.componentInstance.delete.subscribe((id) => deleted.push(id));
  return {
    ...rendered,
    user: userEvent.setup(),
    rolesApi,
    userApi,
    confirm,
    created,
    deleted,
  };
}

const table = () => screen.getByRole('table');
const rowOf = (name: string) =>
  within(table()).getByText(name).closest('tr') as HTMLElement;

describe('AdminUserListComponent', () => {
  /**
   * Verifies: the users are listed with their local role selected, and the system roles are loaded for the select.
   * Interacts with: users input, SystemRolesService.getAllSystemRoles through the real RoleDataService, the row selects (MatSelectHarness).
   * Data: Alex Doe (Administrator) and Blair Roe (no role); canEdit false.
   */
  it('lists the users with their roles', async () => {
    const { rolesApi, fixture } = await renderUserList(false);
    // One role select per table row, in row order: Alex Doe, Blair Roe (the
    // paginator's page-size select sits outside the table). The harness
    // waits for the options to settle before reading the trigger.
    const [alex, blair] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));

    expect(rolesApi.getAllSystemRoles).toHaveBeenCalled();
    expect(await alex.getValueText()).toBe('Administrator');
    expect(await blair.getValueText()).toBe('None Locally');
  });

  /**
   * Verifies: with canEdit, Add User is enabled, the role select is enabled and each row has Delete User.
   * Interacts with: canEdit input, rendered header button, role selects and row buttons.
   * Data: two users; canEdit true.
   */
  it('enables Add, role changes and Delete with canEdit', async () => {
    await renderUserList(true);

    expect(
      within(table()).getByRole('button', { name: 'Add User' }),
    ).toBeEnabled();
    expect(within(rowOf('Alex Doe')).getByRole('combobox')).toHaveAttribute(
      'aria-disabled',
      'false',
    );
    expect(
      within(rowOf('Alex Doe')).getByRole('button', { name: 'Delete User' }),
    ).toBeEnabled();
  });

  /**
   * Verifies: without canEdit, Add User is disabled, the role selects are disabled and no Delete User button renders.
   * Interacts with: canEdit input, rendered header button, role selects and row buttons.
   * Data: two users; canEdit false (AdminUsersComponent passes false without system ManageUsers).
   */
  it('disables Add and role changes and hides Delete without canEdit', async () => {
    await renderUserList(false);

    expect(
      within(table()).getByRole('button', { name: 'Add User' }),
    ).toBeDisabled();
    for (const select of within(table()).getAllByRole('combobox')) {
      expect(select).toHaveAttribute('aria-disabled', 'true');
    }
    expect(
      within(table()).queryByRole('button', { name: 'Delete User' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: Add User opens the new-user row, the add button stays disabled until the name has four characters, and adding emits create with the id and name.
   * Interacts with: Add User button, User ID and User Name inputs (user-event click and type), create output.
   * Data: canEdit true; id 'u3', name 'Cas' then 'Casey'.
   */
  it('emits create from the new-user row', async () => {
    const { user, created } = await renderUserList(true);

    await user.click(within(table()).getByRole('button', { name: 'Add User' }));
    await user.type(screen.getByPlaceholderText('User ID'), 'u3');
    await user.type(screen.getByPlaceholderText('User Name'), 'Cas');
    // The tooltip sits on the icon, so the add button is the row's first.
    const [add] = within(
      screen
        .getByPlaceholderText('User ID')
        .closest('.new-user-row') as HTMLElement,
    ).getAllByRole('button');
    expect(add).toBeDisabled();
    await user.type(screen.getByPlaceholderText('User Name'), 'ey');
    await user.click(add);

    expect(created).toEqual([{ id: 'u3', name: 'Casey' }]);
    expect(screen.queryByPlaceholderText('User ID')).not.toBeInTheDocument();
  });

  /**
   * Verifies: Delete User asks for confirmation and emits delete only when confirmed.
   * Interacts with: Delete User button (user-event click), CrucibleDialogService.confirm (answers per row), delete output.
   * Data: canEdit true; Blair Roe; confirm answers true, then false.
   */
  it.each([
    { answer: true, expected: ['u2'] },
    { answer: false, expected: [] },
  ])(
    'emits delete only when confirmed (answer $answer)',
    async ({ answer, expected }) => {
      const { user, confirm, deleted } = await renderUserList(true, {
        confirm: answer,
      });

      await user.click(
        within(rowOf('Blair Roe')).getByRole('button', { name: 'Delete User' }),
      );

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Delete Blair Roe?', message: 'u2' }),
      );
      expect(deleted).toEqual(expected);
    },
  );

  /**
   * Verifies: choosing a role sends the user with that roleId, and None Locally sends a null roleId.
   * Interacts with: the role mat-selects (MatSelectHarness), real UserDataService.update, UserService.updateUser.
   * Data: canEdit true; Blair Roe gets Observer; Alex Doe gets None Locally.
   */
  it('saves the chosen role through the user service', async () => {
    const { fixture, userApi } = await renderUserList(true);
    // One role select per table row, in row order: Alex Doe, Blair Roe (the
    // paginator's page-size select sits outside the table).
    const [alex, blair] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));

    await blair.clickOptions({ text: 'Observer' });
    await alex.clickOptions({ text: 'None Locally' });

    expect(userApi.updateUser.mock.calls).toEqual([
      ['u2', { id: 'u2', name: 'Blair Roe', roleId: 'r2' }],
      ['u1', { id: 'u1', name: 'Alex Doe', roleId: null }],
    ]);
  });
});
