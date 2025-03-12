/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { EventTemplatePermission } from 'src/app/generated/alloy.api';

export class EventTemplateRolesModel {
  public static EventTemplatePermissions = new Map<string, string>([
    ['All', 'Gives permission to perform any action within the EventTemplate'],
    [
      EventTemplatePermission.EditEventTemplate,
      'Allows performing most actions in the EventTemplate. Can make changes to the contents of the EventTemplate, including creating and editing Files, Directories, and Workspaces. Can Plan and Apply Workspace Runs.',
    ],
    [
      EventTemplatePermission.ManageEventTemplate,
      'Allows for making changes to EventTemplate Memberships in the EventTemplate.',
    ],
    [
      EventTemplatePermission.ViewEventTemplate,
      'Allows viewing all contents of the EventTemplate.',
    ],
  ]);
}
