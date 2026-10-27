// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  ApplicationConfig,
  ErrorHandler,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { environment } from '../environments/environment';
import { SignalRService } from './shared/signalr/signalr.service';
import { ErrorService } from './shared/error/error.service';
import { SystemMessageService } from './shared/system-message/system-message.service';
import { BASE_PATH } from './generated/alloy.api';
import {
  ComnSettingsService,
  provideCrucibleTheme,
  ComnAuthModule,
  ComnSettingsModule,
} from '@cmusei/crucible-common';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { provideRouter } from '@angular/router';
import { ROUTES } from './app.routes';
import { provideNativeDateAdapter } from '@angular/material/core';
import { A11yModule } from '@angular/cdk/a11y';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    importProvidersFrom(
      environment.production ? [] : AkitaNgDevtools.forRoot(),
      ComnAuthModule.forRoot(),
      ComnSettingsModule.forRoot(),
      A11yModule,
    ),
    SignalRService,
    SystemMessageService,
    {
      provide: ErrorHandler,
      useClass: ErrorService,
    },
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    provideRouter(ROUTES),
    provideNativeDateAdapter(),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptorsFromDi()),
    provideCrucibleTheme({ brand: { color: '#006B6D', text: '#FFFFFF' } }),
  ],
};
