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
import { User } from 'src/app/generated/alloy.api';
import { CurrentUserBadgeComponent } from 'src/app/components/shared/current-user-badge/current-user-badge.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminGroupsMembershipListComponent } from './admin-groups-membership-list.component';

const users: User[] = [
  { id: 'u1', name: 'Alex Doe' },
  { id: 'u2', name: 'Blair Roe' },
];

async function renderMembershipList(canEdit: boolean) {
  const rendered = await renderComponent(AdminGroupsMembershipListComponent, {
    declarations: [AdminGroupsMembershipListComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatSortModule,
      MatTableModule,
      MatToolbarModule,
      ClipboardModule,
      CurrentUserBadgeComponent,
    ],
    inputs: { users, canEdit },
  });
  return { ...rendered, user: userEvent.setup() };
}

describe('AdminGroupsMembershipListComponent', () => {
  /**
   * Verifies: with canEdit, each non-member row has an Add button that emits createMembership with that user's id.
   * Interacts with: canEdit input, the Add button (user-event click), createMembership output.
   * Data: two users; canEdit true.
   */
  it('emits createMembership from the Add button with canEdit', async () => {
    const { fixture, user } = await renderMembershipList(true);
    const emitted: string[] = [];
    fixture.componentInstance.createMembership.subscribe((id) =>
      emitted.push(id),
    );

    await user.click(screen.getByRole('button', { name: 'Add Blair Roe' }));

    expect(emitted).toEqual(['u2']);
  });

  /**
   * Verifies: without canEdit the actions column is left out, so no Add button renders, while the users are still listed.
   * Interacts with: canEdit input, displayedColumns, rendered table.
   * Data: two users; canEdit false (the parent passes false without system ManageGroups or a ManageMembership claim).
   */
  it('hides the Add buttons without canEdit', async () => {
    await renderMembershipList(false);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Alex Doe')).toBeInTheDocument();
    expect(
      within(table).queryByRole('button', { name: 'Add Alex Doe' }),
    ).not.toBeInTheDocument();
    expect(
      within(table).queryByRole('button', { name: 'Add Blair Roe' }),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: typing in Search narrows the rows to matching users.
   * Interacts with: the search input (user-event type, keyup), applyFilter.
   * Data: two users; search 'blair'.
   */
  it('narrows the rows with the search box', async () => {
    const { user } = await renderMembershipList(false);

    await user.type(screen.getByLabelText('Search'), 'blair');

    expect(screen.queryByText('Alex Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Blair Roe')).toBeInTheDocument();
  });
});
