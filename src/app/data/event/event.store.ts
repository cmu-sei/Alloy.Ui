// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { Event } from 'src/app/generated/alloy.api';
import { Injectable } from '@angular/core';

export interface EventState extends EntityState<Event> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'events' })
export class EventStore extends EntityStore<EventState> {
  constructor() {
    super();
  }
}
