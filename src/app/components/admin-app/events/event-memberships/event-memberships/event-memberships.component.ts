/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventQuery } from 'src/app/data/event/event.query';
import { EventMembershipDataService } from 'src/app/data/event/event-membership-data.service';
import { EventRoleDataService } from 'src/app/data/event/event-role-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { EventMembership, Event } from 'src/app/generated/alloy.api';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-event-memberships',
  templateUrl: './event-memberships.component.html',
  styleUrls: ['./event-memberships.component.scss'],
})
export class EventMembershipsComponent implements OnInit, OnChanges {
  @Input() embedded: boolean;
  @Input() eventId: string;
  @Output() goBack = new EventEmitter();

  event$: Observable<Event>;

  memberships$ = this.eventMembershipDataService.eventMemberships$;
  roles$ = this.eventRolesDataService.eventRoles$;

  // All users that are not already members of the event
  nonMembers$ = this.selectUsers(false);
  members$ = this.selectUsers(true);

  groupNonMembers$ = this.selectGroups(false);
  groupMembers$ = this.selectGroups(true);

  canEdit: boolean;

  constructor(
    private eventQuery: EventQuery,
    private eventMembershipDataService: EventMembershipDataService,
    private eventRolesDataService: EventRoleDataService,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private groupDataService: GroupDataService,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.eventMembershipDataService.loadMemberships(this.eventId),
      this.userDataService.load(),
      this.eventRolesDataService.loadRoles(),
      this.groupDataService.load(),
    ]).subscribe();
    console.log('event ID = ' + this.eventId);
  }

  ngOnChanges(changes: SimpleChanges) {
    this.event$ = this.eventQuery.selectEntity(this.eventId).pipe(
      filter((x) => x != null),
      tap((x) => (this.canEdit = this.permissionDataService.canEditEvent(x.id)))
    );
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

  selectGroups(members: boolean) {
    return combineLatest([
      this.groupDataService.groups$,
      this.memberships$,
    ]).pipe(
      map(([groups, memberships]) => {
        return groups.filter((group) => {
          if (members) {
            return (
              memberships.length > 0 &&
              memberships.some((y) => y.groupId == group.id)
            );
          } else {
            return (
              memberships.length === 0 ||
              !memberships.some((y) => y.groupId == group.id)
            );
          }
        });
      })
    );
  }

  createMembership(eventMembership: EventMembership) {
    eventMembership.eventId = this.eventId;
    this.eventMembershipDataService
      .createMembership(this.eventId, eventMembership)
      .subscribe();
  }

  deleteMembership(id: string) {
    this.eventMembershipDataService.deleteMembership(id).subscribe();
  }

  editMembership(eventMembership: EventMembership) {
    this.eventMembershipDataService.editMembership(eventMembership).subscribe();
  }
}
