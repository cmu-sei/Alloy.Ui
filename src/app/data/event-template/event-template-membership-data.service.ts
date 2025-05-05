// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  EventTemplateMembership,
  EventTemplateMembershipsService,
} from 'src/app/generated/alloy.api';

@Injectable({
  providedIn: 'root',
})
export class EventTemplateMembershipDataService {
  private eventTemplateMembershipsSubject = new BehaviorSubject<
    EventTemplateMembership[]
  >([]);
  public eventTemplateMemberships$ =
    this.eventTemplateMembershipsSubject.asObservable();

  constructor(
    private eventTemplateMembershipsService: EventTemplateMembershipsService
  ) {}

  loadMemberships(
    eventTemplateId: string
  ): Observable<EventTemplateMembership[]> {
    return this.eventTemplateMembershipsService
      .getAllEventTemplateMemberships(eventTemplateId)
      .pipe(tap((x) => this.eventTemplateMembershipsSubject.next(x)));
  }

  createMembership(
    eventTemplateId: string,
    eventTemplateMembership: EventTemplateMembership
  ) {
    return this.eventTemplateMembershipsService
      .createEventTemplateMembership(eventTemplateId, eventTemplateMembership)
      .pipe(
        tap((x) => {
          this.upsert(x.id, x);
        })
      );
  }

  editMembership(eventTemplateMembership: EventTemplateMembership) {
    return this.eventTemplateMembershipsService
      .updateEventTemplateMembership(
        eventTemplateMembership.id,
        eventTemplateMembership
      )
      .pipe(
        tap((x) => {
          this.upsert(eventTemplateMembership.id, x);
        })
      );
  }

  deleteMembership(id: string) {
    return this.eventTemplateMembershipsService
      .deleteEventTemplateMembership(id)
      .pipe(
        tap(() => {
          this.remove(id);
        })
      );
  }

  upsert(
    id: string,
    eventTemplateMembership: Partial<EventTemplateMembership>
  ) {
    const memberships = this.eventTemplateMembershipsSubject.getValue();
    const membershipToUpdate = memberships.find((x) => x.id === id);

    if (membershipToUpdate != null) {
      Object.assign(membershipToUpdate, eventTemplateMembership);
    } else {
      memberships.push({
        ...eventTemplateMembership,
        id,
      } as EventTemplateMembership);
    }

    this.eventTemplateMembershipsSubject.next(memberships);
  }

  remove(id: string) {
    let memberships = this.eventTemplateMembershipsSubject.getValue();
    memberships = memberships.filter((x) => x.id !== id);
    this.eventTemplateMembershipsSubject.next(memberships);
  }

  updateStore(eventTemplateMembership: EventTemplateMembership) {
    this.upsert(eventTemplateMembership.id, eventTemplateMembership);
  }

  deleteFromStore(id: string) {
    this.remove(id);
  }
}
