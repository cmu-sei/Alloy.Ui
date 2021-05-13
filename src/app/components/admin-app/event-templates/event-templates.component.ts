// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, NgZone } from '@angular/core';
import { FormControl, FormGroupDirective, NgForm } from '@angular/forms';
import { ErrorStateMatcher } from '@angular/material/core';
import { Observable } from 'rxjs';
import { EventTemplate } from 'src/app/generated/alloy.api';
import { CasterDataService } from 'src/app/services/caster-data/caster-data.service';
import { PlayerDataService } from 'src/app/services/player-data/player-data.service';
import { SteamfitterDataService } from 'src/app/services/steamfitter-data/steamfitter-data.service';

@Component({
  selector: 'app-event-templates',
  templateUrl: './event-templates.component.html',
  styleUrls: ['./event-templates.component.scss'],
})
export class EventTemplatesComponent {
  public matcher = new UserErrorStateMatcher();
  public isLinear = false;
  public eventTemplates$ = new Observable<EventTemplate[] | void>();
  public viewList = this.playerDataService.viewList;
  public scenarioTemplateList =
    this.steamfitterDataService.scenarioTemplateList;
  public directoryList = this.casterDataService.directoryList;

  constructor(
    private playerDataService: PlayerDataService,
    private steamfitterDataService: SteamfitterDataService,
    private casterDataService: CasterDataService,
    public zone: NgZone
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
