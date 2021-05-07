// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ComnAuthGuardService } from '@cmusei/crucible-common';
import { AdminAppComponent } from './components/admin-app/admin-app.component';
import { EnlistComponent } from './components/home-app/enlist/enlist.component';
import { EventTemplateInfoComponent } from './components/home-app/event-template-info/event-template-info.component';
import { HomeAppComponent } from './components/home-app/home-app.component';

export const ROUTES: Routes = [
  {
    path: '',
    component: HomeAppComponent,
    canActivate: [ComnAuthGuardService],
    pathMatch: 'full',
  },
  {
    path: 'templates',
    component: EventTemplateInfoComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'templates/:id',
    component: EventTemplateInfoComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'events',
    component: HomeAppComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'events/:id',
    component: HomeAppComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'exercise/:viewId',
    component: HomeAppComponent,
    canActivate: [ComnAuthGuardService],
  }, // DEPRECATED, remove when no longer in use
  {
    path: 'view/:viewId',
    component: HomeAppComponent,
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'enlist/:code',
    component: EnlistComponent,
    canActivate: [ComnAuthGuardService],
  },
  { path: 'admin', component: AdminAppComponent },
];

@NgModule({
  exports: [RouterModule],
  imports: [
    CommonModule,
    RouterModule.forRoot(ROUTES, { relativeLinkResolution: 'legacy' }),
  ],
})
export class AppRoutingModule {}
7;
