// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, inject } from '@angular/core';
import { QueryEntity } from '@datorama/akita';
import { UserEventsState, UserEventsStore } from './user-events.store';

@Injectable({ providedIn: 'root' })
export class UserEventsQuery extends QueryEntity<UserEventsState> {
  protected store: UserEventsStore;

  userEventsByTemplateId$ = (id: string) => {
    return this.selectAll({
      filterBy: ({ eventTemplateId }) => eventTemplateId === id,
    });
  };
  constructor() {
    const store = inject(UserEventsStore);

    super(store);

    this.store = store;
  }
}
