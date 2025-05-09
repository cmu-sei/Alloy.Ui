/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

export * from './caster.service';
import { CasterService } from './caster.service';
export * from './event.service';
import { EventService } from './event.service';
export * from './eventMemberships.service';
import { EventMembershipsService } from './eventMemberships.service';
export * from './eventPermissions.service';
import { EventPermissionsService } from './eventPermissions.service';
export * from './eventRoles.service';
import { EventRolesService } from './eventRoles.service';
export * from './eventTemplate.service';
import { EventTemplateService } from './eventTemplate.service';
export * from './eventTemplateMemberships.service';
import { EventTemplateMembershipsService } from './eventTemplateMemberships.service';
export * from './eventTemplatePermissions.service';
import { EventTemplatePermissionsService } from './eventTemplatePermissions.service';
export * from './eventTemplateRoles.service';
import { EventTemplateRolesService } from './eventTemplateRoles.service';
export * from './group.service';
import { GroupService } from './group.service';
export * from './health.service';
import { HealthService } from './health.service';
export * from './player.service';
import { PlayerService } from './player.service';
export * from './steamfitter.service';
import { SteamfitterService } from './steamfitter.service';
export * from './systemPermissions.service';
import { SystemPermissionsService } from './systemPermissions.service';
export * from './systemRoles.service';
import { SystemRolesService } from './systemRoles.service';
export * from './user.service';
import { UserService } from './user.service';
export const APIS = [CasterService, EventService, EventMembershipsService, EventPermissionsService, EventRolesService, EventTemplateService, EventTemplateMembershipsService, EventTemplatePermissionsService, EventTemplateRolesService, GroupService, HealthService, PlayerService, SteamfitterService, SystemPermissionsService, SystemRolesService, UserService];
