/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatTabGroup, MatTab, MatTabContent } from '@angular/material/tabs';
import { AdminSystemRolesComponent } from './admin-system-roles/admin-system-roles.component';
import { AdminEventTemplateRolesComponent } from './admin-event-template-roles/admin-event-template-roles.component';
import { AdminEventRolesComponent } from './admin-event-roles/admin-event-roles.component';

@Component({
  selector: 'app-admin-roles',
  templateUrl: './admin-roles.component.html',
  styleUrls: ['./admin-roles.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatTabGroup,
    MatTab,
    MatTabContent,
    AdminSystemRolesComponent,
    AdminEventTemplateRolesComponent,
    AdminEventRolesComponent,
  ],
})
export class AdminRolesComponent {}
