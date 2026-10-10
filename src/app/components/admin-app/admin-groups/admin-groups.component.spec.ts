// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, Input } from '@angular/core';
import { By } from '@angular/platform-browser';
import { screen, within } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CrucibleDialogService } from '@cmusei/crucible-common';
import { Group, GroupService, UserService } from 'src/app/generated/alloy.api';
import { NameDialogComponent } from 'src/app/shared/name-dialog/name-dialog.component';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { dialogRefStub } from 'src/app/test-utils/dialog-refs';
import {
  PermissionGrants,
  permissionDataProviders,
} from 'src/app/test-utils/mock-permission-data.service';
import { renderComponent } from 'src/app/test-utils/render-component';
import { AdminGroupsComponent } from './admin-groups.component';

@Component({
  selector: 'app-admin-groups-detail',
  template: '',
  standalone: false,
})
class GroupsDetailStubComponent {
  @Input() groupId: string;
  @Input() canEdit: boolean;
}

const groups = (): Group[] => [
  { id: 'g1', name: 'Blue Team' },
  { id: 'g2', name: 'Red Team' },
];

async function renderGroups(
  grants: PermissionGrants,
  options: { nameResult?: { nameValue: string }; confirm?: boolean } = {},
) {
  const groupService = {
    getAllGroups: vi.fn(() => of(groups())),
    createGroup: vi.fn((g: Group) => of<Group>({ ...g, id: 'g-new' })),
    updateGroup: vi.fn((id: string, g: Group) => of<Group>({ ...g, id })),
    deleteGroup: vi.fn(() => of({})),
  } satisfies ApiStub<GroupService>;
  const userService = {
    getUsers: vi.fn(() => of([])),
  } satisfies ApiStub<UserService>;
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

  const rendered = await renderComponent(AdminGroupsComponent, {
    declarations: [AdminGroupsComponent, GroupsDetailStubComponent],
    imports: [
      MatButtonModule,
      MatIconModule,
      MatInputModule,
      MatSortModule,
      MatTableModule,
      MatTooltipModule,
    ],
    providers: [
      { provide: GroupService, useValue: groupService },
      { provide: UserService, useValue: userService },
      { provide: MatDialog, useValue: dialog as unknown as MatDialog },
      { provide: CrucibleDialogService, useValue: crucibleDialog },
      ...permissionDataProviders(grants),
    ],
  });
  return {
    ...rendered,
    user: userEvent.setup(),
    groupService,
    dialog,
    confirm,
    nameDialog,
  };
}

const table = () => screen.getByRole('table');
const rowOf = (name: string) =>
  within(table()).getByText(name).closest('tr') as HTMLElement;
// The buttons are icon buttons named by their tooltips (aria-describedby).
const addButton = () =>
  within(table()).getByRole('button', { description: 'Add New Group' });
const rowButton = (name: string, description: string) =>
  within(rowOf(name)).getByRole('button', { description });

