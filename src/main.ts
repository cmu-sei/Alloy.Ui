// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {
  enableProdMode,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { enableAkitaProdMode, persistState } from '@datorama/akita';
import { getBasePath } from './app/app.module';
import { environment } from './environments/environment';
import { SignalRService } from './app/shared/signalr/signalr.service';
import { BASE_PATH } from './app/generated/alloy.api';
import {
  ComnSettingsService,
  provideCrucibleTheme,
  ComnAuthModule,
  ComnSettingsModule,
  ComnHeaderBarModule,
  CRUCIBLE_DIALOG_IMPORTS,
} from '@cmusei/crucible-common';
import {
  provideHttpClient,
  withInterceptorsFromDi,
} from '@angular/common/http';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ApiModule as SwaggerCodegenApiModule } from './app/generated/alloy.api/api.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatNativeDateModule } from '@angular/material/core';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSliderModule } from '@angular/material/slider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatStepperModule } from '@angular/material/stepper';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTreeModule } from '@angular/material/tree';
import { ClipboardModule } from 'ngx-clipboard';
import { A11yModule } from '@angular/cdk/a11y';
import { AppComponent } from './app/app.component';

export const storage = persistState({
  key: 'akita-alloy-ui',
  include: ['auth.ui'],
});

if (environment.production) {
  enableProdMode();
  enableAkitaProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    importProvidersFrom(
      environment.production ? [] : AkitaNgDevtools.forRoot(),
      BrowserModule,
      AppRoutingModule,
      BrowserAnimationsModule,
      SwaggerCodegenApiModule,
      FormsModule,
      ReactiveFormsModule,
      MatAutocompleteModule,
      MatButtonModule,
      MatButtonToggleModule,
      MatCardModule,
      MatCheckboxModule,
      MatChipsModule,
      MatDatepickerModule,
      MatDialogModule,
      MatExpansionModule,
      MatGridListModule,
      MatIconModule,
      MatInputModule,
      MatListModule,
      MatMenuModule,
      MatNativeDateModule,
      MatPaginatorModule,
      MatProgressBarModule,
      MatProgressSpinnerModule,
      MatRadioModule,
      MatSelectModule,
      MatSidenavModule,
      MatSliderModule,
      MatSlideToggleModule,
      MatSnackBarModule,
      MatSortModule,
      MatTableModule,
      MatTabsModule,
      MatToolbarModule,
      MatTooltipModule,
      MatStepperModule,
      MatBottomSheetModule,
      MatBadgeModule,
      MatTreeModule,
      ClipboardModule,
      ComnAuthModule.forRoot(),
      ComnSettingsModule.forRoot(),
      ComnHeaderBarModule,
      A11yModule,
      ...CRUCIBLE_DIALOG_IMPORTS,
    ),
    SignalRService,
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    provideHttpClient(withInterceptorsFromDi()),
    provideCrucibleTheme({ brand: { color: '#006B6D', text: '#FFFFFF' } }),
  ],
}).catch((err) => console.log(err));
