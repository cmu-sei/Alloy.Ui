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
import {
  combineLatest,
  interval,
  Observable,
  of,
  ReplaySubject,
  Subject,
} from 'rxjs';
import {
  filter,
  map,
  share,
  skip,
  startWith,
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
  public viewId: string;
  public expirationDate: Date;
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
            this.viewId = viewId;
            this.eventTemplatesService.loadTemplate(id);
            this.eventsService.loadEvents(id);
            return this.eventsService.getViewEvents(viewId);
          } else if (id) {
            this.eventTemplatesService.loadTemplate(id);
            return this.eventsService.loadEvents(id);
          } else {
            return of([]);
          }
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

    this.eventTemplate$ = this.templatesQuery.selectLoading().pipe(
      filter((loading) => !loading),
      withLatestFrom(this.routerQuery.selectParams('id')),
      map(([loading, id]) => id),
      switchMap((id) => {
        return this.templatesQuery.selectEntity(id ? id : this.eventTemplateId);
      }),
      share(),
      takeUntil(this.unsubscribe$)
    );

    this.events$ = this.eventTemplate$.pipe(
      switchMap((t) => {
        return this.eventsQuery
          .selectEventsByTemplateId$(t.id)
          .pipe(map((events) => events));
      }),
      tap((events) => (this.impsDataSource.data = events)),
      share(),
      takeUntil(this.unsubscribe$)
    );

    this.currentEvent$ = this.eventsQuery.selectAll().pipe(
      withLatestFrom(this.authQuery.user$, this.routerQuery.selectParams('id')),
      map(([events, user, id]) => {
        if (events.length >= 1) {
          let currentEvent: AlloyEvent = null;

          if (this.viewId != null) {
            currentEvent = events.find(
              (e) => e.viewId === this.viewId && this.isEventActive(e.status)
            );
          } else {
            currentEvent = events.find(
              (e) =>
                e.userId === user.profile.sub &&
                e.eventTemplateId === id &&
                this.isEventActive(e.status)
            );
          }

          if (currentEvent != null) {
            this.isOwner = currentEvent.userId === user.profile.sub;

            this.signalRService.startConnection().then(() => {
              this.signalRService.joinEvent(currentEvent.id);
            });

            this.expirationDate = currentEvent.expirationDate;
            this.remainingTime = this.calculateRemainingTime(
              currentEvent.expirationDate
            );
          }

          return currentEvent;
        } else {
          return null;
        }
      }),
      share(),
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
      map((events) => events.filter((e) => this.isEventActive(e.status))),
      tap((events) => {
        events.forEach((e) => {
          this.signalRService.startConnection().then(() => {
            this.signalRService.joinEvent(e.id);
          });
        });
      }),
      share(),
      takeUntil(this.unsubscribe$)
    );

    combineLatest([
      this.currentEvent$.pipe(startWith(null)),
      this.userEvents$.pipe(startWith(null)),
    ])
      .pipe(
        skip(1),
        tap(([currentEvent, userEvents]) => {
          if (
            this.viewId != null &&
            (userEvents == null || userEvents.length === 0) &&
            (currentEvent == null || !this.isEventActive(currentEvent.status))
          ) {
            window.top.location.href = window.location.href.split('/view/')[0];
          }
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

    interval(10000)
      .pipe(
        tap(
          () =>
            (this.remainingTime = this.calculateRemainingTime(
              this.expirationDate
            ))
        ),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();
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

    if (expirationDate != null) {
      const now = new Date();
      const exp = new Date(expirationDate);

      let diffInMs: number = exp.valueOf() - now.valueOf();
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
