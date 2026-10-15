// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { CasterService, Directory } from 'src/app/generated/alloy.api';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { CasterDataService } from './caster-data-service';

function setup(
  directories: Directory[] = [],
  params: Record<string, string> = {},
) {
  const api = {
    getDirectories: vi.fn(() => of(directories)),
  } satisfies ApiStub<CasterService>;
  const { route, setQueryParams } = activatedRouteStub(params);
  const navigate = vi.fn<Router['navigate']>(() => Promise.resolve(true));
  TestBed.configureTestingModule({
    providers: [
      { provide: CasterService, useValue: api },
      {
        provide: Router,
        useValue: { navigate } satisfies Pick<Router, 'navigate'>,
      },
      { provide: ActivatedRoute, useValue: route },
    ],
  });
  return {
    service: TestBed.inject(CasterDataService),
    api,
    setQueryParams,
    navigate,
  };
}

// A two-level tree: Project > {Range, Lab > Week 1}. Only leaves are offered.
const tree = (): Directory[] => [
  { id: 'p', name: 'Project' },
  { id: 'r', name: 'Range', parentId: 'p' },
  { id: 'l', name: 'Lab', parentId: 'p' },
  { id: 'w', name: 'Week 1', parentId: 'l' },
];

describe('CasterDataService', () => {
  /**
   * Verifies: only leaf directories are listed, each named by its full path and sorted by that name.
   * Interacts with: CasterService.getDirectories (stubbed), directoryList.
   * Data: a Project with a Range leaf and a Lab folder holding Week 1.
   */
  it('lists leaf directories by full path', async () => {
    const { service } = setup(tree());

    service.getDirectoriesFromApi();

    expect(
      (await firstValueFrom(service.directoryList)).map((d) => d.name),
    ).toEqual(['Project - Lab - Week 1', 'Project - Range']);
  });

  /**
   * Verifies: a failed directory request leaves an empty list.
   * Interacts with: CasterService.getDirectories (error), directoryList.
   * Data: the API answers 502.
   */
  it('falls back to an empty list when the request fails', async () => {
    const { service, api } = setup();
    api.getDirectories.mockReturnValueOnce(throwError(() => ({ status: 502 })));

    service.getDirectoriesFromApi();

    expect(await firstValueFrom(service.directoryList)).toEqual([]);
  });

  /**
   * Verifies: the exmask query parameter filters the list case-insensitively by name or id.
   * Interacts with: ActivatedRoute.queryParamMap (activatedRouteStub), directoryList.
   * Data: the tree above; masks 'WEEK', then 'range'.
   */
  it('filters by the exmask query parameter', async () => {
    const { service, setQueryParams } = setup(tree(), { exmask: 'WEEK' });
    service.getDirectoriesFromApi();
    expect(
      (await firstValueFrom(service.directoryList)).map((d) => d.id),
    ).toEqual(['w']);

    setQueryParams({ exmask: 'range' });
    expect(
      (await firstValueFrom(service.directoryList)).map((d) => d.id),
    ).toEqual(['r']);
  });

  /**
   * Verifies: selectedDirectory follows the exId query parameter, and is undefined when the id is absent or not listed.
   * Interacts with: ActivatedRoute.queryParamMap (activatedRouteStub), selectedDirectory.
   * Data: exId 'w', then 'p' (a parent, so not listed), then no exId.
   */
  it('selects the directory named by exId', async () => {
    const { service, setQueryParams } = setup(tree(), { exId: 'w' });
    service.getDirectoriesFromApi();
    expect((await firstValueFrom(service.selectedDirectory))?.id).toBe('w');

    setQueryParams({ exId: 'p' });
    expect(await firstValueFrom(service.selectedDirectory)).toBeUndefined();

    setQueryParams({});
    expect(await firstValueFrom(service.selectedDirectory)).toBeUndefined();
  });

  /**
   * Verifies: typing in the filter control and picking a directory both merge into the URL query parameters.
   * Interacts with: directoryFilter (UntypedFormControl), Router.navigate spy.
   * Data: filter term 'lab'; selected directory 'w'.
   */
  it('writes the filter and the selection to the URL', () => {
    const { service, navigate } = setup();

    service.directoryFilter.setValue('lab');
    service.selectDirectory('w');

    expect(navigate).toHaveBeenNthCalledWith(1, [], {
      queryParams: { exmask: 'lab' },
      queryParamsHandling: 'merge',
    });
    expect(navigate).toHaveBeenNthCalledWith(2, [], {
      queryParams: { exId: 'w' },
      queryParamsHandling: 'merge',
    });
  });
});
