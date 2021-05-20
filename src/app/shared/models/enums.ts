// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

export enum ALLOY_ADMIN_VIEW {
  EVENT_TEMPLATES = 'event templates',
  EVENTS = 'events',
}

export enum ALLOY_CURRENT_EVENT_STATUS {
  LAUNCH,
  LAUNCHING,
  LAUNCHED,
  REDEPLOYING,
  ENDING,
  ENDED,
  FAILED,
}
