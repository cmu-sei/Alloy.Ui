// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { Injectable, OnDestroy } from '@angular/core';
import { coerceArray } from '@datorama/akita';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { Event as AlloyEvent, EventService } from 'src/app/generated/alloy.api';
import { EventStore } from './event.store';
import { UserEventsStore } from './user-events.store';
import { EventTemplateDataService } from '../event-template/event-template-data.service';
import { PermissionDataService } from '../permission/permission-data.service';

@Injectable({
  providedIn: 'root',
})
export class EventDataService implements OnDestroy {
  public currentEvents$: Observable<AlloyEvent[]>;
  public events$: Observable<AlloyEvent[]>;
  private unsubscribe$ = new Subject<null>();

  constructor(
    public eventTemplateDataService: EventTemplateDataService,
    public eventService: EventService,
    private eventStore: EventStore,
    private userEventsStore: UserEventsStore,
    private permissionDataService: PermissionDataService
  ) {}

  loadEvents(templateId?: string) {
    // if admin load events from getAllEvents, and template events.
    return combineLatest([
      this.getAllEvents(),
      this.getTemplateEvents(templateId),
      this.getUserEvents(),
    ]);
  }

  stateCreate(event: AlloyEvent) {
    this.eventStore.upsert(event.id, event);
  }
  stateUpdate(event: AlloyEvent) {
    this.eventStore.update(event.id, event);
  }
  stateDelete(event: AlloyEvent) {
    this.eventStore.remove(event.id);
  }

  launchEvent(templateId: string) {
    return this.eventService.createEventFromEventTemplate(templateId).pipe(
      take(1),
      tap((event) => {
        this.eventStore.upsert(event.id, event);
      })
    );
  }

  endEvent(id: string) {
    this.eventService.endEvent(id).pipe(take(1)).subscribe();
  }

  redeployEvent(id: string) {
    this.eventService.redeployEvent(id).pipe(take(1)).subscribe();
  }

  getAllEvents() {
    return of(this.permissionDataService.canViewEventList).pipe(
      switchMap((isAdmin) =>
        isAdmin ? this.eventService.getEvents() : of([])
      ),
      tap((events) =>
        events ? this.eventStore.upsertMany(events) : undefined
      ),
      take(1)
    );
  }

  getViewEvents(viewId: string) {
    return this.eventService
      .getMyViewEvents(viewId)
      .pipe(tap((events) => this.eventStore.upsertMany(events)));
  }

  getTemplateEvents(id: string) {
    return of(this.permissionDataService.canManageEventTemplate).pipe(
      switchMap((isAdmin) =>
        isAdmin
          ? this.eventService.getEventTemplateEvents(id)
          : this.eventService.getMyEventTemplateEvents(id)
      ),
      map((events) => coerceArray(events)),
      tap((events: AlloyEvent[]) => {
        events = coerceArray(events);
        events ? this.eventStore.upsertMany(events) : undefined;
      }),
      take(1)
    );
  }

  getUserEvents() {
    return this.eventService
      .getMyEvents()
      .pipe(tap((events) => this.userEventsStore.upsertMany(events)));
  }

  getEvent(id: string) {
    return this.eventService.getEvent(id);
  }

  inviteEvent(id: string) {
    return this.eventService.invite(id);
  }
  enlistEvent(code: string) {
    return this.eventService.enlist(code);
  }
  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
