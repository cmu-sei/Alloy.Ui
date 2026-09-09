// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSort } from '@angular/material/sort';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { BehaviorSubject, of, throwError } from 'rxjs';
import {
  Event as AlloyEvent,
  EventErrorDetail,
  EventService,
} from 'src/app/generated/alloy.api';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventQuery } from 'src/app/data/event/event.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { AdminEventListComponent } from './event-list.component';

describe('AdminEventListComponent', () => {
  let component: AdminEventListComponent;
  let events$: BehaviorSubject<AlloyEvent[]>;
  let errorDetailCalls: string[];
  let errorDetailResponse: () => any;

  const build = (settings: any = {}) => {
    component = new AdminEventListComponent(
      {
        getEventErrorDetail: (id: string) => {
          errorDetailCalls.push(id);
          return errorDetailResponse();
        },
      } as unknown as EventService,
      {} as MatDialog,
      { settings } as ComnSettingsService,
      {} as PermissionDataService,
      { getAllEvents: () => of([]) } as EventDataService,
      { selectAll: () => events$.asObservable() } as EventQuery,
      {} as MatSnackBar
    );
    component.refresh = new BehaviorSubject<boolean>(false);
    component.sort = {
      active: '',
      direction: '',
      sortChange: new BehaviorSubject(null),
    } as unknown as MatSort;
    component.paginator = {
      pageIndex: 0,
      pageSize: 10,
      length: 0,
      page: new BehaviorSubject(null),
    } as unknown as MatPaginator;
  };

  beforeEach(() => {
    events$ = new BehaviorSubject<AlloyEvent[]>([]);
    errorDetailCalls = [];
    errorDetailResponse = () =>
      of({
        eventId: 'event-1',
        errorMessage: 'Infrastructure deployment failed during plan.',
        errorDetail: 'Error: invalid resource "foo"',
      } as EventErrorDetail);
    build();
  });

  afterEach(() => {
    component.ngOnDestroy();
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
  });

  // The detail can be kilobytes of Terraform output, so it is deliberately not on the Event
  // view model and must not be fetched until an operator actually asks for it.
  it('loads the error detail only once a row is expanded, then caches it', () => {
    expect(errorDetailCalls).toEqual([]);

    component.selectEvent('event-1');
    expect(errorDetailCalls).toEqual(['event-1']);
    expect(component.errorDetail('event-1')).toEqual(
      'Error: invalid resource "foo"'
    );

    // Collapse and re-expand: the cached copy is reused rather than re-requested.
    component.selectEvent('event-1');
    expect(component.expandedEventId).toBeNull();
    component.selectEvent('event-1');
    expect(errorDetailCalls).toEqual(['event-1']);
  });

  // A 403 is the expected answer for anyone without system-wide ManageEvents - including the
  // User who launched the Event, who is its Manager - and the row still has to render.
  it('leaves the row usable when the error detail is forbidden', () => {
    errorDetailResponse = () => throwError(() => ({ status: 403 }));

    component.selectEvent('event-1');

    expect(component.expandedEventId).toEqual('event-1');
    expect(component.errorDetail('event-1')).toBeUndefined();
    expect(component.loadingErrorDetailFor).toBeNull();
  });

  it('offers no Caster link when CasterUIAddress is unset', () => {
    expect(component.casterUIAddress).toBeUndefined();

    build({ CasterUIAddress: 'https://caster.example.com' });
    expect(component.casterUIAddress).toEqual('https://caster.example.com');
  });
});
