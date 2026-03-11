// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { of } from 'rxjs';
import { AdminGroupsComponent } from './admin-groups.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/alloy.api';

const mockGroups = [
  { id: 'g1', name: 'Alpha Team' },
  { id: 'g2', name: 'Beta Squad' },
];

function mockPermission(canManage = false) {
  return {
    provide: PermissionDataService,
    useValue: {
      load: () => of([]),
      permissions: canManage ? [SystemPermission.ManageGroups] : [],
      hasPermission: (p: SystemPermission) =>
        canManage && p === SystemPermission.ManageGroups,
      canViewAdiminstration: () => false,
    },
  };
}

async function renderGroups(canEdit = true) {
  return renderComponent(AdminGroupsComponent, {
    declarations: [AdminGroupsComponent],
    providers: [
      {
        provide: GroupDataService,
        useValue: {
          groups$: of(mockGroups),
          load: () => of(mockGroups),
          create: vi.fn(() => of({})),
          edit: vi.fn(() => of({})),
          delete: vi.fn(() => of({})),
        },
      },
      {
        provide: UserDataService,
        useValue: {
          load: () => of([]),
        },
      },
      mockPermission(canEdit),
    ],
  });
}

describe('AdminGroupsComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderGroups();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display groups table with group names', async () => {
    await renderGroups();
    expect(screen.getByText('Alpha Team')).toBeInTheDocument();
    expect(screen.getByText('Beta Squad')).toBeInTheDocument();
  });

  it('should show search input', async () => {
    await renderGroups();
    expect(screen.getByPlaceholderText('Search Groups')).toBeInTheDocument();
  });

  it('should show Group Name column header', async () => {
    await renderGroups();
    expect(screen.getByText('Group Name')).toBeInTheDocument();
  });

  it('should filter groups when search text applied', async () => {
    const { fixture } = await renderGroups();
    const component = fixture.componentInstance;

    component.applyFilter('Alpha');
    expect(component.filterString).toBe('Alpha');
    expect(component.dataSource.filter).toBe('alpha');
  });

  it('should clear filter when clearFilter called', async () => {
    const { fixture } = await renderGroups();
    const component = fixture.componentInstance;

    component.applyFilter('test');
    component.clearFilter();
    expect(component.filterString).toBe('');
    expect(component.dataSource.filter).toBe('');
  });

  it('should enable Add Group button when canEdit is true', async () => {
    const { container } = await renderGroups(true);
    const addButtons = container.querySelectorAll('button[mattooltip="Add New Group"]');
    const addButton = addButtons[0] as HTMLButtonElement;
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(false);
  });

  it('should disable Add Group button when canEdit is false', async () => {
    const { container } = await renderGroups(false);
    const addButtons = container.querySelectorAll('button[mattooltip="Add New Group"]');
    const addButton = addButtons[0] as HTMLButtonElement;
    expect(addButton).toBeTruthy();
    expect(addButton.disabled).toBe(true);
  });

  it('should toggle expansion when toggleExpand called', async () => {
    const { fixture } = await renderGroups();
    const component = fixture.componentInstance;

    component.toggleExpand('g1');
    expect(component.expandedGroupId).toBe('g1');

    component.toggleExpand('g1');
    expect(component.expandedGroupId).toBeNull();
  });

  it('should expand different group when second group toggled', async () => {
    const { fixture } = await renderGroups();
    const component = fixture.componentInstance;

    component.toggleExpand('g1');
    expect(component.expandedGroupId).toBe('g1');

    component.toggleExpand('g2');
    expect(component.expandedGroupId).toBe('g2');
  });
});
