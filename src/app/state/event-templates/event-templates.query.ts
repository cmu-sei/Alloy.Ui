// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import {
  EventTemplatesState,
  EventTemplatesStore,
} from './event-templates.store';

@Injectable({ providedIn: 'root' })
export class EventTemplatesQuery extends QueryEntity<EventTemplatesState> {
  constructor(protected store: EventTemplatesStore) {
    super(store);
  }
}
