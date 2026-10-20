// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
  input,
} from '@angular/core';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { forkJoin, Observable, Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { CurrentUserState } from 'src/app/data/user/user.store';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { TopbarView } from './topbar.models';
import { MatToolbar, MatToolbarRow } from '@angular/material/toolbar';
import { MatIconButton, MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { AsyncPipe } from '@angular/common';
@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    MatToolbar,
    MatToolbarRow,
    MatIconButton,
    RouterLink,
    MatIcon,
    MatButton,
    MatMenuTrigger,
    MatMenu,
    MatMenuItem,
    MatSlideToggle,
    AsyncPipe,
  ],
})
export class TopbarComponent implements OnInit, OnDestroy {
  private authService = inject(ComnAuthService);
  private currentUserQuery = inject(CurrentUserQuery);
  private authQuery = inject(ComnAuthQuery);
  private settingsService = inject(ComnSettingsService);
  private permissionDataService = inject(PermissionDataService);

  readonly title = input<string>(undefined);
  @Input() sidenav?;
  @Input() teams?;
  @Input() team?;
  @Input() topbarColor?;
  @Input() topbarTextColor?;
  readonly topbarView = input<TopbarView>(undefined);
  @Output() sidenavToggle?: EventEmitter<boolean> = new EventEmitter<boolean>();
  @Output() setTeam?: EventEmitter<string> = new EventEmitter<string>();
  @Output() editView?: EventEmitter<any> = new EventEmitter<any>();
  currentUser$: Observable<CurrentUserState>;
  theme$: Observable<Theme>;
  unsubscribe$: Subject<null> = new Subject<null>();
  TopbarView = TopbarView;
  canViewAdmin = false;

  ngOnInit() {
    forkJoin([
      this.permissionDataService.load(),
      this.permissionDataService.loadGroupPermissions(),
    ]).subscribe(
      (x) =>
        (this.canViewAdmin =
          this.permissionDataService.canViewAdministration()),
    );

    this.currentUser$ = this.currentUserQuery.select().pipe(
      filter((user) => user !== null),
      takeUntil(this.unsubscribe$),
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
