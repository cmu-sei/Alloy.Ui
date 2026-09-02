// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { Event as AlloyEvent, EventService } from 'src/app/generated/alloy.api';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventQuery } from 'src/app/data/event/event.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { AdminEventListComponent } from './event-list.component';

describe('AdminEventListComponent', () => {
  let component: AdminEventListComponent;
  let events$: BehaviorSubject<AlloyEvent[]>;

  beforeEach(() => {
    events$ = new BehaviorSubject<AlloyEvent[]>([]);
    component = new AdminEventListComponent(
      {} as EventService,
      {} as MatDialog,
      { settings: {} } as ComnSettingsService,
      {} as PermissionDataService,
      { getAllEvents: () => of([]) } as EventDataService,
      { selectAll: () => events$.asObservable() } as EventQuery
    );
    component.refresh = new Subject<boolean>();
    component.sort = {
      active: '',
      direction: '',
      sortChange: new Subject(),
    } as MatSort;
    component.paginator = {
      pageIndex: 0,
      pageSize: 10,
      length: 0,
      page: new Subject(),
    } as MatPaginator;
  });

  it('updates the list when the event store receives a SignalR update', () => {
    component.ngOnInit();

    events$.next([{ id: 'event-1', status: 'Creating' }]);
    expect(component.activeEvents).toEqual([
      jasmine.objectContaining({ id: 'event-1', status: 'Creating' }),
    ]);

    events$.next([{ id: 'event-1', status: 'Failed' }]);
    expect(component.activeEvents).toEqual([]);
    expect(component.failedEvents).toEqual([
      jasmine.objectContaining({ id: 'event-1', status: 'Failed' }),
    ]);

    component.ngOnDestroy();
  });
});
