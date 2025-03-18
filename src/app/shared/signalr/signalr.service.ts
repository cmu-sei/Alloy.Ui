// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable } from '@angular/core';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
} from '@cmusei/crucible-common';
import * as SignalR from '@microsoft/signalr';
import { Observable } from 'rxjs';
import { EventTemplate } from 'src/app/generated/alloy.api';
import { Event as AlloyEvent } from 'src/app/generated/alloy.api/model/event';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection: SignalR.HubConnection;
  private eventId: string;
  private connectionObservable: Observable<SignalR.HubConnection>;
  private connectionPromise: Promise<void>;
  private systemGroupJoined = false;

  constructor(
    private authService: ComnAuthService,
    private eventDataService: EventDataService,
    private eventTemplateDataService: EventTemplateDataService,
    private authQuery: ComnAuthQuery,
    private settingsService: ComnSettingsService
  ) {}

  public startConnection(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const token = this.authService.getAuthorizationToken();
    this.hubConnection = new SignalR.HubConnectionBuilder()
      .withUrl(
        `${this.settingsService.settings.ApiUrl}/hubs/engine?bearer=${token}`
      )
      .withAutomaticReconnect(new RetryPolicy(60, 0, 5))
      .build();
    this.hubConnection.onreconnected(() => {
      this.joinGroups();
    });
    this.addHandlers();
    this.connectionPromise = this.hubConnection.start();
    this.connectionPromise.then((x) => this.joinGroups());

    return this.connectionPromise;
  }

  private joinGroups() {
    if (this.eventId) {
      this.joinEvent(this.eventId);
    }
  }
  public joinEvent(eventId: string) {
    this.hubConnection.invoke('JoinEvent', eventId);
  }
  public leaveEvent(eventId: string) {
    eventId = null;
    this.hubConnection.invoke('LeaveEvent', eventId);
  }
  public joinAdmin() {
    this.systemGroupJoined = true;
    this.startConnection().then((x) => this.hubConnection.invoke('JoinAdmin'));
  }
  public leaveAdmin() {
    this.systemGroupJoined = false;
    this.startConnection().then((x) => this.hubConnection.invoke('LeaveAdmin'));
  }
  private addHandlers() {
    this.addEventHandlers();
  }

  private addEventHandlers() {
    this.hubConnection.on('EventUpdated', (event: AlloyEvent) => {
      this.eventDataService.stateUpdate(event);
    });
    this.hubConnection.on('EventDeleted', (event: AlloyEvent) => {
      this.eventDataService.stateDelete(event);
    });
    this.hubConnection.on('EventCreated', (event: AlloyEvent) => {
      this.eventDataService.stateCreate(event);
    });

    this.hubConnection.on('EventTemplateUpdated', (template: EventTemplate) => {
      this.eventTemplateDataService.stateUpdate(template);
    });
    this.hubConnection.on('EventTemplateDeleted', (template: EventTemplate) => {
      this.eventTemplateDataService.stateDelete(template.id);
    });
    this.hubConnection.on('EventTemplateCreated', (template: EventTemplate) => {
      this.eventTemplateDataService.stateCreate(template);
    });
  }
}

class RetryPolicy {
  constructor(
    private maxSeconds: number,
    private minJitterSeconds: number,
    private maxJitterSeconds: number
  ) {}

  nextRetryDelayInMilliseconds(
    retryContext: signalR.RetryContext
  ): number | null {
    let nextRetrySeconds = Math.pow(2, retryContext.previousRetryCount + 1);

    if (nextRetrySeconds > this.maxSeconds) {
      nextRetrySeconds = this.maxSeconds;
    }

    nextRetrySeconds +=
      Math.floor(
        Math.random() * (this.maxJitterSeconds - this.minJitterSeconds + 1)
      ) + this.minJitterSeconds; // Add Jitter

    return nextRetrySeconds * 1000;
  }
}
