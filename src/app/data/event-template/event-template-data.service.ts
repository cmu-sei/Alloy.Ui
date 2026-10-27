// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { finalize, map, shareReplay, take, tap } from 'rxjs/operators';
import {
  EventTemplate,
  EventTemplateService,
  ImportEventTemplatesResult,
} from 'src/app/generated/alloy.api';
import HttpHeaderUtils from 'src/app/utilities/http-header-utils';
import { EventTemplateStore } from './event-template.store';

@Injectable({
  providedIn: 'root',
})
export class EventTemplateDataService {
  private eventTemplateService = inject(EventTemplateService);
  private templateStore = inject(EventTemplateStore);

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
      take(1),
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
        take(1),
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

  /**
   * Exports the given Event Templates, or every one if there are no ids, as a JSON file: an object for
   * one template, an array for several. The file name is the API's, read from Content-Disposition.
   */
  export(ids: string[]): Observable<{ blob: Blob; filename: string }> {
    return this.eventTemplateService.exportEventTemplates(ids, 'response').pipe(
      map((response) => ({
        blob: response.body,
        filename: HttpHeaderUtils.getFilename(
          response.headers,
          'event-templates.json',
        ),
      })),
      take(1),
    );
  }

  /**
   * Imports a .json file created by export, or a .zip archive holding one. Each template is created
   * as a new template.
   *
   * The request starts at once and runs to the end whoever is listening: once the API commits the
   * templates exist, so aborting it when the dialog closes would only hide the result. The list is
   * reloaded when the request finishes, either way, since it may have imported templates even when it
   * failed to answer.
   */
  import(
    file: Blob,
    matchReferencesByName: boolean,
  ): Observable<ImportEventTemplatesResult> {
    const request = this.eventTemplateService
      .importEventTemplates(file, matchReferencesByName)
      .pipe(
        take(1),
        finalize(() => this.loadTemplates()),
        shareReplay({ bufferSize: 1, refCount: false }),
      );

    // this subscription keeps the request alive after the caller unsubscribes; the caller sees any error
    request.subscribe({ error: () => undefined });

    return request;
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
