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

@Component({
  selector: 'app-admin-app',
  templateUrl: './admin-app.component.html',
  styleUrls: ['./admin-app.component.scss'],
})
export class AdminAppComponent implements OnInit {
  username: string;
  titleText: string;
  isSuperUser: Boolean;
  topBarColor = '#719F94';
  topBarTextColor = '#FFFFFF';
  eventTemplateId = '';
  isSidebarOpen = true;
  eventTemplatesText = 'Event Templates';
  eventsText = 'Events';
  showStatus = 'Event Templates';
  shouldUpdateEventTemplates: Subject<boolean> = new Subject();
  shouldUpdateEvents: Subject<boolean> = new Subject();
  TopbarView = TopbarView;
  theme$: Observable<Theme>;

  constructor(
    private router: Router,
    private authService: ComnAuthService,
    private settingsService: ComnSettingsService,
    private titleService: Title,
    private userDataService: UserDataService,
    private authQuery: ComnAuthQuery
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
    this.isSuperUser = false;
    this.userDataService.setCurrentUser();
  }

  logout(): void {
    this.authService.logout();
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

  /**
   * Set the display to View
   */
  adminGotoEventTemplates(): void {
    this.showStatus = this.eventTemplatesText;
  }

  /**
   * Sets the display to Users
   */
  adminGotoEvents(): void {
    this.showStatus = this.eventsText;
  }
}
