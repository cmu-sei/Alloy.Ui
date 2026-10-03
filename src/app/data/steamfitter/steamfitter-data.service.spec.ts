// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import {
  ScenarioTemplate,
  SteamfitterService,
} from 'src/app/generated/alloy.api';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { SteamfitterDataService } from './steamfitter-data.service';

const templates = (): ScenarioTemplate[] => [
  { id: 's2', name: 'Phishing' },
  { id: 's1', name: 'baseline' },
];

function setup(params: Record<string, string> = {}) {
  const api = {
    getScenarioTemplates: vi.fn(() => of(templates())),
  } satisfies ApiStub<SteamfitterService>;
  const { route, setQueryParams } = activatedRouteStub(params);
  const navigate = vi.fn<Router['navigate']>(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: SteamfitterService, useValue: api },
      {
        provide: Router,
        useValue: { navigate } satisfies Pick<Router, 'navigate'>,
      },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return {
    service: TestBed.inject(SteamfitterDataService),
    api,
    setQueryParams,
    navigate,
  };
}

describe('SteamfitterDataService', () => {
  /**
   * Verifies: scenario templates are listed sorted case-insensitively by name.
   * Interacts with: SteamfitterService.getScenarioTemplates (stubbed), scenarioTemplateList.
   * Data: two templates out of order.
   */
  it('lists scenario templates sorted by name', async () => {
    const { service } = setup();

    service.getScenarioTemplatesFromApi();

    expect(
      (await firstValueFrom(service.scenarioTemplateList)).map((t) => t.id),
    ).toEqual(['s1', 's2']);
  });

  /**
   * Verifies: a failed request leaves an empty list.
   * Interacts with: SteamfitterService.getScenarioTemplates (error), scenarioTemplateList.
   * Data: the API answers 500.
   */
  it('falls back to an empty list when the request fails', async () => {
    const { service, api } = setup();
    api.getScenarioTemplates.mockReturnValueOnce(
      throwError(() => ({ status: 500 })),
    );

    service.getScenarioTemplatesFromApi();

    expect(await firstValueFrom(service.scenarioTemplateList)).toEqual([]);
  });

  /**
   * Verifies: stMask filters the list and stId selects a template from it.
   * Interacts with: ActivatedRoute.queryParamMap (activatedRouteStub), scenarioTemplateList, selectedScenarioTemplate.
   * Data: stMask 'PHISH' and stId 's2', then stId 's1' with the mask still hiding it.
   */
  it('filters by stMask and selects by stId', async () => {
    const { service, setQueryParams } = setup({ stMask: 'PHISH', stId: 's2' });
    service.getScenarioTemplatesFromApi();

    expect((await firstValueFrom(service.selectedScenarioTemplate))?.id).toBe(
      's2',
    );

    setQueryParams({ stMask: 'PHISH', stId: 's1' });
    expect(
      await firstValueFrom(service.selectedScenarioTemplate),
    ).toBeUndefined();
  });

  /**
   * Verifies: the filter control and selectScenarioTemplate write stMask and stId into the URL.
   * Interacts with: scenarioTemplateFilter (UntypedFormControl), Router.navigate spy.
   * Data: filter 'base'; template 's1'.
   */
  it('writes the filter and selection to the URL', () => {
    const { service, navigate } = setup();

    service.scenarioTemplateFilter.setValue('base');
    service.selectScenarioTemplate('s1');

    expect(navigate.mock.calls.map(([, extras]) => extras)).toEqual([
      { queryParams: { stMask: 'base' }, queryParamsHandling: 'merge' },
      { queryParams: { stId: 's1' }, queryParamsHandling: 'merge' },
    ]);
  });
});
