// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { EntityState, EntityStore, Store, StoreConfig } from '@datorama/akita';
import { EventTemplate } from 'src/app/generated/alloy.api';
import { Injectable } from '@angular/core';

export interface EventTemplateState extends EntityState<EventTemplate> {}

@Injectable({
  providedIn: 'root',
})
@StoreConfig({ name: 'eventTemplates' })
export class EventTemplateStore extends EntityStore<EventTemplateState> {
  constructor() {
    super();
  }
}
