// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { take, tap } from 'rxjs/operators';
import {
  EventTemplate,
  EventTemplateService,
} from 'src/app/generated/alloy.api';
import { EventTemplateStore } from './event-template.store';

@Injectable({
  providedIn: 'root',
})
export class EventTemplateDataService {
  constructor(
    private eventTemplateService: EventTemplateService,
    private templateStore: EventTemplateStore
  ) {}

  loadTemplates() {
    return this.eventTemplateService
      .getEventTemplates()
      .pipe(tap((templates) => this.templateStore.set(templates)))
      .subscribe();
  }

  loadTemplate(id: string) {
    return this.eventTemplateService
      .getEventTemplate(id)
      .pipe(tap((template) => this.stateCreate(template)))
      .subscribe();
  }

  addNew(eventTemplate: EventTemplate): Observable<EventTemplate> {
    return this.eventTemplateService.createEventTemplate(eventTemplate).pipe(
      tap((x) => this.stateCreate(x)),
      take(1)
    );
  }

  /**
   * Returns the request rather than subscribing to it, so callers can tell a rejected save
   * (the API refuses a Player View with no default team) from a successful one.
   */
  update(eventTemplate: EventTemplate): Observable<EventTemplate> {
    return this.eventTemplateService
      .updateEventTemplate(eventTemplate.id, eventTemplate)
      .pipe(
        tap((x) => this.stateUpdate(x)),
        take(1)
      );
  }

  delete(eventTemplateId: string) {
    this.eventTemplateService
      .deleteEventTemplate(eventTemplateId)
      .pipe(take(1))
      .subscribe(() => {
        this.stateDelete(eventTemplateId);
      });
  }

  stateCreate(template: EventTemplate) {
    this.templateStore.upsert(template.id, template);
  }
  stateUpdate(template: EventTemplate) {
    this.templateStore.update(template.id, template);
  }

  stateDelete(templateId: string) {
    this.templateStore.remove(templateId);
  }
}
