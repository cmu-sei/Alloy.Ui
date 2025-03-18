// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { View, PlayerService } from 'src/app/generated/alloy.api';
import { map, take } from 'rxjs/operators';
import { Observable, combineLatest, BehaviorSubject } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class PlayerDataService {
  private _views: View[] = [];
  private _viewMask: Observable<string>;
  readonly views = new BehaviorSubject<View[]>(this._views);
  readonly viewList: Observable<View[]>;
  readonly viewFilter = new UntypedFormControl();
  readonly selectedView: Observable<View>;
  private _selectedViewId: string;
  private requestedViewId = this.activatedRoute.queryParamMap.pipe(
    map((params) => params.get('viewId') || '')
  );

  constructor(
    private playerService: PlayerService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this._viewMask = activatedRoute.queryParamMap.pipe(
      map((params) => params.get('viewMask') || '')
    );
    this.viewFilter.valueChanges.subscribe((term) => {
      router.navigate([], {
        queryParams: { viewMask: term },
        queryParamsHandling: 'merge',
      });
    });
    this.viewList = combineLatest([this.views, this._viewMask]).pipe(
      map(([items, filterTerm]) =>
        items
          ? (items as View[])
              .sort((a: View, b: View) =>
                a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1
              )
              .filter(
                (item) =>
                  item.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
                  item.id.toLowerCase().includes(filterTerm.toLowerCase())
              )
          : []
      )
    );
    this.selectedView = combineLatest([
      this.viewList,
      this.requestedViewId,
    ]).pipe(
      map(([viewList, requestedViewId]) => {
        if (viewList && viewList.length > 0 && requestedViewId) {
          const selectedView = viewList.find(
            (view) => view.id === requestedViewId
          );
          if (selectedView && selectedView.id !== this._selectedViewId) {
            this._selectedViewId = selectedView.id;
          }
          return selectedView;
        } else {
          this._selectedViewId = '';
          return undefined;
        }
      })
    );
  }

  private updateViews(views: View[]) {
    this._views = Object.assign([], views);
    this.views.next(this._views);
  }

  getViewsFromApi() {
    this.playerService
      .getViews()
      .pipe(take(1))
      .subscribe(
        (views) => {
          this.updateViews(views.filter((x) => x.status === 'Inactive'));
        },
        (error) => {
          this.updateViews([]);
        }
      );
  }

  selectView(viewId: string) {
    this.router.navigate([], {
      queryParams: { viewId: viewId },
      queryParamsHandling: 'merge',
    });
  }
}
