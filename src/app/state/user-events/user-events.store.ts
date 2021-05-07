// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { EntityState, EntityStore, StoreConfig } from '@datorama/akita';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api';

export interface UserEventsState extends EntityState<AlloyEvent> {}

@Injectable({ providedIn: 'root' })
@StoreConfig({ name: 'UserEvents' })
export class UserEventsStore extends EntityStore<UserEventsState> {
  constructor() {
    super();
  }
}
