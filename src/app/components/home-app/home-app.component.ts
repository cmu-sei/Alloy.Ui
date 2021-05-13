// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { ComnAuthService, ComnSettingsService } from '@cmusei/crucible-common';
import { take } from 'rxjs/operators';
import { EventService } from 'src/app/generated/alloy.api';
import { LoggedInUserService } from '../../services/logged-in-user/logged-in-user.service';
import { TopbarView } from '../shared/top-bar/topbar.models';

@Component({
  selector: 'app-home-app',
  templateUrl: './home-app.component.html',
  styleUrls: ['./home-app.component.scss'],
})
export class HomeAppComponent implements OnInit {
  username: string;
  titleText: string;
  isSuperUser: Boolean;
  topBarColor = '#719F94';
  topBarTextColor = '#FFFFFF';
  eventTemplateId = '';
  TopbarView = TopbarView;

  constructor(
    private route: ActivatedRoute,
    private settingsService: ComnSettingsService,
    private titleService: Title,
    private eventService: EventService
  ) {}

  ngOnInit() {
    // Set the topbar color from config file
    this.topBarColor = this.settingsService.settings.AppTopBarHexColor
      ? this.settingsService.settings.AppTopBarHexColor
      : this.topBarColor;
    this.topBarTextColor = this.settingsService.settings.AppTopBarHexTextColor
      ? this.settingsService.settings.AppTopBarHexTextColor
      : this.topBarTextColor;

    // Set the page title from configuration file
    this.titleText = this.settingsService.settings.AppTopBarText;

    this.titleService.setTitle(this.settingsService.settings.AppTitle);
    this.username = '';

    // Get the event GUID from the URL that the user is entering the web page on
    this.route.params.subscribe((params) => {
      this.eventTemplateId = params['id'];

      if (!this.eventTemplateId) {
        // If there is no eventTemplateId, then check to see if a ViewId for player is present
        const viewId = params['viewId'];
        if (viewId) {
          console.log('ViewId:  ', viewId);
          this.eventService
            .getMyViewEvents(viewId)
            .pipe(take(1))
            .subscribe((imp) => {
              const index = imp.findIndex((i) => i.viewId === viewId);
              if (index > -1) {
                this.eventTemplateId = imp[0].eventTemplateId;
              }
            });
        }
      }
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
}
