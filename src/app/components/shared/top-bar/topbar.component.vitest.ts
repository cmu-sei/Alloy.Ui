// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { of, BehaviorSubject } from 'rxjs';
import { TopbarComponent } from './topbar.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { PermissionDataService } from 'src/app/data/permission/permission-data.service';
import { ComnAuthService, ComnAuthQuery } from '@cmusei/crucible-common';
import { CurrentUserQuery } from 'src/app/data/user/user.query';
import { TopbarView } from './topbar.models';

function mockPermission(canView = false) {
  return {
    provide: PermissionDataService,
    useValue: {
      load: () => of([]),
      permissions: [],
      hasPermission: () => false,
      canViewAdiminstration: () => canView,
    },
  };
}

async function renderTopbar(overrides: Record<string, any> = {}) {
  const logoutSpy = vi.fn();
  return renderComponent(TopbarComponent, {
    declarations: [TopbarComponent],
    providers: [
      mockPermission(overrides.canViewAdmin ?? false),
      {
        provide: ComnAuthService,
        useValue: {
          logout: logoutSpy,
          setUserTheme: vi.fn(),
          isAuthenticated$: of(true),
        },
      },
      {
        provide: ComnAuthQuery,
        useValue: {
          userTheme$: of('light-theme'),
        },
      },
      {
        provide: CurrentUserQuery,
        useValue: {
          select: () => of({ name: 'Test User' }),
        },
      },
    ],
    componentProperties: {
      title: overrides.title ?? 'Test Title',
      topbarView: overrides.topbarView ?? TopbarView.ALLOY_HOME,
      ...overrides,
    },
  });
}

describe('TopbarComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderTopbar();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display title from input', async () => {
    await renderTopbar({ title: 'My Alloy Title' });
    expect(screen.getByText('My Alloy Title')).toBeInTheDocument();
  });

  it('should display current user name', async () => {
    await renderTopbar();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('should set canViewAdmin from permission service', async () => {
    const { fixture } = await renderTopbar({ canViewAdmin: true });
    fixture.detectChanges();
    expect(fixture.componentInstance.canViewAdmin).toBe(true);
  });

  it('should set canViewAdmin to false when permission denies', async () => {
    const { fixture } = await renderTopbar({ canViewAdmin: false });
    fixture.detectChanges();
    expect(fixture.componentInstance.canViewAdmin).toBe(false);
  });

  it('should set topbarView from input', async () => {
    const { fixture } = await renderTopbar({
      topbarView: TopbarView.ALLOY_ADMIN,
    });
    expect(fixture.componentInstance.topbarView).toBe(TopbarView.ALLOY_ADMIN);
  });

  it('should emit sidenavToggle when sidenavToggleFn called', async () => {
    const { fixture } = await renderTopbar({ sidenav: { opened: false } });
    const emitSpy = vi.spyOn(fixture.componentInstance.sidenavToggle, 'emit');
    fixture.componentInstance.sidenavToggleFn();
    expect(emitSpy).toHaveBeenCalledWith(true);
  });

  it('should call logout on ComnAuthService when logout called', async () => {
    const { fixture } = await renderTopbar();
    const authService = fixture.debugElement.injector.get(ComnAuthService);
    fixture.componentInstance.logout();
    expect(authService.logout).toHaveBeenCalled();
  });

  it('should call setUserTheme when themeFn called', async () => {
    const { fixture } = await renderTopbar();
    const authService = fixture.debugElement.injector.get(ComnAuthService);
    fixture.componentInstance.themeFn({ checked: true });
    expect(authService.setUserTheme).toHaveBeenCalled();
  });
});
