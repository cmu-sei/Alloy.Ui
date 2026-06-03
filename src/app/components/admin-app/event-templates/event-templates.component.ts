// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, ViewChild, AfterViewInit } from '@angular/core';
import { UntypedFormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { CasterDataService } from 'src/app/data/caster/caster-data-service';
import { PlayerDataService } from 'src/app/data/player/player-data-service';
import { SteamfitterDataService } from 'src/app/data/steamfitter/steamfitter-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { EventTemplateListComponent } from './event-template-list/event-template-list.component';

@Component({
    selector: 'app-event-templates',
    templateUrl: './event-templates.component.html',
    styleUrls: ['./event-templates.component.scss'],
    standalone: false
})
export class EventTemplatesComponent implements AfterViewInit {
  @ViewChild('eventTemplateList') eventTemplateList: EventTemplateListComponent;
  public matcher = new UserErrorStateMatcher();
  public isLinear = false;
  public eventTemplates$ = this.eventTemplateQuery.selectAll();
  public viewList = this.playerDataService.viewList;
  public scenarioTemplateList =
    this.steamfitterDataService.scenarioTemplateList;
  public directoryList = this.casterDataService.directoryList;
  loading$ = this.eventTemplateQuery.selectLoading();

  constructor(
    private playerDataService: PlayerDataService,
    private steamfitterDataService: SteamfitterDataService,
    private casterDataService: CasterDataService,
    private eventTemplateQuery: EventTemplateQuery
  ) {
    playerDataService.getViewsFromApi();
    steamfitterDataService.getScenarioTemplatesFromApi();
    casterDataService.getDirectoriesFromApi();
  }

  ngAfterViewInit() {
    // Set up callback to refresh template lists when edit dialog opens
    this.eventTemplateList.setRefreshCallback(() => {
      this.playerDataService.getViewsFromApi();
      this.steamfitterDataService.getScenarioTemplatesFromApi();
      this.casterDataService.getDirectoriesFromApi();
    });
  }
}

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}
