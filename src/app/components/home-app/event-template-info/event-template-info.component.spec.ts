// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { ChangeDetectorRef } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
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
import {
  Event as AlloyEvent,
  EventTemplate,
} from 'src/app/generated/alloy.api';
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
      } as unknown as PermissionDataService,
      { open: () => undefined } as unknown as MatSnackBar,
      'en-US'
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

  // Failed is terminal and the event is never removed from the store, so a failure that keeps
  // winning after a later attempt succeeded and ended would pin the page to the failure card
  // for good - hiding the Launch and Join controls the user needs next.
  it('stops reporting a failure once a newer attempt has come and gone', () => {
    component.ngOnInit();
    component.currentEvent$.subscribe();

    events$.next([
      {
        id: 'event-1',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
        dateCreated: new Date('2026-09-01T10:00:00Z'),
      },
      {
        id: 'event-2',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Ended',
        dateCreated: new Date('2026-09-01T11:00:00Z'),
      },
    ]);

    expect(component.currentEvent).toBeNull();
  });

  // Store order is not attempt order, so the newest failure - not the first one found - is the
  // one the user is told about.
  it('reports the newest failure when there are several', () => {
    component.ngOnInit();
    component.currentEvent$.subscribe();

    events$.next([
      {
        id: 'event-1',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
        dateCreated: new Date('2026-09-01T10:00:00Z'),
      },
      {
        id: 'event-2',
        userId: USER_ID,
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
        dateCreated: new Date('2026-09-01T12:00:00Z'),
      },
    ]);

    expect(component.currentEvent.id).toEqual('event-2');
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

  // The card tells the user only that the launch broke, so this string is the entire report an
  // administrator gets. All four identifiers have to be in it, or the failure cannot be found.
  it('builds a copyable failure report from the event, template, user and status date', () => {
    const text = component.failureReportText(
      {
        id: 'event-1',
        userId: USER_ID,
        username: 'Alex Doe',
        eventTemplateId: TEMPLATE_ID,
        status: 'Failed',
        statusDate: new Date('2026-09-01T12:00:00Z'),
      } as unknown as AlloyEvent,
      { id: TEMPLATE_ID, name: 'Cyber Range 101' } as EventTemplate
    );

    // Names for whoever reads the report, ids for whoever has to query on them.
    expect(text).toContain(
      'Event event-1 launched from event template Cyber Range 101 (template-1)'
    );
    expect(text).toContain('has failed to launch for user Alex Doe (user-1) at ');
    expect(text).toContain('September 1, 2026');
  });

  // The /view route resolves the current event by viewId, so the event on screen need not belong
  // to the template on screen. Naming that template anyway would misdirect the report.
  it('omits the template name when the page template is not the event template', () => {
    const text = component.failureReportText(
      {
        id: 'event-1',
        userId: USER_ID,
        eventTemplateId: 'another-template',
        status: 'Failed',
      } as unknown as AlloyEvent,
      { id: TEMPLATE_ID, name: 'Cyber Range 101' } as EventTemplate
    );

    expect(text).toContain('launched from event template another-template has');
    expect(text).not.toContain('Cyber Range 101');
  });

  // username is nullable on Event; an empty name in front of the id would read as a defect.
  it('reports the user id alone when the event carries no username', () => {
    const text = component.failureReportText({
      id: 'event-1',
      userId: USER_ID,
      eventTemplateId: TEMPLATE_ID,
      status: 'Failed',
    } as unknown as AlloyEvent);

    expect(text).toContain('has failed to launch for user user-1 at ');
  });

  // Event.eventTemplateId is nullable, and a report naming no template is not actionable; the
  // page always knows which template it is showing, so fall back to that.
  it('falls back to the page template when the event carries no template id', () => {
    const text = component.failureReportText(
      { id: 'event-1', userId: USER_ID, status: 'Failed' } as AlloyEvent,
      { id: TEMPLATE_ID, name: 'Cyber Range 101' } as EventTemplate
    );

    expect(text).toContain(
      'launched from event template Cyber Range 101 (template-1)'
    );
  });
});
