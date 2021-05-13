// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { Injectable } from '@angular/core';
import { EventService, Event } from 'src/app/generated/alloy.api';
import { Observable, BehaviorSubject, combineLatest, Subject } from 'rxjs';
import { take, switchMap, tap } from 'rxjs/operators';
import { EventTemplatesService } from '../event-templates/event-templates.service';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  public currentEvents$: Observable<Event[]>;

  private currentEventTemplateId: string;
  private updateTick$ = new Subject<number>();

  constructor(
    public eventTemplatesService: EventTemplatesService,
    public eventService: EventService
  ) {
    this.currentEvents$ = combineLatest(
      this.eventTemplatesService.currentEventTemplate$,
      this.updateTick$
    ).pipe(
      switchMap(([def]) => {
        if (def) {
          this.currentEventTemplateId = def.id;
          return this.eventService.getMyEventTemplateEvents(def.id);
        }
      })
    );
  }

  updateEvents(tickNum: number = -1) {
    console.log('Tick');
    this.updateTick$.next(tickNum);
  }

  launchEvent() {
    this.eventService
      .createEventFromEventTemplate(this.currentEventTemplateId)
      .pipe(
        take(1),
        tap(() => this.updateEvents())
      )
      .subscribe();
  }

  endEvent(id: string) {
    this.eventService
      .endEvent(id)
      .pipe(
        take(1),
        tap(() => this.updateEvents())
      )
      .subscribe();
  }

  redeployEvent(id: string) {
    this.eventService
      .redeployEvent(id)
      .pipe(
        take(1),
        tap(() => this.updateEvents())
      )
      .subscribe();
  }
}
