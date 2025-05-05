// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventRole, EventRolesService } from 'src/app/generated/alloy.api';

@Injectable({
  providedIn: 'root',
})
export class EventRoleDataService {
  private eventRolesSubject = new BehaviorSubject<EventRole[]>([]);
  public eventRoles$ = this.eventRolesSubject.asObservable();

  constructor(private eventRolesService: EventRolesService) {}

  loadRoles(): Observable<EventRole[]> {
    return this.eventRolesService
      .getAllEventRoles()
      .pipe(tap((x) => this.eventRolesSubject.next(x)));
  }
}
