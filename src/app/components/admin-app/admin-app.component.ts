// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  ComnAuthService,
  ComnSettingsService,
  Theme,
  ComnAuthQuery,
} from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { TopbarView } from './../shared/top-bar/topbar.models';
import { takeUntil } from 'rxjs/operators';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/alloy.api';
import { RouterQuery } from '@datorama/akita-ng-router-store';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
@Component({
  selector: 'app-admin-app',
  templateUrl: './admin-app.component.html',
  styleUrls: ['./admin-app.component.scss'],
})
export class AdminAppComponent implements OnInit {
  username: string;
  titleText: string;
  hideTopbar = false;
  topBarColor = '#719F94';
  topBarTextColor = '#FFFFFF';
  eventTemplateId = '';
  isSidebarOpen = true;
  eventTemplatesText = 'Event Templates';
  eventsText = 'Events';
  rolesText = 'Roles';
  groupsText = 'Groups';
  usersText = 'Users';
  showStatus = 'Event Templates';
  shouldUpdateEventTemplates: Subject<boolean> = new Subject();
  shouldUpdateEvents: Subject<boolean> = new Subject();
  TopbarView = TopbarView;
  theme$: Observable<Theme>;
  permissions: SystemPermission[] = [];
  readonly SystemPermission = SystemPermission;
  private unsubscribe$ = new Subject();

  constructor(
    private router: Router,
    private routerQuery: RouterQuery,
    private authService: ComnAuthService,
    private settingsService: ComnSettingsService,
    private titleService: Title,
    private userDataService: UserDataService,
    private authQuery: ComnAuthQuery,
    private permissionDataService: PermissionDataService,
    private signalRService: SignalRService,
    private currentUserQuery: CurrentUserQuery
  ) {
    this.theme$ = this.authQuery.userTheme$;
  }

  ngOnInit() {
    // Set the topbar color from config file
    this.topBarColor = this.settingsService.settings.AppTopBarHexColor;
    this.topBarTextColor = this.settingsService.settings.AppTopBarHexTextColor;
    // Set the page title from configuration file
    this.titleText = this.settingsService.settings.AppTopBarText;
    this.titleService.setTitle(this.settingsService.settings.AppTitle);
    this.username = '';
    this.userDataService.setCurrentUser();
    this.currentUserQuery
      .select()
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((cu) => {
        this.username = cu.name;
        this.signalRService.startConnection().then(() => {
          this.signalRService.joinAdmin();
        });
      });
    this.userDataService.setCurrentUser();

    this.routerQuery
      .selectQueryParams<string>('section')
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((section) => {
        if (section != null) {
          this.showStatus = section;
          this.navigateToSection(section);
        }
      });

    this.permissionDataService
      .load()
      .subscribe(
        (x) => (this.permissions = this.permissionDataService.permissions)
      );
  }

  canViewEventTemplateList(): boolean {
    return this.permissionDataService.canViewEventTemplateList();
  }

  canViewEventList(): boolean {
    return this.permissionDataService.canViewEventList();
  }

  logout(): void {
    this.authService.logout();
  }

  /**
   * Set the display to View
   */
  adminGotoEventTemplates(): void {
    this.navigateToSection(this.eventTemplatesText);
  }

  /**
   * Sets the display to Users
   */
  adminGotoEvents(): void {
    this.navigateToSection(this.eventsText);
  }

  /**
   * Set the display to Users
   */
  adminGotoUsers(): void {
    this.navigateToSection(this.usersText);
  }

  /**
   * Sets the display to Roles
   */
  adminGotoRoles(): void {
    this.navigateToSection(this.rolesText);
  }

  /**
   * Sets the display to Groups
   */
  adminGotoGroups(): void {
    this.navigateToSection(this.groupsText);
  }

  private navigateToSection(sectionName: string) {
    this.router.navigate([], {
      queryParams: { section: sectionName },
      queryParamsHandling: 'merge',
    });
  }

  ngOnDestroy() {
    this.signalRService.leaveAdmin();
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
