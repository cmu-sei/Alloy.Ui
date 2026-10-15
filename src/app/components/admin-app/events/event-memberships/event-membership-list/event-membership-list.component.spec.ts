// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ClipboardModule } from 'ngx-clipboard';
import { EventMembership, Group, User } from 'src/app/generated/alloy.api';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventMembershipListComponent } from './event-membership-list.component';

const users: User[] = [{ id: 'u1', name: 'Alex Doe' }];
const groups: Group[] = [{ id: 'g1', name: 'Blue Team' }];

async function renderMembershipList(canEdit: boolean) {
  const rendered = await renderComponent(EventMembershipListComponent, {
    declarations: [EventMembershipListComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatSortModule,
      MatTableModule,
      MatToolbarModule,
      ClipboardModule,
    ],
    inputs: { users, groups, canEdit },
  });
  const created: EventMembership[] = [];
  rendered.fixture.componentInstance.createMembership.subscribe((m) =>
    created.push(m),
  );
  return { ...rendered, user: userEvent.setup(), created };
}

const table = () => screen.getByRole('table');
const rowOf = (name: string) =>
  within(table()).getByText(name).closest('tr') as HTMLElement;

describe('EventMembershipListComponent', () => {
  /**
   * Verifies: with canEdit, Add on a user row emits a user membership and on a group row a group membership.
   * Interacts with: canEdit input, Add buttons (user-event click), createMembership output.
   * Data: Alex Doe (User) and Blue Team (Group); canEdit true.
   */
  it('emits a user or group membership from Add with canEdit', async () => {
    const { user, created } = await renderMembershipList(true);

    await user.click(
      within(rowOf('Alex Doe')).getByRole('button', { name: 'Add' }),
    );
    await user.click(
      within(rowOf('Blue Team')).getByRole('button', { name: 'Add' }),
    );

    expect(created).toEqual([{ userId: 'u1' }, { groupId: 'g1' }]);
  });

  /**
   * Verifies: without canEdit the users and groups are listed but no Add button renders.
   * Interacts with: canEdit input, displayedColumns, rendered table.
   * Data: Alex Doe and Blue Team; canEdit false (the memberships component passes false without EditEvent rights).
   */
  it('hides Add without canEdit', async () => {
    await renderMembershipList(false);

    expect(within(rowOf('Alex Doe')).getByText('User')).toBeInTheDocument();
    expect(within(rowOf('Blue Team')).getByText('Group')).toBeInTheDocument();
    expect(
      within(table()).queryByRole('button', { name: 'Add' }),
    ).not.toBeInTheDocument();
  });
});
