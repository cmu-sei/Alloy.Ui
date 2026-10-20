// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
import { Routes } from '@angular/router';
import { ComnAuthGuardService } from '@cmusei/crucible-common';

export const ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./components/home-app/home-app.component').then(
        (m) => m.HomeAppComponent,
      ),
    canActivate: [ComnAuthGuardService],
    pathMatch: 'full',
  },
  {
    path: 'templates',
    loadComponent: () =>
      import('./components/home-app/event-template-info/event-template-info.component').then(
        (m) => m.EventTemplateInfoComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'templates/:id',
    loadComponent: () =>
      import('./components/home-app/event-template-info/event-template-info.component').then(
        (m) => m.EventTemplateInfoComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'templates/:id/view/:viewId',
    loadComponent: () =>
      import('./components/home-app/event-template-info/event-template-info.component').then(
        (m) => m.EventTemplateInfoComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'events',
    loadComponent: () =>
      import('./components/home-app/home-app.component').then(
        (m) => m.HomeAppComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'events/:id',
    loadComponent: () =>
      import('./components/home-app/home-app.component').then(
        (m) => m.HomeAppComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'exercise/:viewId',
    loadComponent: () =>
      import('./components/home-app/home-app.component').then(
        (m) => m.HomeAppComponent,
      ),
    canActivate: [ComnAuthGuardService],
  }, // DEPRECATED, remove when no longer in use
  {
    path: 'view/:viewId',
    loadComponent: () =>
      import('./components/home-app/home-app.component').then(
        (m) => m.HomeAppComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'enlist/:code',
    loadComponent: () =>
      import('./components/home-app/enlist/enlist.component').then(
        (m) => m.EnlistComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
  {
    path: 'admin',
    loadComponent: () =>
      import('./components/admin-app/admin-app.component').then(
        (m) => m.AdminAppComponent,
      ),
    canActivate: [ComnAuthGuardService],
  },
];
