// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatSelectHarness } from '@angular/material/select/testing';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import {
  GroupMembership,
  GroupMembershipRole,
  User,
} from 'src/app/generated/alloy.api';
import { CurrentUserStore } from 'src/app/data/user/user.store';
import { CurrentUserBadgeComponent } from 'src/app/components/shared/current-user-badge/current-user-badge.component';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminGroupsMemberListComponent } from './admin-groups-member-list.component';

const users: User[] = [
  { id: 'u1', name: 'Alex Doe' },
  { id: 'u2', name: 'Blair Roe' },
];
const memberships: GroupMembership[] = [
  { id: 'm1', groupId: 'g1', userId: 'u1', role: 'Manager' },
  { id: 'm2', groupId: 'g1', userId: 'u2', role: 'Member' },
];

async function renderMemberList(
  canEdit: boolean,
  options: { confirmAnswer?: boolean } = {},
) {
  const confirm = vi.fn(
    () => dialogRefStub<unknown, boolean>(options.confirmAnswer).dialogRef,
  );
  const crucibleDialog: Pick<CrucibleDialogService, 'confirm'> = { confirm };
  const rendered = await renderComponent(AdminGroupsMemberListComponent, {
    declarations: [AdminGroupsMemberListComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      MatToolbarModule,
      CurrentUserBadgeComponent,
    ],
    providers: [
      { provide: CrucibleDialogService, useValue: crucibleDialog },
      // The real store, signed in as Alex Doe (u1).
      {
        provide: CurrentUserStore,
        useFactory: () => {
          const store = new CurrentUserStore();
          store.update({ name: 'Alex Doe', id: 'u1' });
          return store;
        },
      },
    ],
    inputs: { memberships, users, canEdit },
  });
  const deleted: { id: string; isCurrentUser: boolean }[] = [];
  const edited: {
    id: string;
    role: GroupMembershipRole;
    isCurrentUser: boolean;
  }[] = [];
  rendered.fixture.componentInstance.deleteMembership.subscribe((e) =>
    deleted.push(e),
  );
  rendered.fixture.componentInstance.editMembership.subscribe((e) =>
    edited.push(e),
  );
  return { ...rendered, user: userEvent.setup(), confirm, deleted, edited };
}

const rowOf = (name: string) =>
  within(screen.getByRole('table'))
    .getByText(name)
    .closest('tr') as HTMLElement;

describe('AdminGroupsMemberListComponent', () => {
  /**
   * Verifies: with canEdit, removing another member emits deleteMembership with isCurrentUser false and asks nothing.
   * Interacts with: canEdit input, the Remove button (user-event click), CrucibleDialogService.confirm spy, deleteMembership output.
   * Data: members Alex Doe (current user) and Blair Roe; canEdit true.
   */
  it('emits deleteMembership for another member with canEdit', async () => {
    const { user, deleted, confirm } = await renderMemberList(true);

    await user.click(screen.getByRole('button', { name: 'Remove Blair Roe' }));

    expect(deleted).toEqual([{ id: 'm2', isCurrentUser: false }]);
    expect(confirm).not.toHaveBeenCalled();
  });

  /**
   * Verifies: removing yourself asks for confirmation and emits only when confirmed.
   * Interacts with: the Remove button (user-event click), CrucibleDialogService.confirm (answers per row), real CurrentUserQuery, deleteMembership output.
   * Data: current user u1 (membership m1); confirm answers true, then false.
   */
  it.each([
    { answer: true, expected: [{ id: 'm1', isCurrentUser: true }] },
    { answer: false, expected: [] },
  ])(
    'confirms before removing yourself (answer $answer)',
    async ({ answer, expected }) => {
      const { user, deleted, confirm } = await renderMemberList(true, {
        confirmAnswer: answer,
      });

      await user.click(screen.getByRole('button', { name: 'Remove Alex Doe' }));

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Remove yourself from this group?' }),
      );
      expect(deleted).toEqual(expected);
    },
  );

  /**
   * Verifies: with canEdit, changing another member's role in the select emits editMembership.
   * Interacts with: the role mat-select (MatSelectHarness), editMembership output.
   * Data: Blair Roe is a Member; Manager chosen.
   */
  it('emits editMembership when a role is changed with canEdit', async () => {
    const { fixture, edited } = await renderMemberList(true);
    // One role select per table row, in row order: Alex Doe, Blair Roe (the
    // paginator's page-size select sits outside the table).
    const [, blair] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));

    await blair.clickOptions({ text: 'Manager' });

    expect(edited).toEqual([
      { id: 'm2', role: 'Manager', isCurrentUser: false },
    ]);
  });

  /**
   * Verifies: without canEdit the role is plain text and there is no role select and no Remove button.
   * Interacts with: canEdit input, displayedColumns, the role cell template.
   * Data: two members; canEdit false (the parent passes false without system ManageGroups or a ManageMembership claim on the group).
   */
  it('shows read-only roles and no Remove button without canEdit', async () => {
    await renderMemberList(false);

    const table = screen.getByRole('table');
    expect(within(rowOf('Blair Roe')).getByText('Member')).toBeInTheDocument();
    expect(within(table).queryByRole('combobox')).not.toBeInTheDocument();
    expect(
      within(table).queryByRole('button', { name: 'Remove Blair Roe' }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole('button', { name: 'Remove Alex Doe' }),
    ).not.toBeInTheDocument();
  });
});
