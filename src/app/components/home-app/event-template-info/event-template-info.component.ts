// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/table';
import { ComnSettingsService, Theme } from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { ClipboardService } from 'ngx-clipboard';
import { combineLatest, interval, Observable, of, Subject } from 'rxjs';
import {
  filter,
  map,
  shareReplay,
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
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { ALLOY_CURRENT_EVENT_STATUS } from 'src/app/shared/models/enums';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { EventQuery } from 'src/app/data/event/event.query';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { UserEventsQuery } from '../../../data/event/user-events.query';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { CurrentUserState } from 'src/app/data/user/user.store';

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
  public currentEvent: AlloyEvent;
  public currentEvent$: Observable<AlloyEvent>;
  public userEvents$: Observable<AlloyEvent[]>;
  public userEvents: AlloyEvent[] = [];
  public currentUserId = '';
  public isLoading$: Observable<boolean>;
  public pollingIntervalMS: number;
  public remainingTime: string;
  public timeRunningLow: boolean;
  public redeploying: boolean;
  public failureMessage: string;
  public failureDate: Date;
  public theme$: Observable<Theme>;
  private failedEvent: AlloyEvent;
  public inviteShown: boolean = false;
  public isOwner: boolean = false;
  public viewId: string;
  public expirationDate: Date;
  public isIFrame: boolean;
  public inviteLink: string;
  private unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private settingsService: ComnSettingsService,
    private dialogService: DialogService,
    public eventTemplateDataService: EventTemplateDataService,
    public eventDataService: EventDataService,
    private eventTemplateQuery: EventTemplateQuery,
    private eventQuery: EventQuery,
    private userDataService: UserDataService,
    private userEventsQuery: UserEventsQuery,
    private currentUserQuery: CurrentUserQuery,
    private routerQuery: RouterQuery,
    private signalRService: SignalRService,
    private clipboardService: ClipboardService,
    private changeDetector: ChangeDetectorRef
  ) {
    this.theme$ = this.currentUserQuery.userTheme$;

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
    this.isIFrame = this.isIframe();

    this.routerQuery
      .selectParams(['id', 'viewId'])
      .pipe(
        switchMap(([id, viewId]) => {
          if (viewId) {
            this.viewId = viewId;
            this.eventTemplateDataService.loadTemplate(id);
            this.eventDataService.loadEvents(id);
            return this.eventDataService.getViewEvents(viewId);
          } else if (id) {
            this.eventTemplateDataService.loadTemplate(id);
            return this.eventDataService.loadEvents(id);
          } else {
            return of([]);
          }
        }),
        takeUntil(this.unsubscribe$)
      )
      .subscribe();

    this.eventTemplate$ = this.eventTemplateQuery.selectLoading().pipe(
      filter((loading) => !loading),
      withLatestFrom(this.routerQuery.selectParams('id')),
      map(([loading, id]) => id),
      switchMap((id) => {
        return this.eventTemplateQuery.selectEntity(
          id ? id : this.eventTemplateId
        );
      }),
      shareReplay(),
      // share({
      //   connector: () => new ReplaySubject(),
      // })
      takeUntil(this.unsubscribe$)
    );

    this.events$ = this.eventTemplate$.pipe(
      switchMap((t) => {
        return this.eventQuery
          .selectByEventTemplateId(t.id)
          .pipe(map((events) => events));
      }),
      tap((events) => {
        this.impsDataSource.data = events;
      }),
      shareReplay(),
      // share({
      //   connector: () => new ReplaySubject(),
      // })
      takeUntil(this.unsubscribe$)
    );

    this.userDataService.setCurrentUser();
    this.currentEvent$ = this.eventQuery.selectAll().pipe(
      withLatestFrom(
        this.currentUserQuery.select(),
        this.routerQuery.selectParams('id')
      ),
      map(([events, user, id]) => {
        this.currentUserId = user ? user.id : '';
        if (events.length >= 1) {
          let currentEvent: AlloyEvent = null;

          if (this.viewId != null) {
            currentEvent = events.find(
              (e) => e.viewId === this.viewId && this.isEventActive(e.status)
            );
          } else {
            currentEvent = events.find(
              (e) =>
                e.userId === user.id &&
                e.eventTemplateId === id &&
                this.isEventActive(e.status)
            );
          }

          if (currentEvent != null) {
            this.isOwner = currentEvent.userId === user.id;

            this.signalRService.startConnection().then(() => {
              this.signalRService.joinEvent(currentEvent.id);
            });

            this.expirationDate = currentEvent.expirationDate;
            this.remainingTime = this.calculateRemainingTime(
              currentEvent.expirationDate
            );
            this.inviteLink = this.getInviteLink(currentEvent);
          }
          this.currentEvent = currentEvent;
          this.changeDetector.markForCheck();
          return currentEvent;
        } else {
          this.currentEvent = null;
          return null;
        }
      }),
      shareReplay(),
      // share({
      //   connector: () => new ReplaySubject(),
      // })
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
        this.userEvents = events.filter((m) => m.createdBy !== this.currentUserId)
      }),
      shareReplay(),
      // share({
      //   connector: () => new ReplaySubject(),
      // })
      takeUntil(this.unsubscribe$)
    );

    combineLatest([
      this.currentEvent$.pipe(startWith(null)),
      this.userEvents$.pipe(startWith(null)),
    ])
      .pipe(
        skip(1),
        tap(([currentEvent, userEvents]) => {
          const count = userEvents ? userEvents.length : 0;
          const currentId = currentEvent ? currentEvent.id : 'null';
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
    if (!event.shareCode) {
      return null;
    }

    let baseURI = document.baseURI;

    if (baseURI.endsWith('/')) {
      baseURI = baseURI.slice(0, baseURI.length - 1);
    }

    const link = new URL(`${baseURI}/enlist/${event.shareCode}`);
    return link.toString();
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

    this.eventDataService
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
            this.eventDataService.endEvent(event.id);
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
            this.eventDataService.redeployEvent(event.id);
          }
        });
    }
  }

  inviteEvent(event: AlloyEvent) {
    this.eventDataService
      .inviteEvent(event.id)
      .pipe(take(1))
      .subscribe(() => {
        this.inviteShown = true;
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
