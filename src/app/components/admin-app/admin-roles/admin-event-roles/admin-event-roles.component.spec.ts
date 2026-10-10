// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen, within } from '@testing-library/angular';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventRole, EventRolesService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminEventRolesComponent } from './admin-event-roles.component';

async function renderEventRoles() {
  const rolesApi = {
    getAllEventRoles: vi.fn(() =>
      of<EventRole[]>([
        { id: 'r2', name: 'Observer', permissions: ['ViewEvent'] },
        { id: 'r1', name: 'Manager', allPermissions: true, permissions: [] },
      ]),
    ),
  } satisfies ApiStub<EventRolesService>;
  const rendered = await renderComponent(AdminEventRolesComponent, {
    declarations: [AdminEventRolesComponent],
    imports: [
      MatButtonModule,
      MatCheckboxModule,
      MatIconModule,
      MatTableModule,
      MatTooltipModule,
    ],
    providers: [{ provide: EventRolesService, useValue: rolesApi }],
  });
  return { ...rendered, rolesApi };
}

const checkboxesFor = (permission: string) =>
  within(
    within(screen.getByRole('table'))
      .getByText(permission)
      .closest('tr') as HTMLElement,
  ).getAllByRole('checkbox');

describe('AdminEventRolesComponent', () => {
  /**
   * Verifies: the event roles load into columns sorted by name, and each permission row shows the role's grants.
   * Interacts with: EventRolesService.getAllEventRoles, real EventRoleDataService, rendered table.
   * Data: Manager (all permissions) and Observer (ViewEvent).
   */
  it('shows each event role as a column with its permissions', async () => {
    const { rolesApi } = await renderEventRoles();

    expect(rolesApi.getAllEventRoles).toHaveBeenCalled();
    const headers = within(screen.getByRole('table'))
      .getAllByRole('columnheader')
      .map((h) => h.textContent?.trim());
    expect(headers).toEqual(['Permissions', 'Manager', 'Observer']);
    // Manager has allPermissions, so only the All row has its checkbox.
    expect(
      checkboxesFor('All').map((c) => (c as HTMLInputElement).checked),
    ).toEqual([true, false]);
    expect(
      checkboxesFor('ViewEvent').map((c) => (c as HTMLInputElement).checked),
    ).toEqual([true]);
    expect(
      checkboxesFor('ManageEvent').map((c) => (c as HTMLInputElement).checked),
    ).toEqual([false]);
  });

  /**
   * Verifies: the event-role matrix is read-only: every checkbox is disabled.
   * Interacts with: rendered checkbox inputs (the template sets disabled on every mat-checkbox).
   * Data: Manager and Observer.
   */
  it('renders every checkbox disabled', async () => {
    await renderEventRoles();

    const boxes = within(screen.getByRole('table')).getAllByRole('checkbox');
    expect(boxes.length).toBeGreaterThan(0);
    // The input itself, not jest-dom's toBeDisabled, which would also pass
    // through the static disabled attribute on the mat-checkbox host.
    expect(boxes.map((b) => (b as HTMLInputElement).disabled)).toEqual(
      boxes.map(() => true),
    );
  });
});
