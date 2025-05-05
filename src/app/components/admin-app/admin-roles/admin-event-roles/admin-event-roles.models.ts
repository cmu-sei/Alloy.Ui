/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { EventPermission } from 'src/app/generated/alloy.api';

export class EventRolesModel {
  public static EventPermissions = new Map<string, string>([
    ['All', 'Gives permission to perform any action within the Event'],
    [
      EventPermission.EditEvent,
      'Allows performing most actions in the Event. Can make changes to the contents of the Event.',
    ],
    [
      EventPermission.ManageEvent,
      'Allows for making changes to Event Memberships in the Event.',
    ],
    [EventPermission.ViewEvent, 'Allows viewing all contents of the Event.'],
  ]);
}