describe('AdminGroupsComponent', () => {
  /**
   * Verifies: the groups from the API are listed.
   * Interacts with: GroupService.getAllGroups, UserService.getUsers, real GroupDataService, rendered table.
   * Data: two groups; system ViewGroups.
   */
  it('lists the groups', async () => {
    const { groupService } = await renderGroups({ system: ['ViewGroups'] });

    expect(groupService.getAllGroups).toHaveBeenCalled();
    expect(within(table()).getByText('Blue Team')).toBeInTheDocument();
    expect(within(table()).getByText('Red Team')).toBeInTheDocument();
  });

  /**
   * Verifies: system ManageGroups enables Add, Delete and Rename.
   * Interacts with: real PermissionDataService.hasPermission(ManageGroups) (canEdit), rendered buttons.
   * Data: two groups; system ManageGroups.
   */
  it('enables Add, Delete and Rename with ManageGroups', async () => {
    await renderGroups({ system: ['ManageGroups'] });

    expect(addButton()).toBeEnabled();
    expect(rowButton('Blue Team', 'Delete Blue Team')).toBeEnabled();
    expect(rowButton('Blue Team', 'Rename')).toBeEnabled();
  });

  /**
   * Verifies: without system ManageGroups, Add, Delete and Rename are disabled.
   * Interacts with: real PermissionDataService.hasPermission(ManageGroups) (canEdit), rendered buttons.
   * Data: near misses: system ViewGroups; a ManageMembership and EditGroup claim on g1 (group claims do not grant canEdit).
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ViewGroups', grants: { system: ['ViewGroups'] } },
    {
      label: 'ManageMembership and EditGroup on the group',
      grants: {
        groups: [
          { groupId: 'g1', permissions: ['ManageMembership', 'EditGroup'] },
        ],
      },
    },
  ])('disables Add, Delete and Rename with $label', async ({ grants }) => {
    await renderGroups(grants);

    expect(addButton()).toBeDisabled();
    expect(rowButton('Blue Team', 'Delete Blue Team')).toBeDisabled();
    expect(rowButton('Blue Team', 'Rename')).toBeDisabled();
  });

  /**
   * Verifies: the expanded group's detail gets canEdit true from system ManageGroups or a ManageMembership claim on that group.
   * Interacts with: row click (user-event), real PermissionDataService.canManageGroup, detail stub's canEdit input.
   * Data: groups g1 and g2; g1 expanded.
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ManageGroups', grants: { system: ['ManageGroups'] } },
    {
      label: 'a ManageMembership claim on the group',
      grants: {
        groups: [{ groupId: 'g1', permissions: ['ManageMembership'] }],
      },
    },
  ])('lets the detail edit members with $label', async ({ grants }) => {
    const { fixture, user } = await renderGroups(grants);

    await user.click(within(rowOf('Blue Team')).getByText('Blue Team'));

    const detail = fixture.debugElement.query(
      By.directive(GroupsDetailStubComponent),
    ).componentInstance as GroupsDetailStubComponent;
    expect(detail.groupId).toBe('g1');
    expect(detail.canEdit).toBe(true);
  });

  /**
   * Verifies: the expanded group's detail gets canEdit false without ManageGroups or a ManageMembership claim on that group.
   * Interacts with: row click (user-event), real PermissionDataService.canManageGroup, detail stub's canEdit input.
   * Data: near misses: system ViewGroups; ManageMembership on another group (g2); EditGroup on g1.
   */
  it.each<{ label: string; grants: PermissionGrants }>([
    { label: 'system ViewGroups', grants: { system: ['ViewGroups'] } },
    {
      label: 'ManageMembership on another group',
      grants: {
        groups: [{ groupId: 'g2', permissions: ['ManageMembership'] }],
      },
    },
    {
      label: 'EditGroup on the group',
      grants: { groups: [{ groupId: 'g1', permissions: ['EditGroup'] }] },
    },
  ])('makes the detail read-only with $label', async ({ grants }) => {
    const { fixture, user } = await renderGroups(grants);

    await user.click(within(rowOf('Blue Team')).getByText('Blue Team'));

    const detail = fixture.debugElement.query(
      By.directive(GroupsDetailStubComponent),
    ).componentInstance as GroupsDetailStubComponent;
    expect(detail.groupId).toBe('g1');
    expect(detail.canEdit).toBe(false);
  });

  /**
   * Verifies: Add opens the name dialog and creates a group with the entered name, which joins the list.
   * Interacts with: the Add button (user-event), MatDialog.open stub (closes with a name), GroupService.createGroup, real GroupDataService.
   * Data: system ManageGroups; name 'Green Team'.
   */
  it('creates a group from the name dialog', async () => {
    const { user, dialog, groupService, fixture } = await renderGroups(
      { system: ['ManageGroups'] },
      { nameResult: { nameValue: 'Green Team' } },
    );

    await user.click(addButton());
    fixture.detectChanges();

    expect(dialog.open).toHaveBeenCalledWith(
      NameDialogComponent,
      expect.objectContaining({ data: { nameValue: '' } }),
    );
    expect(groupService.createGroup).toHaveBeenCalledWith({
      name: 'Green Team',
    });
    expect(within(table()).getByText('Green Team')).toBeInTheDocument();
  });

  /**
   * Verifies: Rename opens the name dialog with the current name, saves the new one, and the row shows it.
   * Interacts with: the Rename button (user-event), MatDialog.open stub, GroupService.updateGroup, real GroupDataService.
   * Data: system ManageGroups; g1 renamed to 'Navy Team'.
   */
  it('renames a group from the name dialog', async () => {
    const { user, dialog, groupService, nameDialog, fixture } =
      await renderGroups(
        { system: ['ManageGroups'] },
        { nameResult: { nameValue: 'Navy Team' } },
      );

    await user.click(rowButton('Blue Team', 'Rename'));

    expect(dialog.open).toHaveBeenCalledWith(
      NameDialogComponent,
      expect.objectContaining({ data: { nameValue: 'Blue Team' } }),
    );
    expect(nameDialog.dialogRef.componentInstance.title).toBe(
      'Rename Blue Team',
    );
    expect(groupService.updateGroup).toHaveBeenCalledWith('g1', {
      id: 'g1',
      name: 'Navy Team',
    });
    fixture.detectChanges();
    expect(within(table()).getByText('Navy Team')).toBeInTheDocument();
    expect(within(table()).queryByText('Blue Team')).not.toBeInTheDocument();
  });

  /**
   * Verifies: Delete asks for confirmation and deletes only when confirmed, and the row leaves the list only then.
   * Interacts with: the Delete button (user-event), CrucibleDialogService.confirm (answers per row), GroupService.deleteGroup, real GroupDataService.
   * Data: system ManageGroups; confirm answers true, then false.
   */
  it.each([
    { answer: true, calls: [['g1']], names: ['Red Team'] },
    { answer: false, calls: [], names: ['Blue Team', 'Red Team'] },
  ])(
    'deletes a group only when confirmed (answer $answer)',
    async ({ answer, calls, names }) => {
      const { user, confirm, groupService, fixture } = await renderGroups(
        { system: ['ManageGroups'] },
        { confirm: answer },
      );

      await user.click(rowButton('Blue Team', 'Delete Blue Team'));

      expect(confirm).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Delete Group Blue Team?' }),
      );
      expect(groupService.deleteGroup.mock.calls).toEqual(calls);
      fixture.detectChanges();
      expect(
        ['Blue Team', 'Red Team'].filter((n) => within(table()).queryByText(n)),
      ).toEqual(names);
    },
  );
});
