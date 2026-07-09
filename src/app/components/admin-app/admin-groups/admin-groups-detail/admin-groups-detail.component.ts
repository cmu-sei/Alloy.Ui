/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { combineLatest, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { GroupMembershipService } from 'src/app/data/group/group-membership.service';
import { UserQuery } from 'src/app/data/user/user.query';
import {
  GroupMembership,
  GroupMembershipRole,
} from 'src/app/generated/alloy.api';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-admin-groups-detail',
  templateUrl: './admin-groups-detail.component.html',
  styleUrls: ['./admin-groups-detail.component.scss'],
  standalone: false
})
export class AdminGroupsDetailComponent implements OnInit, OnChanges {
  @Input() groupId: string;
  @Input() canEdit: boolean;
  memberships$ = of([]);

  // All users that are not already members of the project
  nonMembers$ = this.selectUsers(false);
  members$ = this.selectUsers(true);

  constructor(
    private userQuery: UserQuery,
    private groupMembershipService: GroupMembershipService,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    this.groupMembershipService.loadMemberships(this.groupId).subscribe();
  }

  ngOnChanges() {
    this.memberships$ = this.groupMembershipService.selectMemberships(
      this.groupId
    );

    this.nonMembers$ = this.selectUsers(false);
    this.members$ = this.selectUsers(true);
  }

  selectUsers(members: boolean) {
    return combineLatest([this.userQuery.selectAll(), this.memberships$]).pipe(
      map(([users, memberships]) => {
        return users.filter((user) => {
          if (members) {
            return (
              memberships.length > 0 &&
              memberships.some((y) => y.userId == user.id)
            );
          } else {
            return (
              memberships.length === 0 ||
              !memberships.some((y) => y.userId == user.id)
            );
          }
        });
      })
    );
  }

  createMembership(userId: string) {
    this.groupMembershipService
      .createMembership(this.groupId, {
        groupId: this.groupId,
        userId,
        role: GroupMembershipRole.Member,
      })
      .subscribe();
  }

  deleteMembership(event: { id: string; isCurrentUser: boolean }) {
    this.groupMembershipService
      .deleteMembership(event.id)
      .pipe(
        switchMap(() => this.refreshSelfGroupPermissions(event.isCurrentUser))
      )
      .subscribe();
  }

  editMembership(event: {
    id: string;
    role: GroupMembershipRole;
    isCurrentUser: boolean;
  }) {
    this.groupMembershipService
      .editMembership(event.id, { role: event.role } as GroupMembership)
      .pipe(
        switchMap(() => this.refreshSelfGroupPermissions(event.isCurrentUser))
      )
      .subscribe();
  }

  private refreshSelfGroupPermissions(isCurrentUser: boolean) {
    return isCurrentUser
      ? this.permissionDataService.loadGroupPermissions(true)
      : of(null);
  }
}
