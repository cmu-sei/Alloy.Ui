/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
    selector: 'app-event-template-memberships-page',
    templateUrl: './event-template-memberships-page.component.html',
    styleUrls: ['./event-template-memberships-page.component.scss'],
    standalone: false
})
export class EventTemplateMembershipsPageComponent implements OnInit {
  eventTemplateId: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    this.eventTemplateId = this.activatedRoute.snapshot.paramMap.get('id');
    this.permissionDataService
      .loadEventTemplatePermissions(this.eventTemplateId)
      .subscribe();
  }
}
