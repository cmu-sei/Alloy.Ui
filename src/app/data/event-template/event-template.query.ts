// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Order, Query, QueryConfig, QueryEntity } from '@datorama/akita';
import { EventTemplateState, EventTemplateStore } from './event-template.store';
import { EventTemplate } from 'src/app/generated/alloy.api';
import { Injectable } from '@angular/core';
import { LegacyPageEvent as PageEvent } from '@angular/material/legacy-paginator';
import { Observable } from 'rxjs';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class EventTemplateQuery extends QueryEntity<EventTemplateState> {
  constructor(protected store: EventTemplateStore) {
    super(store);
  }

  selectById(id: string): Observable<EventTemplate> {
    return this.selectEntity(id);
  }
}
