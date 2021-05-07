// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import {
  ActiveState,
  EntityState,
  EntityStore,
  StoreConfig,
} from '@datorama/akita';
import { EventTemplate } from '../../generated/alloy.api/model/eventTemplate';

export interface EventTemplatesState
  extends EntityState<EventTemplate>,
    ActiveState {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'eventTemplates' })
export class EventTemplatesStore extends EntityStore<EventTemplatesState> {
  constructor() {
    super();
  }
}
