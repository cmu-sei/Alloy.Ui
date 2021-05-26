// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import {
  ComnAuthQuery,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { ClipboardService } from 'ngx-clipboard';
import { Observable, of, Subject, ReplaySubject } from 'rxjs';
import {
  filter,
  map,
  share,
  switchMap,
  take,
  takeUntil,
  tap,
  withLatestFrom,
} from 'rxjs/operators';
import { EventStatus } from 'src/app/generated/alloy.api';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api/model/event';
import { EventTemplate } from 'src/app/generated/alloy.api/model/eventTemplate';
import { DialogService } from 'src/app/services/dialog/dialog.service';
import { EventTemplatesService } from 'src/app/services/event-templates/event-templates.service';
import { EventsService } from 'src/app/services/events/events.service';
import { ALLOY_CURRENT_EVENT_STATUS } from 'src/app/shared/models/enums';
import { SignalRService } from '../../../shared/signalr/signalr.service';
import { EventTemplatesQuery } from '../../../state/event-templates/event-templates.query';
import { EventsQuery } from '../../../state/events/events.query';
import { UserEventsQuery } from '../../../state/user-events/user-events.query';

@Component({
  selector: 'app-event-template-info',
  templateUrl: './event-template-info.component.html',
  styleUrls: ['./event-template-info.component.scss'],
})
export class EventTemplateInfoComponent implements OnInit, OnDestroy {
  @Input() eventTemplateId: string;
  public ALLOY_CURRENT_EVENT_STATUS = ALLOY_CURRENT_EVENT_STATUS;
  public EventStatus = EventStatus;

  readonly ONE_HOUR = 1000 * 3600;

