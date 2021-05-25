// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { FormControl } from '@angular/forms';
import {
  BehaviorSubject,
  combineLatest,
  Observable,
  Subject,
  ReplaySubject,
} from 'rxjs';
import { map, share, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import {
  EventTemplate,
  EventTemplateService,
} from 'src/app/generated/alloy.api';
import { EventTemplatesStore } from 'src/app/state/event-templates/event-templates.store';
import { LoggedInUserService } from '../logged-in-user/logged-in-user.service';

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
  private unsubscribe$ = new Subject<null>();

  constructor(
    private eventTemplateService: EventTemplateService,
    private templateStore: EventTemplatesStore,
    private loggedInUser: LoggedInUserService
  ) {
    this.eventTemplateService
      .getEventTemplates()
      .pipe(
        tap((templates) => {
          this.templateStore.set(templates);
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

    this.searchControl$.valueChanges.subscribe((searchString) => {
      this.searchTerm$.next(searchString.trim().toLowerCase());
    });
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
      share({
        connector: () => new ReplaySubject(1),
      })
    );
    this.currentEventTemplate$ = this.currentEventTemplateId$.pipe(
      switchMap((id) => {
        return this.eventTemplateService.getEventTemplate(id).pipe(take(1));
      })
    );
  }

  loadTemplates() {
    return this.eventTemplateService
      .getEventTemplates()
      .pipe(tap((templates) => this.templateStore.set(templates)));
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
  stateCreate(template: EventTemplate) {
    this.templateStore.upsert(template.id, template);
  }
  stateUpdate(event: EventTemplate) {
    this.templateStore.update(event.id, event);
  }
  stateDelete(event: EventTemplate) {
    this.templateStore.remove(event.id);
  }
  private updatelist() {
    this.eventTemplateService
      .getEventTemplates()
      .pipe(take(1))
      .subscribe((defs) => this.fullEventTemplateList$.next(defs));
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
