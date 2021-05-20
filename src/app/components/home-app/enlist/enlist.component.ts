/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { from, of, Subject } from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { EventsService } from '../../../services/events/events.service';

@Component({
  selector: 'app-enlist',
  templateUrl: './enlist.component.html',
  styleUrls: ['./enlist.component.scss'],
})
export class EnlistComponent implements OnInit, OnDestroy {
  isLoading$: Subject<boolean> = new Subject<boolean>();
  unsubscibe$: Subject<null> = new Subject<null>();
  eventTemplateId: string;
  constructor(
    private router: Router,
    private routerQuery: RouterQuery,
    private eventsService: EventsService
  ) {}

  ngOnInit(): void {
    this.isLoading$.next(true);
    this.routerQuery
      .selectParams('code')
      .pipe(
        filter((code) => code),
        switchMap((code) =>
          from(this.eventsService.enlistEvent(code)).pipe(
            map((userEvent) => [code, userEvent])
          )
        ),
        tap(([code, event]) => {
          this.isLoading$.next(false);
          this.router.navigate(['templates/' + event.eventTemplateId]);
        }),
        catchError((err) => {
          return of(err);
        }),
        takeUntil(this.unsubscibe$)
      )
      .subscribe();
  }

  ngOnDestroy() {
    this.unsubscibe$.next(null);
    this.unsubscibe$.complete();
  }
}
