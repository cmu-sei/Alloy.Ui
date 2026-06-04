// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { filter, take, takeUntil } from 'rxjs/operators';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { CurrentUserState } from 'src/app/data/user/user.store';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { TopbarView } from './topbar.models';
@Component({
    selector: 'app-topbar',
    templateUrl: './topbar.component.html',
    styleUrls: ['./topbar.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    standalone: false
})
export class TopbarComponent implements OnInit, OnDestroy {
  @Input() title?: string;
  @Input() sidenav?;
  @Input() teams?;
  @Input() team?;
  @Input() topbarColor?;
  @Input() topbarTextColor?;
  @Input() topbarView?: TopbarView;
  @Output() sidenavToggle?: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() setTeam?: EventEmitter<string> = new EventEmitter<string>();
  @Output() editView?: EventEmitter<any> = new EventEmitter<any>();
  currentUser$: Observable<CurrentUserState>;
  theme$: Observable<Theme>;
  unsubscribe$: Subject<null> = new Subject<null>();
  TopbarView = TopbarView;
  canViewAdmin = false;

  constructor(
    private authService: ComnAuthService,
    private currentUserQuery: CurrentUserQuery,
    private authQuery: ComnAuthQuery,
    private settingsService: ComnSettingsService,
    private permissionDataService: PermissionDataService,
    private changeDetectorRef: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.permissionDataService.load().subscribe((x) => {
      this.canViewAdmin = this.permissionDataService.canViewAdministration();
      this.changeDetectorRef.markForCheck();
    });

    this.currentUser$ = this.currentUserQuery.select().pipe(
      filter((user) => user !== null),
      takeUntil(this.unsubscribe$)
    );

    this.theme$ = this.authQuery.userTheme$;
  }

  setTeamFn(id: string) {
    if (this.setTeam && id) {
      this.setTeam.emit(id);
    }
  }

  themeFn(event) {
    const theme = event.checked ? Theme.DARK : Theme.LIGHT;
    this.authService.setUserTheme(theme);
  }

  toggleTheme() {
    this.theme$.pipe(take(1)).subscribe((current) => {
      const theme = current === Theme.DARK ? Theme.LIGHT : Theme.DARK;
      this.authService.setUserTheme(theme);
    });
  }
  editFn(event) {
    this.editView.emit(event);
  }

  sidenavToggleFn() {
    this.sidenavToggle.emit(!this.sidenav.opened);
  }

  logout(): void {
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
