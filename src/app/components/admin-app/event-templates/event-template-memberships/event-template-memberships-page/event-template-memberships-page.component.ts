/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { TopbarComponent } from '../../../../shared/top-bar/topbar.component';
import { EventTemplateMembershipsComponent } from '../event-template-memberships/event-template-memberships.component';

@Component({
  selector: 'app-event-template-memberships-page',
  templateUrl: './event-template-memberships-page.component.html',
  styleUrls: ['./event-template-memberships-page.component.scss'],
  imports: [TopbarComponent, EventTemplateMembershipsComponent],
})
export class EventTemplateMembershipsPageComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private permissionDataService = inject(PermissionDataService);

  eventTemplateId: string;

  ngOnInit(): void {
    this.eventTemplateId = this.activatedRoute.snapshot.paramMap.get('id');
    this.permissionDataService
      .loadEventTemplatePermissions(this.eventTemplateId)
      .subscribe();
  }
}
