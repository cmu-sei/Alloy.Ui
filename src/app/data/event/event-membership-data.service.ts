// Copyright 2024 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import {
  EventMembership,
  EventMembershipsService,
} from 'src/app/generated/alloy.api';

@Injectable({
  providedIn: 'root',
})
export class EventMembershipDataService {
  private eventMembershipsSubject = new BehaviorSubject<EventMembership[]>([]);
  public eventMemberships$ = this.eventMembershipsSubject.asObservable();

  constructor(private eventMembershipsService: EventMembershipsService) {}

  loadMemberships(eventId: string): Observable<EventMembership[]> {
    return this.eventMembershipsService
      .getAllEventMemberships(eventId)
      .pipe(tap((x) => this.eventMembershipsSubject.next(x)));
  }

  createMembership(eventId: string, eventMembership: EventMembership) {
    return this.eventMembershipsService
      .createEventMembership(eventId, eventMembership)
      .pipe(
        tap((x) => {
          this.upsert(x.id, x);
        })
      );
  }

  editMembership(eventMembership: EventMembership) {
    return this.eventMembershipsService
      .updateEventMembership(eventMembership.id, eventMembership)
      .pipe(
        tap((x) => {
          this.upsert(eventMembership.id, x);
        })
      );
  }

  deleteMembership(id: string) {
    return this.eventMembershipsService.deleteEventMembership(id).pipe(
      tap(() => {
        this.remove(id);
      })
    );
  }

  upsert(id: string, eventMembership: Partial<EventMembership>) {
    const memberships = this.eventMembershipsSubject.getValue();
    const membershipToUpdate = memberships.find((x) => x.id === id);

    if (membershipToUpdate != null) {
      Object.assign(membershipToUpdate, eventMembership);
    } else {
      memberships.push({
        ...eventMembership,
        id,
      } as EventMembership);
    }

    this.eventMembershipsSubject.next(memberships);
  }

  remove(id: string) {
    let memberships = this.eventMembershipsSubject.getValue();
    memberships = memberships.filter((x) => x.id !== id);
    this.eventMembershipsSubject.next(memberships);
  }

  updateStore(eventMembership: EventMembership) {
    this.upsert(eventMembership.id, eventMembership);
  }

  deleteFromStore(id: string) {
    this.remove(id);
  }
}
