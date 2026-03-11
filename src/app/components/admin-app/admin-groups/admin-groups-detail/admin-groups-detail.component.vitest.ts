// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { of } from 'rxjs';
import { AdminGroupsDetailComponent } from './admin-groups-detail.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { GroupMembershipService } from 'src/app/data/group/group-membership.service';
import { UserQuery } from 'src/app/data/user/user.query';

async function renderDetail(canEdit = true) {
  return renderComponent(AdminGroupsDetailComponent, {
    declarations: [AdminGroupsDetailComponent],
    providers: [
      {
        provide: GroupMembershipService,
        useValue: {
          loadMemberships: () => of([]),
          selectMemberships: () => of([]),
          createMembership: vi.fn(() => of({})),
          deleteMembership: vi.fn(() => of({})),
        },
      },
      {
        provide: UserQuery,
        useValue: {
          selectAll: () => of([]),
        },
      },
    ],
    componentProperties: {
      groupId: 'g1',
      canEdit,
    },
  });
}

describe('AdminGroupsDetailComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderDetail();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should set groupId from input', async () => {
    const { fixture } = await renderDetail();
    expect(fixture.componentInstance.groupId).toBe('g1');
  });

  it('should set canEdit from input', async () => {
    const { fixture } = await renderDetail(false);
    expect(fixture.componentInstance.canEdit).toBe(false);
  });

  it('should render member and membership list child components', async () => {
    const { container } = await renderDetail();
    expect(container.querySelector('app-admin-groups-membership-list')).toBeTruthy();
    expect(container.querySelector('app-admin-groups-member-list')).toBeTruthy();
  });
});
