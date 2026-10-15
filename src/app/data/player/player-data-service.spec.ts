// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { PlayerService, View } from 'src/app/generated/alloy.api';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { PlayerDataService } from './player-data-service';

const views = (): View[] => [
  { id: 'v2', name: 'Zeta Range', isTemplate: true },
  { id: 'v1', name: 'alpha range', isTemplate: true },
  { id: 'v3', name: 'Live Exercise', isTemplate: false },
];

function setup(params: Record<string, string> = {}) {
  const api = {
    getViews: vi.fn(() => of(views())),
  } satisfies ApiStub<PlayerService>;
  const { route, setQueryParams } = activatedRouteStub(params);
  const navigate = vi.fn<Router['navigate']>(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: PlayerService, useValue: api },
      {
        provide: Router,
        useValue: { navigate } satisfies Pick<Router, 'navigate'>,
      },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return {
    service: TestBed.inject(PlayerDataService),
    api,
    setQueryParams,
    navigate,
  };
}

describe('PlayerDataService', () => {
  /**
   * Verifies: only template views are offered, sorted case-insensitively by name.
   * Interacts with: PlayerService.getViews (stubbed), viewList.
   * Data: two template views and one live view.
   */
  it('lists template views sorted by name', async () => {
    const { service } = setup();

    service.getViewsFromApi();

    expect((await firstValueFrom(service.viewList)).map((v) => v.id)).toEqual([
      'v1',
      'v2',
    ]);
  });

  /**
   * Verifies: a failed request leaves an empty list.
   * Interacts with: PlayerService.getViews (error), viewList.
   * Data: the API answers 401.
   */
  it('falls back to an empty list when the request fails', async () => {
    const { service, api } = setup();
    api.getViews.mockReturnValueOnce(throwError(() => ({ status: 401 })));

    service.getViewsFromApi();

    expect(await firstValueFrom(service.viewList)).toEqual([]);
  });

  /**
   * Verifies: viewMask filters by name or id, and viewId selects a listed view.
   * Interacts with: ActivatedRoute.queryParamMap (activatedRouteStub), viewList, selectedView.
   * Data: viewMask 'ZETA' with viewId 'v2', then viewId 'v3' (not a template, so not listed).
   */
  it('filters by viewMask and selects by viewId', async () => {
    const { service, setQueryParams } = setup({
      viewMask: 'ZETA',
      viewId: 'v2',
    });
    service.getViewsFromApi();

    expect((await firstValueFrom(service.viewList)).map((v) => v.id)).toEqual([
      'v2',
    ]);
    expect((await firstValueFrom(service.selectedView))?.id).toBe('v2');

    setQueryParams({ viewId: 'v3' });
    expect(await firstValueFrom(service.selectedView)).toBeUndefined();
  });

  /**
   * Verifies: the filter control and selectView write viewMask and viewId into the URL.
   * Interacts with: viewFilter (UntypedFormControl), Router.navigate spy.
   * Data: filter 'range'; view 'v1'.
   */
  it('writes the filter and selection to the URL', () => {
    const { service, navigate } = setup();

    service.viewFilter.setValue('range');
    service.selectView('v1');

    expect(navigate.mock.calls.map(([, extras]) => extras)).toEqual([
      { queryParams: { viewMask: 'range' }, queryParamsHandling: 'merge' },
      { queryParams: { viewId: 'v1' }, queryParamsHandling: 'merge' },
    ]);
  });
});
