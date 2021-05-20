// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { HttpClientModule } from '@angular/common/http';
import { NgModule } from '@angular/core';
import { FlexLayoutModule } from '@angular/flex-layout';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatBadgeModule } from '@angular/material/badge';
import { MatBottomSheetModule } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import {
  ComnAuthModule,
  ComnSettingsConfig,
  ComnSettingsModule,
  ComnSettingsService,
} from '@cmusei/crucible-common';
import { AkitaNgRouterStoreModule } from '@datorama/akita-ng-router-store';
import { AkitaNgDevtools } from '@datorama/akita-ngdevtools';
import { ClipboardModule } from 'ngx-clipboard';
import { environment } from '../environments/environment';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { AdminAppComponent } from './components/admin-app/admin-app.component';
import { EventTemplateEditComponent } from './components/admin-app/event-templates/event-template-edit/event-template-edit.component';
import { EventTemplateListComponent } from './components/admin-app/event-templates/event-template-list/event-template-list.component';
import { EventTemplatesComponent } from './components/admin-app/event-templates/event-templates.component';
import { EventEditComponent } from './components/admin-app/events/event-edit/event-edit.component';
import { AdminEventListComponent } from './components/admin-app/events/event-list/event-list.component';
import { EventsComponent } from './components/admin-app/events/events.component';
import { EnlistComponent } from './components/home-app/enlist/enlist.component';
import { EventListComponent } from './components/home-app/event-list/event-list.component';
import { EventTemplateInfoComponent } from './components/home-app/event-template-info/event-template-info.component';
import { HomeAppComponent } from './components/home-app/home-app.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/confirm-dialog.component';
import { TopbarComponent } from './components/shared/top-bar/topbar.component';
import { BASE_PATH } from './generated/alloy.api';
import { ApiModule as SwaggerCodegenApiModule } from './generated/alloy.api/api.module';
import { DialogService } from './services/dialog/dialog.service';
import { LoggedInUserService } from './services/logged-in-user/logged-in-user.service';
import { SignalRService } from './shared/signalr/signalr.service';

const settings: ComnSettingsConfig = {
  url: 'assets/config/settings.json',
  envUrl: 'assets/config/settings.env.json',
};

@NgModule({
  exports: [
    MatAutocompleteModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatChipsModule,
    MatStepperModule,
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
    MatBottomSheetModule,
    MatTreeModule,
    MatBadgeModule,
  ],
})
export class AngularMaterialModule {}

@NgModule({
  declarations: [
    AppComponent,
    AdminAppComponent,
    HomeAppComponent,
    EventListComponent,
    EventTemplateInfoComponent,
    EventTemplatesComponent,
    EventTemplateListComponent,
    EventTemplateEditComponent,
    EventsComponent,
    AdminEventListComponent,
    EventEditComponent,
    ConfirmDialogComponent,
    TopbarComponent,
    EnlistComponent,
  ],
  imports: [
    HttpClientModule,
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    AngularMaterialModule,
    FlexLayoutModule,
    FormsModule,
    ReactiveFormsModule,
    SwaggerCodegenApiModule,
    ClipboardModule,
    environment.production ? [] : AkitaNgDevtools.forRoot(),
    AkitaNgRouterStoreModule,
    ComnSettingsModule.forRoot(),
    ComnAuthModule.forRoot(),
  ],
  providers: [
    LoggedInUserService,
    SignalRService,
    {
      provide: BASE_PATH,
      useFactory: getBasePath,
      deps: [ComnSettingsService],
    },
    DialogService,
  ],
  bootstrap: [AppComponent],
  entryComponents: [
    EventTemplateEditComponent,
    EventEditComponent,
    ConfirmDialogComponent,
  ],
})
export class AppModule {}

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}
