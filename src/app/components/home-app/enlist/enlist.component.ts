/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved.
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, EMPTY, from, Subject } from 'rxjs';
import {
  catchError,
  filter,
  map,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { EventDataService } from 'src/app/data/event/event-data.service';

@Component({
    selector: 'app-enlist',
    templateUrl: './enlist.component.html',
    styleUrls: ['./enlist.component.scss'],
    standalone: false
})
export class EnlistComponent implements OnInit, OnDestroy {
  /**
   * BehaviorSubject, not Subject: the `true` below is emitted from ngOnInit, which runs before
   * the template's async pipe subscribes, so a plain Subject dropped it and the "Adding you to
   * the event" card never rendered at all.
   */
  isLoading$: Subject<boolean> = new BehaviorSubject<boolean>(true);
  unsubscibe$: Subject<null> = new Subject<null>();
  eventTemplateId: string;
  errorMessage: string | null = null;
  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private eventDataService: EventDataService
  ) {}

  ngOnInit(): void {
    this.isLoading$.next(true);
    this.route.params
      .pipe(
        map((params) => params['code'] as string),
        filter((code) => !!code),
        switchMap((code) =>
          from(this.eventDataService.enlistEvent(code))
        ),
        tap((event) => {
          this.isLoading$.next(false);
          this.router.navigate(['templates/' + event.eventTemplateId]);
        }),
        catchError((err) => {
          // Stop the spinner and say why. Without this the page shows "Adding you to the
          // event" forever, with no message and no way out.
          this.isLoading$.next(false);
          this.errorMessage = this.enlistErrorMessage(err);
          return EMPTY;
        }),
        takeUntil(this.unsubscibe$)
      )
      .subscribe();
  }

  /**
   * The API sends the reason in ProblemDetails.title, which is the ApiCallResult summary and is
   * safe to show any user. Never ProblemDetails.detail - for a 500 outside development that
   * holds the raw exception message.
   */
  private enlistErrorMessage(err: any): string {
    const title = err?.error?.title;
    return typeof title === 'string' && title.length > 0
      ? title
      : 'Could not add you to this event.';
  }

  ngOnDestroy() {
    this.unsubscibe$.next(null);
    this.unsubscibe$.complete();
  }
}
