// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ComnSettingsService } from '@cmusei/crucible-common';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { combineLatest, Subject } from 'rxjs';
import { filter, map, switchMap, takeUntil, tap } from 'rxjs/operators';
import { EventsService } from 'src/app/services/events/events.service';
import { TopbarView } from '../shared/top-bar/topbar.models';

@Component({
  selector: 'app-home-app',
  templateUrl: './home-app.component.html',
  styleUrls: ['./home-app.component.scss'],
})
export class HomeAppComponent implements OnInit, OnDestroy {
  username: string;

  isSuperUser: Boolean;
  eventTemplateId;
  viewId = '';
  TopbarView = TopbarView;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    private settingsService: ComnSettingsService,
    private titleService: Title,
    private eventsService: EventsService,
    private routerQuery: RouterQuery
  ) {}

  ngOnInit() {
    // Set the topbar color from config file
    this.titleService.setTitle(this.settingsService.settings.AppTitle);
    this.username = '';

    // Get the event GUID from the URL that the user is entering the web page on
    this.routerQuery
      .selectParams('viewId')
      .pipe(
        filter((viewId) => viewId),
        switchMap((viewId) => {
          return combineLatest([
            this.eventsService.getViewEvents(viewId),
            this.eventsService.getUserEvents(),
          ]).pipe(
            map(([viewEvents, myEvents]) => [
              viewId,
              // Set so only unique events are sent.
              new Set([...viewEvents, ...myEvents]),
            ])
          );
        }),
        tap(([viewId, events]) => {
          // Convert set to array.
          events = [...events];

          const event = events.find((e) => e.viewId === viewId);
          if (event) {
            window.location.href = `${window.location.origin}/templates/${event.eventTemplateId}/view/${viewId}`;
          }
        }),

        takeUntil(this.unsubscribe$)
      )
      .subscribe();
  }
  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
