// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Type, Provider, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { render, RenderComponentOptions } from '@testing-library/angular';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatListModule } from '@angular/material/list';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { getDefaultProviders } from './vitest-default-providers';

/** Default Material + common modules included in every test render */
const DEFAULT_IMPORTS = [
  NoopAnimationsModule,
  FormsModule,
  ReactiveFormsModule,
  MatButtonModule,
  MatCardModule,
  MatCheckboxModule,
  MatDialogModule,
  MatExpansionModule,
  MatFormFieldModule,
  MatIconModule,
  MatInputModule,
  MatListModule,
  MatMenuModule,
  MatPaginatorModule,
  MatProgressBarModule,
  MatProgressSpinnerModule,
  MatSelectModule,
  MatSidenavModule,
  MatSlideToggleModule,
  MatSnackBarModule,
  MatSortModule,
  MatTableModule,
  MatTabsModule,
  MatToolbarModule,
  MatTooltipModule,
];

/**
 * Wraps @testing-library/angular's `render()` with project-wide defaults.
 *
 * Automatically provides:
 * - Common Material modules
 * - CUSTOM_ELEMENTS_SCHEMA
 * - All default mock providers (overridable via `providers`)
 */
export async function renderComponent<T>(
  component: Type<T>,
  options: RenderComponentOptions<T> = {}
) {
  const defaultProviders = getDefaultProviders();

  // Merge providers: user-supplied providers override defaults for the same token
  const userProviders: Provider[] = (options.providers as Provider[]) || [];
  const userTokens = new Set(
    userProviders.map((p: any) => p.provide ?? p)
  );
  const mergedProviders = [
    ...defaultProviders.filter((p: any) => !userTokens.has(p.provide ?? p)),
    ...userProviders,
  ];

  return render(component, {
    ...options,
    imports: [...DEFAULT_IMPORTS, ...(options.imports || [])],
    providers: mergedProviders,
    schemas: [CUSTOM_ELEMENTS_SCHEMA, ...(options.schemas || [])],
  });
}
