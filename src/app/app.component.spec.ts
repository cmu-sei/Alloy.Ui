// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatIconRegistry } from '@angular/material/icon';
import { of } from 'rxjs';
import {
  ComnAuthQuery,
  ComnAuthService,
  CrucibleThemeService,
  Theme,
} from '@cmusei/crucible-common';
import { activatedRouteStub } from './test-utils/activated-route';
import { renderComponent } from './test-utils/render-component';
import { AppComponent } from './app.component';

async function renderApp(
  options: { userTheme?: Theme; themeParam?: string } = {},
) {
  const applyTheme = vi.fn();
  const theme: Pick<CrucibleThemeService, 'applyTheme'> = { applyTheme };
  const setUserTheme = vi.fn();
  const auth: Pick<ComnAuthService, 'setUserTheme'> = { setUserTheme };
  const authQuery: Pick<ComnAuthQuery, 'userTheme$'> = {
    userTheme$: of(options.userTheme ?? Theme.LIGHT),
  };
  const navigate = vi.fn<Router['navigate']>(() => Promise.resolve(true));
  const { route } = activatedRouteStub(
    options.themeParam ? { theme: options.themeParam } : {},
  );
  const addSvgIcon = vi.spyOn(MatIconRegistry.prototype, 'addSvgIcon');
  const rendered = await renderComponent(AppComponent, {
    declarations: [AppComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA],
    providers: [
      // The real registry, so the icon registrations can be asserted.
      { provide: MatIconRegistry, useClass: MatIconRegistry },
      { provide: CrucibleThemeService, useValue: theme },
      { provide: ComnAuthService, useValue: auth },
      { provide: ComnAuthQuery, useValue: authQuery },
      { provide: ActivatedRoute, useValue: route },
      {
        provide: Router,
        useValue: { navigate } satisfies Pick<Router, 'navigate'>,
      },
    ],
  });
  return { ...rendered, applyTheme, setUserTheme, navigate, addSvgIcon };
}

describe('AppComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers, registers the app's SVG icons and applies the user's theme.
   * Interacts with: the real MatIconRegistry (addSvgIcon spy), ComnAuthQuery.userTheme$, CrucibleThemeService.applyTheme; the header bar is an unknown element under CUSTOM_ELEMENTS_SCHEMA.
   * Data: user theme light; no theme query parameter.
   */
  it('renders with the default test providers', async () => {
    const { fixture, applyTheme, addSvgIcon, setUserTheme } = await renderApp();

    expect(fixture.componentInstance).toBeInstanceOf(AppComponent);
    expect(fixture.nativeElement).toBeInTheDocument();
    expect(addSvgIcon).toHaveBeenCalledWith(
      'ic_crucible_alloy',
      expect.anything(),
    );
    expect(addSvgIcon).toHaveBeenCalledWith(
      'ic_clipboard_copy',
      expect.anything(),
    );
    expect(applyTheme).toHaveBeenCalledWith(Theme.LIGHT);
    expect(setUserTheme).not.toHaveBeenCalled();
  });

  /**
   * Verifies: a theme query parameter sets the user's theme (dark-theme to dark, anything else to light).
   * Interacts with: ActivatedRoute queryParamMap, ComnAuthService.setUserTheme.
   * Data: theme parameter 'dark-theme', then 'other'.
   */
  it.each([
    { param: 'dark-theme', expected: Theme.DARK },
    { param: 'other', expected: Theme.LIGHT },
  ])('sets the user theme from ?theme=$param', async ({ param, expected }) => {
    const { setUserTheme } = await renderApp({ themeParam: param });

    expect(setUserTheme).toHaveBeenCalledWith(expected);
  });
});
