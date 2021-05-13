// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import {
  EventTemplateService,
  EventTemplate,
  Event,
  EventService,
} from 'src/app/generated/alloy.api';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { FormControl } from '@angular/forms';
import {
  map,
  shareReplay,
  take,
  mergeMap,
  tap,
  switchMap,
} from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class EventTemplatesService {
  public eventTemplateList$: Observable<EventTemplate[]>;
  public searchControl$ = new FormControl();
  public selectedEventTemplateId: string | undefined = undefined;
  public fullEventTemplateList$ = new BehaviorSubject<EventTemplate[]>([]);

  public currentEventTemplate$: Observable<EventTemplate>;
  private searchTerm$ = new BehaviorSubject<string>('');
  private currentEventTemplateId$ = new BehaviorSubject<string>('');

  constructor(private eventTemplateService: EventTemplateService) {
    this.updatelist();

    this.searchControl$.valueChanges.subscribe((searchString) => {
      this.searchTerm$.next(searchString.trim().toLowerCase());
    });

    this.eventTemplateList$ = combineLatest([
      this.fullEventTemplateList$,
      this.searchTerm$,
    ]).pipe(
      map(([defs, srcTerm]) => {
        if (srcTerm === '') {
          return defs;
        } else {
          return defs.filter((d) =>
            d.name.toLowerCase().includes(srcTerm.toLowerCase())
          );
        }
      }),
      shareReplay(1)
    );

    this.currentEventTemplate$ = this.currentEventTemplateId$.pipe(
      switchMap((id) => {
        return this.eventTemplateService.getEventTemplate(id).pipe(take(1));
      })
    );
  }

  addNew(eventTemplate: EventTemplate) {
    this.eventTemplateService
      .createEventTemplate(eventTemplate)
      .pipe(take(1))
      .subscribe((def) => {
        this.selectedEventTemplateId = def.id;
        this.updatelist();
      });
  }

  update(eventTemplate: EventTemplate) {
    this.eventTemplateService
      .updateEventTemplate(eventTemplate.id, eventTemplate)
      .pipe(take(1))
      .subscribe(() => {
        this.updatelist();
      });
  }

  delete(eventTemplate: string) {
    this.eventTemplateService
      .deleteEventTemplate(eventTemplate)
      .pipe(take(1))
      .subscribe(() => {
        this.updatelist();
      });
  }

  getEventTemplate(id: string) {
    this.currentEventTemplateId$.next(id);
  }

  private updatelist() {
    this.eventTemplateService
      .getEventTemplates()
      .pipe(take(1))
      .subscribe((defs) => this.fullEventTemplateList$.next(defs));
  }
}
