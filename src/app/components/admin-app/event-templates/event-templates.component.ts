// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { CasterDataService } from 'src/app/data/caster/caster-data-service';
import { PlayerDataService } from 'src/app/data/player/player-data-service';
import { SteamfitterDataService } from 'src/app/data/steamfitter/steamfitter-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';

@Component({
  selector: 'app-event-templates',
  templateUrl: './event-templates.component.html',
  styleUrls: ['./event-templates.component.scss'],
})
export class EventTemplatesComponent {
  public matcher = new UserErrorStateMatcher();
  public isLinear = false;
  public eventTemplates$ = this.eventTemplateQuery.selectAll();
  public viewList = this.playerDataService.viewList;
  public scenarioTemplateList =
    this.steamfitterDataService.scenarioTemplateList;
  public directoryList = this.casterDataService.directoryList;
  selectedEventTemplateId: string;
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
}

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: FormControl | null,
    form: FormGroupDirective | NgForm | null
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}
