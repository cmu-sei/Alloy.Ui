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
import {
  EventTemplate,
  EventTemplateMembership,
  Event as AlloyEvent,
  EventMembership,
  GroupMembership,
} from 'src/app/generated/alloy.api';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { EventTemplateMembershipDataService } from 'src/app/data/event-template/event-template-membership-data.service';
import { EventDataService } from 'src/app/data/event/event-data.service';
import { EventMembershipDataService } from 'src/app/data/event/event-membership-data.service';
import { GroupMembershipService } from 'src/app/data/group/group-membership.service';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection: SignalR.HubConnection;
  private eventIds = new Set<string>();
  private connectionObservable: Observable<SignalR.HubConnection>;
  private connectionPromise: Promise<void>;
  private systemGroupJoined = false;

  constructor(
    private authService: ComnAuthService,
    private eventDataService: EventDataService,
    private eventMembershipDataService: EventMembershipDataService,
    private eventTemplateDataService: EventTemplateDataService,
    private eventTemplateMembershipDataService: EventTemplateMembershipDataService,
    private groupMembershipService: GroupMembershipService,
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
    if (!this.isConnected()) {
      // onreconnected() replays the joins, so there is nothing to do while the socket is down
      return;
    }

    this.eventIds.forEach((eventId) =>
      this.hubConnection.invoke('JoinEvent', eventId)
    );
  }

  private isConnected(): boolean {
    return this.hubConnection?.state === SignalR.HubConnectionState.Connected;
  }

  /**
   * The server only sends EventUpdated to the event's own group, so an event whose group
   * was never joined - or was joined and then dropped by a reconnect - silently stops
   * reporting status. Record the id so joinGroups() can replay it both on connect and on
   * every automatic reconnect. A user viewing their own event alongside events they were
   * invited to needs several groups at once, so this is a set rather than a single id.
   */
  public joinEvent(eventId: string): Promise<void> {
    const alreadyStarted = this.connectionPromise != null;
    this.eventIds.add(eventId);

    // startConnection() calls joinGroups() itself the first time through, so only replay
    // the joins here when the connection was already up.
    return alreadyStarted
      ? this.startConnection().then(() => this.joinGroups())
      : this.startConnection();
  }

  public leaveEvent(eventId: string): Promise<void> {
    this.eventIds.delete(eventId);

    return this.startConnection().then(() => {
      if (this.isConnected()) {
        this.hubConnection.invoke('LeaveEvent', eventId);
      }
    });
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
    this.hubConnection.on(
      'EventMembershipCreated',
      (eventMembership: EventMembership) => {
        this.eventMembershipDataService.updateStore(eventMembership);
      }
    );

    this.hubConnection.on(
      'EventMembershipUpdated',
      (eventMembership: EventMembership) => {
        this.eventMembershipDataService.updateStore(eventMembership);
      }
    );

    this.hubConnection.on('EventMembershipDeleted', (id: string) => {
      this.eventMembershipDataService.deleteFromStore(id);
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
    this.hubConnection.on(
      'EventTemplateMembershipCreated',
      (eventTemplateMembership: EventTemplateMembership) => {
        this.eventTemplateMembershipDataService.updateStore(
          eventTemplateMembership
        );
      }
    );

    this.hubConnection.on(
      'EventTemplateMembershipUpdated',
      (eventTemplateMembership: EventTemplateMembership) => {
        this.eventTemplateMembershipDataService.updateStore(
          eventTemplateMembership
        );
      }
    );

    this.hubConnection.on('EventTemplateMembershipDeleted', (id: string) => {
      this.eventTemplateMembershipDataService.deleteFromStore(id);
    });
    this.hubConnection.on(
      'GroupMembershipCreated',
      (groupMembership: GroupMembership) => {
        this.groupMembershipService.updateStore(groupMembership);
      }
    );

    this.hubConnection.on(
      'GroupMembershipUpdated',
      (groupMembership: GroupMembership) => {
        this.groupMembershipService.updateStore(groupMembership);
      }
    );

    this.hubConnection.on('GroupMembershipDeleted', (id: string) => {
      this.groupMembershipService.deleteFromStore(id);
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
