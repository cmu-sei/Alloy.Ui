// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import {
  ArchiveType,
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

  /**
   * Exports the given Event Templates as an archive, in the same shape Player uses for Views.
   */
  export(
    ids: string[],
    archiveType: ArchiveType
  ): Observable<{ blob: Blob; filename: string }> {
    return this.eventTemplateService
      .exportEventTemplates(ids, archiveType, 'response')
      .pipe(
        map((response) => ({
          blob: response.body,
          filename: HttpHeaderUtils.getFilename(
            response.headers,
            `event_templates.${archiveType === ArchiveType.Tgz ? 'tar.gz' : 'zip'}`
          ),
        })),
        take(1)
      );
  }

  /**
   * Imports an archive created by export. Reloads the list afterwards, since some templates
   * may have been imported even when others failed.
   */
  import(
    archive: Blob,
    matchReferencesByName: boolean
  ): Observable<ImportEventTemplatesResult> {
    return this.eventTemplateService
      .importEventTemplates(archive, matchReferencesByName)
      .pipe(
        tap(() => this.loadTemplates()),
        take(1)
      );
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
