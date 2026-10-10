// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
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
import {
  EventTemplateMembership,
  EventTemplateRole,
  Group,
  User,
} from 'src/app/generated/alloy.api';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateMemberListComponent } from './event-template-member-list.component';

const users: User[] = [{ id: 'u1', name: 'Alex Doe' }];
const groups: Group[] = [{ id: 'g1', name: 'Blue Team' }];
const roles: EventTemplateRole[] = [
  { id: 'r1', name: 'Member' },
  { id: 'r2', name: 'Manager' },
];
const memberships: EventTemplateMembership[] = [
  { id: 'm1', eventTemplateId: 't1', userId: 'u1', roleId: 'r1' },
  { id: 'm2', eventTemplateId: 't1', groupId: 'g1', roleId: 'r2' },
];

async function renderMemberList(canEdit: boolean) {
  const rendered = await renderComponent(EventTemplateMemberListComponent, {
    declarations: [EventTemplateMemberListComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatSelectModule,
      MatSortModule,
      MatTableModule,
      MatToolbarModule,
    ],
    inputs: { memberships, users, groups, roles, canEdit },
  });
  await rendered.fixture.whenStable();
  rendered.fixture.detectChanges();
  const deleted: string[] = [];
  const edited: EventTemplateMembership[] = [];
  rendered.fixture.componentInstance.deleteMembership.subscribe((id) =>
    deleted.push(id),
  );
  rendered.fixture.componentInstance.editMembership.subscribe((m) =>
    edited.push(m),
  );
  return { ...rendered, user: userEvent.setup(), deleted, edited };
}

const table = () => screen.getByRole('table');
const rowOf = (name: string) =>
  within(table()).getByText(name).closest('tr') as HTMLElement;

describe('EventTemplateMemberListComponent', () => {
  /**
   * Verifies: user and group memberships are listed with their type and role.
   * Interacts with: memberships, users, groups and roles inputs; rendered table.
   * Data: Alex Doe (User, Member) and Blue Team (Group, Manager); canEdit false.
   */
  it('lists user and group members with their roles', async () => {
    await renderMemberList(false);

    expect(within(rowOf('Alex Doe')).getByText('User')).toBeInTheDocument();
    expect(within(rowOf('Alex Doe')).getByRole('combobox')).toHaveTextContent(
      'Member',
    );
    expect(within(rowOf('Blue Team')).getByText('Group')).toBeInTheDocument();
    expect(within(rowOf('Blue Team')).getByRole('combobox')).toHaveTextContent(
      'Manager',
    );
  });

  /**
   * Verifies: with canEdit, Remove emits deleteMembership and a role change emits editMembership.
   * Interacts with: canEdit input, Remove button (user-event click) and role mat-select (MatSelectHarness), deleteMembership and editMembership outputs.
   * Data: canEdit true; Blue Team removed; Alex Doe made Manager.
   */
  it('emits remove and role changes with canEdit', async () => {
    const rendered = await renderMemberList(true);
    const { user, deleted, edited } = rendered;

    const { fixture } = rendered;
    // One role select per table row, in row order: Alex Doe, Blue Team (the
    // paginator's page-size select sits outside the table).
    const [alex] = await TestbedHarnessEnvironment.loader(
      fixture,
    ).getAllHarnesses(MatSelectHarness.with({ ancestor: 'table' }));
    await alex.clickOptions({ text: 'Manager' });
    await user.click(
      within(rowOf('Blue Team')).getByRole('button', { name: 'Remove' }),
    );

    expect(deleted).toEqual(['m2']);
    expect(edited).toEqual([{ id: 'm1', roleId: 'r2' }]);
  });

  /**
   * Verifies: without canEdit the role selects are disabled and no Remove button renders.
   * Interacts with: canEdit input, displayedColumns, rendered selects and buttons.
   * Data: canEdit false (the memberships component passes false without EditEventTemplate rights).
   */
  it('disables roles and hides Remove without canEdit', async () => {
    await renderMemberList(false);

    for (const select of within(table()).getAllByRole('combobox')) {
      expect(select).toHaveAttribute('aria-disabled', 'true');
    }
    expect(
      within(table()).queryByRole('button', { name: 'Remove' }),
    ).not.toBeInTheDocument();
  });
});
