// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { EventsState, EventsStore } from './events.store';

@Injectable({ providedIn: 'root' })
export class EventsQuery extends QueryEntity<EventsState> {
  public selectEventsByTemplateId$ = (id: string) => {
    return this.selectAll({
      filterBy: ({ eventTemplateId }) => eventTemplateId === id,
    });
  };
  constructor(protected store: EventsStore) {
    super(store);
  }
}
