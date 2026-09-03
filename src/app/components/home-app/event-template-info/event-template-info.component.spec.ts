// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ComnAuthQuery,
  ComnSettingsService,
  CrucibleDialogService,
} from '@cmusei/crucible-common';
import { ClipboardService } from 'ngx-clipboard';
import { BehaviorSubject, of } from 'rxjs';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventQuery } from 'src/app/data/event/event.query';
import { UserEventsQuery } from 'src/app/data/event/user-events.query';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api';
import { ALLOY_CURRENT_EVENT_STATUS } from 'src/app/shared/models/enums';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import { EventTemplateInfoComponent } from './event-template-info.component';

const TEMPLATE_ID = 'template-1';
const USER_ID = 'user-1';

describe('EventTemplateInfoComponent', () => {
  let component: EventTemplateInfoComponent;
  let events$: BehaviorSubject<AlloyEvent[]>;
  let joinedEventIds: string[];

  beforeEach(() => {
    events$ = new BehaviorSubject<AlloyEvent[]>([]);
    joinedEventIds = [];

    component = new EventTemplateInfoComponent(
      { settings: { PollingIntervalMS: '3500' } } as ComnSettingsService,
      {} as CrucibleDialogService,
      { loadTemplate: () => of(null) } as unknown as EventTemplateDataService,
      { loadEvents: () => of([]) } as unknown as EventDataService,
      {
        selectLoading: () => of(false),
        selectEntity: () => of({ id: TEMPLATE_ID }),
      } as unknown as EventTemplateQuery,
      {
        selectAll: () => events$.asObservable(),
        selectByEventTemplateId: () => of([]),
      } as unknown as EventQuery,
      { setCurrentUser: () => undefined } as unknown as UserDataService,
      {
        selectLoading: () => of(false),
        userEventsByTemplateId$: () => of([]),
      } as unknown as UserEventsQuery,
      { userTheme$: of('light-theme') } as unknown as ComnAuthQuery,
      { select: () => of({ id: USER_ID }) } as unknown as CurrentUserQuery,
      { params: of({ id: TEMPLATE_ID }) } as unknown as ActivatedRoute,
      {
        joinEvent: (id: string) => {
          joinedEventIds.push(id);
          return Promise.resolve();
        },
      } as unknown as SignalRService,
      {} as ClipboardService,
      { markForCheck: () => undefined } as unknown as ChangeDetectorRef,
      {
        load: () => of([]),
        loadGroupPermissions: () => of([]),
        permissions: [],
        canViewAdministration: () => false,
      } as unknown as PermissionDataService
    );
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  // A failed event used to be filtered out of currentEvent$ entirely, so the FAILED branch of
  // the template was unreachable and the user was silently offered the Launch button again.
  it('reports a failed event as the current event so the user is told the launch broke', () => {
    component.ngOnInit();
    component.currentEvent$.subscribe();

    events$.next([
      {
        id: 'event-1',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
        errorMessage: 'Infrastructure deployment failed during plan.',
        lastLaunchInternalStatus: 'PlanningLaunch',
      },
    ]);

    expect(component.currentEvent).toBeTruthy();
    expect(component.currentEvent.id).toEqual('event-1');
    expect(component.determineEventStatus(component.currentEvent)).toEqual(
      ALLOY_CURRENT_EVENT_STATUS.FAILED
    );
    expect(component.currentEvent.errorMessage).toEqual(
      'Infrastructure deployment failed during plan.'
    );
    // Without the group join the follow-up EventUpdated never arrives.
    expect(joinedEventIds).toContain('event-1');
  });

  // Launching again leaves the old Failed event in the store; if it kept winning, the page
  // would stay on the failure message while the new launch ran.
  it('prefers an in-progress event over a previous failure', () => {
    component.ngOnInit();
    component.currentEvent$.subscribe();

    events$.next([
      {
        id: 'event-1',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
      },
      {
        id: 'event-2',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Planning',
      },
    ]);

    expect(component.currentEvent.id).toEqual('event-2');
    expect(component.determineEventStatus(component.currentEvent)).toEqual(
      ALLOY_CURRENT_EVENT_STATUS.LAUNCHING
    );
  });

  it('ignores events belonging to another user or template', () => {
    component.ngOnInit();
    component.currentEvent$.subscribe();

    events$.next([
      {
        id: 'event-1',
        userId: 'someone-else',
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
      },
      {
        id: 'event-2',
        userId: USER_ID,
        eventTemplateId: 'another-template',
        status: 'Failed',
      },
    ]);

    expect(component.currentEvent).toBeNull();
  });

  it('renders the failure stage as prose', () => {
    expect(
      component.failureStage({ lastLaunchInternalStatus: 'PlanningLaunch' })
    ).toEqual('Planning Launch');
    // Falls back to the live internal status when the launch fields were never written.
    expect(component.failureStage({ internalStatus: 'FailedLaunch' })).toEqual(
      'Failed Launch'
    );
    expect(component.failureStage({})).toEqual('');
    expect(component.failureStage(null)).toEqual('');
  });
});
