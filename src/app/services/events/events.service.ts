// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { Injectable, OnDestroy } from '@angular/core';
import { coerceArray } from '@datorama/akita';
import { combineLatest, Observable, of, Subject } from 'rxjs';
import { map, switchMap, take, tap } from 'rxjs/operators';
import { Event as AlloyEvent, EventService } from 'src/app/generated/alloy.api';
import { EventsStore } from '../../state/events/events.store';
import { UserEventsStore } from '../../state/user-events/user-events.store';
import { EventTemplatesService } from '../event-templates/event-templates.service';
import { LoggedInUserService } from '../logged-in-user/logged-in-user.service';

@Injectable({
  providedIn: 'root',
})
export class EventsService implements OnDestroy {
  public currentEvents$: Observable<AlloyEvent[]>;
  public events$: Observable<AlloyEvent[]>;

  private currentEventTemplateId: string;
  private updateTick$ = new Subject<number>();
  private unsubscribe$ = new Subject<null>();

  constructor(
    public eventTemplatesService: EventTemplatesService,
    public eventService: EventService,
    private eventsStore: EventsStore,
    private userEventsStore: UserEventsStore,
    private loggedInUserService: LoggedInUserService
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
    this.eventsStore.upsert(event.id, event);
  }
  stateUpdate(event: AlloyEvent) {
    this.eventsStore.update(event.id, event);
    this.userEventsStore.update(event.id, event);
  }
  stateDelete(event: AlloyEvent) {
    this.eventsStore.remove(event.id);
  }

  launchEvent(templateId: string) {
    return this.eventService.createEventFromEventTemplate(templateId).pipe(
      take(1),
      tap((event) => {
        this.eventsStore.upsert(event.id, event);
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
    return this.loggedInUserService.isSuperUser.pipe(
      switchMap((isAdmin) =>
        isAdmin ? this.eventService.getEvents() : of([])
      ),
      tap((events) =>
        events ? this.eventsStore.upsertMany(events) : undefined
      ),
      take(1)
    );
  }

  getViewEvents(viewId: string) {
    return this.eventService
      .getMyViewEvents(viewId)
      .pipe(tap((events) => this.eventsStore.upsertMany(events)));
  }

  getTemplateEvents(id: string) {
    return this.loggedInUserService.isSuperUser.pipe(
      switchMap((isAdmin) =>
        isAdmin
          ? this.eventService.getEventTemplateEvents(id)
          : this.eventService.getMyEventTemplateEvents(id)
      ),
      map((events) => coerceArray(events)),
      tap((events: AlloyEvent[]) => {
        events = coerceArray(events);
        events ? this.eventsStore.upsertMany(events) : undefined;
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
