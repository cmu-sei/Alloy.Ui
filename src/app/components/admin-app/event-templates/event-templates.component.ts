// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, inject } from '@angular/core';
import { UntypedFormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { CasterDataService } from 'src/app/data/caster/caster-data-service';
import { PlayerDataService } from 'src/app/data/player/player-data-service';
import { SteamfitterDataService } from 'src/app/data/steamfitter/steamfitter-data.service';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { EventTemplateListComponent } from './event-template-list/event-template-list.component';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-event-templates',
  templateUrl: './event-templates.component.html',
  styleUrls: ['./event-templates.component.scss'],
  imports: [EventTemplateListComponent, AsyncPipe],
})
export class EventTemplatesComponent {
  private playerDataService = inject(PlayerDataService);
  private steamfitterDataService = inject(SteamfitterDataService);
  private casterDataService = inject(CasterDataService);
  private eventTemplateQuery = inject(EventTemplateQuery);

  public matcher = new UserErrorStateMatcher();
  public isLinear = false;
  public eventTemplates$ = this.eventTemplateQuery.selectAll();
  public viewList = this.playerDataService.viewList;
  public scenarioTemplateList =
    this.steamfitterDataService.scenarioTemplateList;
  public directoryList = this.casterDataService.directoryList;
  loading$ = this.eventTemplateQuery.selectLoading();

  constructor() {
    const playerDataService = this.playerDataService;
    const steamfitterDataService = this.steamfitterDataService;
    const casterDataService = this.casterDataService;

    playerDataService.getViewsFromApi();
    steamfitterDataService.getScenarioTemplatesFromApi();
    casterDataService.getDirectoriesFromApi();
  }

  onRefreshTemplates() {
    this.playerDataService.getViewsFromApi();
    this.steamfitterDataService.getScenarioTemplatesFromApi();
    this.casterDataService.getDirectoriesFromApi();
  }
}

/** Error when invalid control is dirty, touched, or submitted. */
export class UserErrorStateMatcher implements ErrorStateMatcher {
  isErrorState(
    control: UntypedFormControl | null,
    form: FormGroupDirective | NgForm | null,
  ): boolean {
    const isSubmitted = form && form.submitted;
    return !!(control && control.invalid && (control.dirty || isSubmitted));
  }
}
