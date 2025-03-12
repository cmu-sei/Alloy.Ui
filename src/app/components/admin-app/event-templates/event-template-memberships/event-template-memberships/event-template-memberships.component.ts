/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
} from '@angular/core';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { EventTemplateMembershipDataService } from 'src/app/data/event-template/event-template-membership-data.service';
import { EventTemplateRoleDataService } from 'src/app/data/event-template/event-template-role-data.service';
import { UserQuery } from 'src/app/data/user/user.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import {
  EventTemplateMembership,
  EventTemplate,
} from 'src/app/generated/alloy.api';
import { GroupDataService } from 'src/app/data/group/group-data.service';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-event-template-memberships',
  templateUrl: './event-template-memberships.component.html',
  styleUrls: ['./event-template-memberships.component.scss'],
})
export class EventTemplateMembershipsComponent implements OnInit, OnChanges {
  @Input() embedded: boolean;
  @Input() eventTemplateId: string;
  @Output() goBack = new EventEmitter();

  eventTemplate$: Observable<EventTemplate>;

  memberships$ =
    this.eventTemplateMembershipDataService.eventTemplateMemberships$;
  roles$ = this.eventTemplateRolesDataService.eventTemplateRoles$;

  // All users that are not already members of the eventTemplate
  nonMembers$ = this.selectUsers(false);
  members$ = this.selectUsers(true);

  groupNonMembers$ = this.selectGroups(false);
  groupMembers$ = this.selectGroups(true);

  canEdit: boolean;

  constructor(
    private eventTemplateQuery: EventTemplateQuery,
    private eventTemplateMembershipDataService: EventTemplateMembershipDataService,
    private eventTemplateRolesDataService: EventTemplateRoleDataService,
    private userDataService: UserDataService,
    private userQuery: UserQuery,
    private groupDataService: GroupDataService,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    forkJoin([
      this.eventTemplateMembershipDataService.loadMemberships(
        this.eventTemplateId
      ),
      this.userDataService.load(),
      this.eventTemplateRolesDataService.loadRoles(),
      this.groupDataService.load(),
    ]).subscribe();
  }

  ngOnChanges(changes: SimpleChanges) {
    this.eventTemplate$ = this.eventTemplateQuery
      .selectEntity(this.eventTemplateId)
      .pipe(
        filter((x) => x != null),
        tap(
          (x) =>
            (this.canEdit = this.permissionDataService.canEditEventTemplate(
              x.id
            ))
        )
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

  createMembership(eventTemplateMembership: EventTemplateMembership) {
    eventTemplateMembership.eventTemplateId = this.eventTemplateId;
    this.eventTemplateMembershipDataService
      .createMembership(this.eventTemplateId, eventTemplateMembership)
      .subscribe();
  }

  deleteMembership(id: string) {
    this.eventTemplateMembershipDataService.deleteMembership(id).subscribe();
  }

  editMembership(eventTemplateMembership: EventTemplateMembership) {
    this.eventTemplateMembershipDataService
      .editMembership(eventTemplateMembership)
      .subscribe();
  }
}
