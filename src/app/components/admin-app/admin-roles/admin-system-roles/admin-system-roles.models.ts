/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { SystemPermission } from 'src/app/generated/alloy.api';

export class SystemRolesModel {
  public static SystemPermissions = new Map<string, string>([
    ['All', 'Gives permission to perform any action'],
    [
      SystemPermission.CreateEventTemplates,
      'Allows creation of new EventTemplates. The creating User will be added as a Manager to the new EventTemplate.',
    ],
    [
      SystemPermission.EditEventTemplates,
      'Allows performing most actions in a EventTemplate. Can make changes to the contents of a EventTemplate.',
    ],
    [
      SystemPermission.ViewEventTemplates,
      'Allows viewing all EventTemplates and their Users and Groups. Implictly allows listing all Users and Groups. Enables the EventTemplates Administration panel',
    ],
    [
      SystemPermission.ManageEventTemplates,
      'Allows for making changes to EventTemplate Memberships.',
    ],
    [
      SystemPermission.CreateEvents,
      'Allows creation of new Events. The creating User will be added as a Manager to the new Event.',
    ],
    [
      SystemPermission.EditEvents,
      'Allows performing most actions in a Event. Can make changes to the contents of a Event.',
    ],
    [
      SystemPermission.ViewEvents,
      'Allows viewing all Events and their Users and Groups. Implictly allows listing all Users and Groups. Enables the Events Administration panel',
    ],
    [
      SystemPermission.ManageEvents,
      'Allows for making changes to Event Memberships.',
    ],
    [SystemPermission.ExecuteEvents, 'Allows executing tasks in a Event.'],
    [
      SystemPermission.ViewGroups,
      'Allows viewing all Groups and Group Memberships. Implicitly allows listing of Users. Enables the Groups Administration panel. ',
    ],
    [
      SystemPermission.ViewRoles,
      'Allows viewing all Roles and Role Memberships.  Enables the Roles Administration panel. ',
    ],
    [
      SystemPermission.ManageGroups,
      'Allows for creating and making changes to all Groups and Group Memberships.',
    ],
    [
      SystemPermission.ManageRoles,
      'Allows for making changes to Roles. Can create new Roles, rename existing Roles, and assign and remove Permissions to Roles.',
    ],
    [
      SystemPermission.ViewUsers,
      'Allows viewing all Users. Enables the Users Administration panel',
    ],
    [
      SystemPermission.ManageUsers,
      'Allows for making changes to Users. Can add or remove Users and change their assigned Roles.',
    ],
  ]);
}
