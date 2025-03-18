/*
Copyright 2025 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';

@Component({
  selector: 'app-event-memberships-page',
  templateUrl: './event-memberships-page.component.html',
  styleUrls: ['./event-memberships-page.component.scss'],
})
export class EventMembershipsPageComponent implements OnInit {
  eventId: string;

  constructor(
    private activatedRoute: ActivatedRoute,
    private permissionDataService: PermissionDataService
  ) {}

  ngOnInit(): void {
    this.eventId = this.activatedRoute.snapshot.paramMap.get('id');
    this.permissionDataService.loadEventPermissions(this.eventId).subscribe();
  }
}
