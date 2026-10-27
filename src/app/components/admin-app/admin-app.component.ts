// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { Component, OnInit, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { forkJoin, Observable, Subject } from 'rxjs';
import { UserDataService } from 'src/app/data/user/user-data.service';
import { TopbarView } from './../shared/top-bar/topbar.models';
import { filter, map, take, takeUntil } from 'rxjs/operators';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { SystemPermission } from 'src/app/generated/alloy.api';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { SignalRService } from 'src/app/shared/signalr/signalr.service';
import {
  MatSidenavContainer,
  MatSidenav,
  MatSidenavContent,
} from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { MatIcon } from '@angular/material/icon';
import { MatList, MatListItem, MatListItemIcon } from '@angular/material/list';
import { NgClass, AsyncPipe } from '@angular/common';
import { MatIconButton } from '@angular/material/button';
import { TopbarComponent } from '../shared/top-bar/topbar.component';
import { EventTemplatesComponent } from './event-templates/event-templates.component';
import { EventsComponent } from './events/events.component';
import { AdminRolesComponent } from './admin-roles/admin-roles.component';
import { AdminGroupsComponent } from './admin-groups/admin-groups.component';
import { AdminUsersComponent } from './admin-users/admin-users.component';
@Component({
  selector: 'app-admin-app',
  templateUrl: './admin-app.component.html',
  styleUrls: ['./admin-app.component.scss'],
  imports: [
    MatSidenavContainer,
    MatSidenav,
    MatToolbar,
    RouterLink,
    MatIcon,
    MatList,
    MatListItem,
    NgClass,
    MatListItemIcon,
    MatIconButton,
    MatSidenavContent,
    TopbarComponent,
    EventTemplatesComponent,
    EventsComponent,
    AdminRolesComponent,
    AdminGroupsComponent,
    AdminUsersComponent,
    AsyncPipe,
  ],
})
export class AdminAppComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(ComnAuthService);
  private settingsService = inject(ComnSettingsService);
  private titleService = inject(Title);
  private userDataService = inject(UserDataService);
  private permissionDataService = inject(PermissionDataService);
  private signalRService = inject(SignalRService);
  private currentUserQuery = inject(CurrentUserQuery);
  private authQuery = inject(ComnAuthQuery);

  username: string;
  titleText: string;
  hideTopbar = false;
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

  constructor() {
    this.theme$ = this.authQuery.userTheme$;
  }

  ngOnInit() {
    this.hideTopbar = this.inIframe();
    // Set the page title from configuration file
    this.titleText = this.settingsService.settings.AppTopBarText;
    this.titleService.setTitle(this.settingsService.settings.AppTitle);
    this.username = '';
    this.userDataService.setCurrentUser();
    this.currentUserQuery
      .select()
      .pipe(
        filter((cu) => !!cu.id),
        take(1),
      )
      .subscribe((cu) => {
        this.username = cu.name;
        this.signalRService
          .startConnection()
          .then(() => {
            this.signalRService.joinAdmin();
          })
          .catch(() => {
            // the service reports the failure to the user
          });
      });

    this.route.queryParams
      .pipe(
        map((params) => params['section'] as string),
        takeUntil(this.unsubscribe$),
      )
      .subscribe((section) => {
        if (section != null) {
          this.showStatus = section;
          this.navigateToSection(section);
        }
      });

    forkJoin([
      this.permissionDataService.load(),
      this.permissionDataService.loadGroupPermissions(),
    ])
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe(() => {
        this.permissions = this.permissionDataService.permissions;

        if (
          !this.canViewEventTemplates() &&
          this.permissionDataService.canViewGroupsAdmin()
        ) {
          this.showStatus = this.groupsText;
        }
      });
  }

  canCreateEventTemplates(): boolean {
    return this.permissionDataService.canCreateEventTemplates();
  }

  canCreateEvents(): boolean {
    return this.permissionDataService.canCreateEvents();
  }

  canViewEventTemplates(): boolean {
    return this.permissionDataService.canViewEventTemplateList();
  }

  canViewEvents(): boolean {
    return this.permissionDataService.canViewEventList();
  }

  canViewGroupsAdmin(): boolean {
    return this.permissionDataService.canViewGroupsAdmin();
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

  getSelectedClass(section: string) {
    return section === this.showStatus ? 'selected-item' : '';
  }

  private navigateToSection(sectionName: string) {
    this.router.navigate([], {
      queryParams: { section: sectionName },
      queryParamsHandling: 'merge',
    });
  }

  inIframe() {
    try {
      return window.self !== window.top;
    } catch (e) {
      return true;
    }
  }

  ngOnDestroy() {
    this.signalRService.leaveAdmin();
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