  public impsDataSource: MatTableDataSource<AlloyEvent>;
  public displayedColumns: string[] = [
    'username',
    'status',
    'lastLaunchStatus',
    'lastEndStatus',
    'dateCreated',
    'endDate',
    'statusDate',
  ];
  public templateId$: Observable<string>;
  public eventTemplate$: Observable<EventTemplate>;
  public events$: Observable<AlloyEvent[]>;
  public currentEvent$: Observable<AlloyEvent>;
  public userEvents$: Observable<AlloyEvent[]>;
  public isLoading$: Observable<boolean>;
  public pollingIntervalMS: number;
  public remainingTime: string;
  public timeRunningLow: boolean;
  public redeploying: boolean;
  public failureMessage: string;
  public failureDate: Date;
  public theme$: Observable<Theme>;
  private failedEvent: AlloyEvent;
  public inviteHidden: boolean = true;
  public isOwner: boolean = false;
  private unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private settingsService: ComnSettingsService,
    private dialogService: DialogService,
    public eventTemplatesService: EventTemplatesService,
    public eventsService: EventsService,
    private templatesQuery: EventTemplatesQuery,
    private eventsQuery: EventsQuery,
    private userEventsQuery: UserEventsQuery,
    private authQuery: ComnAuthQuery,
    private routerQuery: RouterQuery,
    private signalRService: SignalRService,
    private clipboardService: ClipboardService
  ) {
    this.theme$ = this.authQuery.userTheme$;

    this.impsDataSource = new MatTableDataSource<AlloyEvent>(
      new Array<AlloyEvent>()
    );
    this.remainingTime = '';
    this.timeRunningLow = false;
    this.failureMessage = '';
    this.failedEvent = undefined;
    this.pollingIntervalMS = parseInt(
      this.settingsService.settings.PollingIntervalMS,
      10
    );
  }

  ngOnInit() {
    this.routerQuery
      .selectParams(['id', 'viewId'])
      .pipe(
        switchMap(([id, viewId]) => {
          if (viewId) {
            return this.eventsService.getViewEvents(viewId);
          } else if (id) {
            return this.eventsService.loadEvents(id);
          } else {
            return of([]);
          }
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe((data) => {});

    this.eventTemplate$ = this.templatesQuery.selectLoading().pipe(
      filter((loading) => !loading),
      withLatestFrom(this.routerQuery.selectParams('id')),
      map(([loading, id]) => id),
      switchMap((id) => {
        return this.templatesQuery.selectEntity(id ? id : this.eventTemplateId);
      }),
      share({
        connector: () => new ReplaySubject(),
      }),
      takeUntil(this.unsubscribe$)
    );

    this.events$ = this.eventTemplate$.pipe(
      switchMap((t) => {
        return this.eventsQuery
          .selectEventsByTemplateId$(t.id)
          .pipe(map((events) => events));
      }),
      tap((events) => (this.impsDataSource.data = events)),
      share({
        connector: () => new ReplaySubject(),
      }),
      takeUntil(this.unsubscribe$)
    );

    this.currentEvent$ = this.eventsQuery.selectAll().pipe(
      withLatestFrom(this.authQuery.user$),
      map(([events, user]) => {
        if (events.length >= 1) {
          const ownerEvent = events.find(
            (e) => e.userId == user.profile.sub && this.isEventActive(e.status)
          );

          if (ownerEvent) {
            this.signalRService.startConnection().then(() => {
              this.signalRService.joinEvent(ownerEvent.id);
            });
          }
          return ownerEvent;
        }
      }),
      share({
        connector: () => new ReplaySubject(),
      }),
      takeUntil(this.unsubscribe$)
    );

    this.userEvents$ = this.userEventsQuery.selectLoading().pipe(
      filter((loading) => !loading),
      withLatestFrom(this.routerQuery.selectParams('id')),
      switchMap(([loading, id]) => {
        return this.userEventsQuery.userEventsByTemplateId$(
          id ? id : this.eventTemplateId
        );
      }),
      filter((events) => events.length >= 1),
      share({
        connector: () => new ReplaySubject(),
      }),
      takeUntil(this.unsubscribe$)
    );
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }

  getInviteLink(event: AlloyEvent) {
    const link: string = `${location.origin}/enlist/${event.shareCode}`;
    return link;
  }
  copyInviteLink(event: AlloyEvent) {
    this.clipboardService.copy(this.getInviteLink(event));
  }
  isEventActive(s: EventStatus) {
    switch (s) {
      case EventStatus.Creating:
      case EventStatus.Active:
      case EventStatus.Paused:
      case EventStatus.Planning:
      case EventStatus.Applying:
      case EventStatus.Ending: {
        return true;
      }
      default: {
        return false;
      }
    }
  }

  determineEventStatus(event?: AlloyEvent) {
    if (event) {
      switch (event.status) {
        case EventStatus.Active:
          return ALLOY_CURRENT_EVENT_STATUS.LAUNCHED;
        case EventStatus.Creating:
        case EventStatus.Planning:
        case EventStatus.Applying:
          return ALLOY_CURRENT_EVENT_STATUS.LAUNCHING;
        case EventStatus.Ending:
          return ALLOY_CURRENT_EVENT_STATUS.ENDING;
        case EventStatus.Ended:
          return ALLOY_CURRENT_EVENT_STATUS.ENDED;
        case EventStatus.Failed:
          return ALLOY_CURRENT_EVENT_STATUS.FAILED;
        default:
          return ALLOY_CURRENT_EVENT_STATUS.LAUNCH;
      }
    }
    return ALLOY_CURRENT_EVENT_STATUS.LAUNCH;
  }

  /*
  determineEventStatus(events: AlloyEvent[]): string {
    this.impsDataSource.data = events.sort((d1, d2) => {
      return +new Date(d2.dateCreated) - +new Date(d1.dateCreated);
    });

    this.isLoading = false;

    // There are 3 states that an event can be in
    // EventReadyToLaunch
    // EventLaunchInProgress
    // EventActive
    let status = '';
    if (events.length === 0) {
      // No events found
      status = 'EventReadyToLaunch';
      this.currentEvent = undefined;
      this.remainingTime = '';
    } else {
      const actives = events.find((s) => s.status === EventStatus.Active);
      if (actives !== undefined) {
        // Active Lab exit now
        status = 'EventActive';
        this.currentEvent = actives;
        this.remainingTime = this.calculateRemainingTime(
          new Date(this.currentEvent.expirationDate)
        );
      } else {
        // No active Events, now check if anything is in progress
        const inProgress = events.find(
          (s) =>
            s.status === EventStatus.Creating ||
            s.status === EventStatus.Planning ||
            s.status === EventStatus.Applying ||
            s.status === EventStatus.Ending
        );
        if (inProgress !== undefined) {
          status = 'EventLaunchInProgress';
          this.currentEvent = inProgress;
          this.remainingTime = '';
        } else {
          // At this point, the event is not active and not in progress
          // therefore is must be ready to be launched
          status = 'EventReadyToLaunch';
          this.currentEvent = undefined;
          this.remainingTime = '';
          if (this.isIframe()) {
            // At this point the app is shown within Player therefore the parent must moved to Alloy event page.
            window.top.location.href = window.location.href;
          }
        }
      }
      this.processFailureStatus(events[0]);
    }

    return status;
  }
  */
  launchEvent(id: string) {
    this.failedEvent = undefined;
    this.failureMessage = '';

    this.eventsService
      .launchEvent(id)
      .pipe(
        tap((event: AlloyEvent) => {
          this.signalRService.startConnection().then(() => {
            this.signalRService.joinEvent(event.id);
          });
        })
      )
      .subscribe();
  }

  rejoinEvent(event: AlloyEvent) {
    console.log('Opening ' + event.name + ' inside Player!!!');
    window.top.location.href =
      this.settingsService.settings.PlayerUIAddress + '/view/' + event.viewId;
  }

  endEvent(event: AlloyEvent) {
    if (event) {
      this.dialogService
        .confirm('End Event', 'Are you sure that you want to end this event?')
        .pipe(take(1))
        .subscribe((result) => {
          if (result['confirm']) {
            console.log('Ending ' + event.name);
            this.eventsService.endEvent(event.id);
          }
        });
    }
  }

  redeployEvent(event: AlloyEvent) {
    if (event) {
      this.dialogService
        .confirm(
          'Redeploy Event',
          'Are you sure that you want to redeploy this event?'
        )
        .pipe(take(1))
        .subscribe((result) => {
          if (result['confirm']) {
            console.log('Redeploying ' + event.name);
            this.redeploying = true;
            this.eventsService.redeployEvent(event.id);
          }
        });
    }
  }

  inviteEvent(event: AlloyEvent) {
    this.eventsService
      .inviteEvent(event.id)
      .pipe(take(1))
      .subscribe(() => {
        this.inviteHidden = false;
      });
  }

  isIframe(): boolean {
    if (window.location !== window.parent.location) {
      // The page is in an iframe
      return true;
    } else {
      // The page is not in an iframe
      return false;
    }
  }

  calculateRemainingTime(expirationDate: Date): string {
    let timeLeft = '';

    if (expirationDate !== undefined) {
      const now = new Date();
      // Note:  A C# date time is different and when parsing againt the timezone must be added.
      const exp = new Date(
        Date.parse(expirationDate.toLocaleString()).valueOf() -
          now.getTimezoneOffset() * 60 * 1000
      );
      let diffInMs: number =
        exp.valueOf() - Date.parse(now.toISOString()).valueOf();
      if (diffInMs < 0) {
        diffInMs = 0; // Force to zero.  Do not display a negative time.
      }
      const modHrs = (diffInMs / this.ONE_HOUR) % 1;
      const diffInHrs: number = diffInMs / (1000 * 3600) - modHrs;
      const modMins = Math.floor(modHrs * 60);
      timeLeft =
        'Time Remaining:  ' +
        diffInHrs.toString() +
        ' hrs ' +
        modMins +
        ' mins';

      this.timeRunningLow = diffInMs < this.ONE_HOUR;
    }
    return timeLeft;
  }

  processFailureStatus(imp: AlloyEvent) {
    if (imp) {
      if (
        (imp.status === EventStatus.Failed || imp.lastLaunchInternalStatus) &&
        !this.failedEvent
      ) {
        // Failed event and endEvent not sent yet
        this.failureDate = imp.dateCreated;
        if (imp.lastLaunchInternalStatus) {
          this.failureMessage = imp.lastLaunchInternalStatus
            .toString()
            .replace(/([A-Z])/g, ' $1')
            .trim();
        } else {
          this.failureMessage = imp.internalStatus
            .toString()
            .replace(/([A-Z])/g, ' $1')
            .trim();
        }
        this.failedEvent = imp;
      }
    } else {
      this.failureMessage = '';
      this.failureDate = undefined;
    }
  }
}
