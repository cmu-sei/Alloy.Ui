// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { NgModule } from '@angular/core';
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
import { AdminGroupsComponent } from './components/admin-app/admin-groups/admin-groups.component';
import { AdminGroupsDetailComponent } from './components/admin-app/admin-groups/admin-groups-detail/admin-groups-detail.component';
import { AdminGroupsMemberListComponent } from './components/admin-app/admin-groups/admin-groups-member-list/admin-groups-member-list.component';
import { AdminGroupsMembershipListComponent } from './components/admin-app/admin-groups/admin-groups-membership-list/admin-groups-membership-list.component';
import { AdminRolesComponent } from './components/admin-app/admin-roles/admin-roles.component';
import { AdminEventRolesComponent } from './components/admin-app/admin-roles/admin-event-roles/admin-event-roles.component';
import { AdminEventTemplateRolesComponent } from './components/admin-app/admin-roles/admin-event-template-roles/admin-event-template-roles.component';
import { AdminSystemRolesComponent } from './components/admin-app/admin-roles/admin-system-roles/admin-system-roles.component';
import { AdminUserListComponent } from './components/admin-app/admin-users/admin-user-list/admin-user-list.component';
import { AdminUsersComponent } from './components/admin-app/admin-users/admin-users.component';
import { EventTemplateEditComponent } from './components/admin-app/event-templates/event-template-edit/event-template-edit.component';
import { EventTemplateListComponent } from './components/admin-app/event-templates/event-template-list/event-template-list.component';
import { EventTemplatesComponent } from './components/admin-app/event-templates/event-templates.component';
import { EventEditComponent } from './components/admin-app/events/event-edit/event-edit.component';
import { AdminEventListComponent } from './components/admin-app/events/event-list/event-list.component';
import { EventsComponent } from './components/admin-app/events/events.component';
import { EnlistComponent } from './components/home-app/enlist/enlist.component';
import { EventListComponent } from './components/home-app/event-list/event-list.component';
import { EventTemplateInfoComponent } from './components/home-app/event-template-info/event-template-info.component';
import { EventTemplateMembershipsComponent } from './components/admin-app/event-templates/event-template-memberships/event-template-memberships/event-template-memberships.component';
import { EventTemplateMemberListComponent } from './components/admin-app/event-templates/event-template-memberships/event-template-member-list/event-template-member-list.component';
import { EventTemplateMembershipsPageComponent } from './components/admin-app/event-templates/event-template-memberships/event-template-memberships-page/event-template-memberships-page.component';
import { EventTemplateMembershipListComponent } from './components/admin-app/event-templates/event-template-memberships/event-template-membership-list/event-template-membership-list.component';
import { EventMembershipsComponent } from './components/admin-app/events/event-memberships/event-memberships/event-memberships.component';
import { EventMemberListComponent } from './components/admin-app/events/event-memberships/event-member-list/event-member-list.component';
import { EventMembershipsPageComponent } from './components/admin-app/events/event-memberships/event-memberships-page/event-memberships-page.component';
import { EventMembershipListComponent } from './components/admin-app/events/event-memberships/event-membership-list/event-membership-list.component';
import { HomeAppComponent } from './components/home-app/home-app.component';
import { NameDialogComponent } from './shared/name-dialog/name-dialog.component';
import { ConfirmDialogComponent } from './components/shared/confirm-dialog/components/confirm-dialog.component';
import { TopbarComponent } from './components/shared/top-bar/topbar.component';
import { BASE_PATH } from './generated/alloy.api';
import { ApiModule as SwaggerCodegenApiModule } from './generated/alloy.api/api.module';
import { DialogService } from './services/dialog/dialog.service';
import { SignalRService } from './shared/signalr/signalr.service';

const settings: ComnSettingsConfig = {
  url: 'assets/config/settings.json',
  envUrl: 'assets/config/settings.env.json',
};

@NgModule({
  exports: [MatSortModule],
})
export class AngularMaterialModule {}

@NgModule({ declarations: [
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
        EventTemplateMemberListComponent,
        EventTemplateMembershipListComponent,
        EventTemplateMembershipsComponent,
        EventTemplateMembershipsPageComponent,
        EventMemberListComponent,
        EventMembershipListComponent,
        EventMembershipsComponent,
        EventMembershipsPageComponent,
        ConfirmDialogComponent,
        TopbarComponent,
        EnlistComponent,
        AdminGroupsComponent,
        AdminGroupsDetailComponent,
        AdminGroupsMemberListComponent,
        AdminGroupsMembershipListComponent,
        AdminRolesComponent,
        AdminEventRolesComponent,
        AdminEventTemplateRolesComponent,
        EventsComponent,
        EventTemplatesComponent,
        AdminSystemRolesComponent,
        AdminUsersComponent,
        AdminUserListComponent,
        NameDialogComponent,
    ],
    bootstrap: [AppComponent], imports: [AkitaNgDevtools.forRoot(),
        AkitaNgRouterStoreModule,
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
        MatDatepickerModule,
        MatTreeModule,
        ClipboardModule,
        ComnAuthModule.forRoot(),
        ComnSettingsModule.forRoot()], providers: [
        SignalRService,
        {
            provide: BASE_PATH,
            useFactory: getBasePath,
            deps: [ComnSettingsService],
        },
        DialogService,
        provideHttpClient(withInterceptorsFromDi()),
    ] })
export class AppModule {}

export function getBasePath(settingsSvc: ComnSettingsService) {
  return settingsSvc.settings.ApiUrl;
}
