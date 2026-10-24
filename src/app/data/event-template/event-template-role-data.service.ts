// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  EventTemplateRole,
  EventTemplateRolesService,
} from 'src/app/generated/alloy.api';

@Injectable({
  providedIn: 'root',
})
export class EventTemplateRoleDataService {
  private eventTemplateRolesService = inject(EventTemplateRolesService);

  private eventTemplateRolesSubject = new BehaviorSubject<EventTemplateRole[]>(
    [],
  );
  public eventTemplateRoles$ = this.eventTemplateRolesSubject.asObservable();

  loadRoles(): Observable<EventTemplateRole[]> {
    return this.eventTemplateRolesService
      .getAllEventTemplateRoles()
      .pipe(tap((x) => this.eventTemplateRolesSubject.next(x)));
  }
}
