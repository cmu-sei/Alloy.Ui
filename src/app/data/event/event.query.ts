// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Order, QueryConfig, QueryEntity } from '@datorama/akita';
import { EventState, EventStore } from './event.store';
import { Event } from 'src/app/generated/alloy.api';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@QueryConfig({
  sortBy: 'name',
  sortByOrder: Order.ASC,
})
@Injectable({
  providedIn: 'root',
})
export class EventQuery extends QueryEntity<EventState> {
  constructor(protected store: EventStore) {
    super(store);
  }

  selectById(id: string): Observable<Event> {
    return this.selectEntity(id);
  }

  selectByEventTemplateId(eventTemplateId: string): Observable<Event[]> {
    return this.selectAll({
      filterBy: (x) => x.eventTemplateId === eventTemplateId,
    });
  }

  selectByViewId(viewId: string): Observable<Event[]> {
    return this.selectAll({ filterBy: (x) => x.viewId === viewId });
  }
}
