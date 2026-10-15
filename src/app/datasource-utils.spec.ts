// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { EventEmitter } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { firstValueFrom, of, Subject } from 'rxjs';
import { recordEmissions } from './test-utils/record-emissions';
import {
  fromMatPaginator,
  fromMatSort,
  paginateRows,
  SimpleDataSource,
  sortRows,
} from './datasource-utils';

interface Row {
  name: string | null;
  size?: number;
}

const rows = (): Row[] => [
  { name: 'bravo', size: 2 },
  { name: null, size: 9 },
  { name: 'alpha', size: 3 },
  { name: 'charlie' },
];

const sortBy = (active: string, direction: Sort['direction']) =>
  of<Sort>({ active, direction });

describe('sortRows', () => {
  /**
   * Verifies: with no active column or no direction the rows pass through in their original order.
   * Interacts with: sortRows.
   * Data: four rows; sorts with an empty direction and with no active column.
   */
  it('leaves rows alone without an active sort', async () => {
    const input = rows();
    expect(
      await firstValueFrom(of(input).pipe(sortRows(sortBy('name', '')))),
    ).toBe(input);
    expect(
      await firstValueFrom(of(input).pipe(sortRows(sortBy('', 'asc')))),
    ).toBe(input);
  });

  /**
   * Verifies: the default sort orders by the property ascending with null first, without mutating the input.
   * Interacts with: sortRows default comparator.
   * Data: names bravo, null, alpha, charlie.
   */
  it('sorts ascending by property with nulls first', async () => {
    const input = rows();

    const sorted = await firstValueFrom(
      of(input).pipe(sortRows(sortBy('name', 'asc'))),
    );

    expect(sorted.map((r) => r.name)).toEqual([
      null,
      'alpha',
      'bravo',
      'charlie',
    ]);
    expect(input.map((r) => r.name)).toEqual([
      'bravo',
      null,
      'alpha',
      'charlie',
    ]);
  });

  /**
   * Verifies: descending reverses the comparator, and undefined sorts with null.
   * Interacts with: sortRows default comparator.
   * Data: sizes 2, 9, 3 and one missing.
   */
  it('sorts descending, treating undefined like null', async () => {
    const sorted = await firstValueFrom(
      of(rows()).pipe(sortRows(sortBy('size', 'desc'))),
    );

    expect(sorted.map((r) => r.size)).toEqual([9, 3, 2, undefined]);
  });

  /**
   * Verifies: a supplied comparator for the active column is used instead of the default.
   * Interacts with: sortRows sortFns map.
   * Data: a name comparator by string length.
   */
  it('uses a custom comparator for its column', async () => {
    const byLength = (a: Row, b: Row) =>
      (a.name?.length ?? 0) - (b.name?.length ?? 0);

    const sorted = await firstValueFrom(
      of(rows()).pipe(sortRows(sortBy('name', 'asc'), { name: byLength })),
    );

    expect(sorted.map((r) => r.name)).toEqual([
      null,
      'bravo',
      'alpha',
      'charlie',
    ]);
  });

  /**
   * Verifies: with useDefault=false an unknown column errors the stream.
   * Interacts with: sortRows (useDefault false).
   * Data: active column 'size' with no comparator supplied.
   */
  it('errors on an unknown column when defaults are disabled', async () => {
    await expect(
      firstValueFrom(
        of(rows()).pipe(sortRows(sortBy('size', 'asc'), {}, false)),
      ),
    ).rejects.toThrow('Unknown sort property [size]');
  });
});

describe('paginateRows', () => {
  /**
   * Verifies: each page event slices out that page of rows.
   * Interacts with: paginateRows, a Subject of PageEvents, recordEmissions.
   * Data: five rows, page size 2, pages 0 and 2.
   */
  it('emits the rows of the current page', () => {
    const page$ = new Subject<PageEvent>();
    const seen = recordEmissions(of([1, 2, 3, 4, 5]).pipe(paginateRows(page$)));

    page$.next({ pageIndex: 0, pageSize: 2, length: 5 });
    page$.next({ pageIndex: 2, pageSize: 2, length: 5 });

    expect(seen).toEqual([[1, 2], [5]]);
  });
});

describe('fromMatSort and fromMatPaginator', () => {
  /**
   * Verifies: fromMatSort emits the sort's current state on subscribe, then each sortChange.
   * Interacts with: fromMatSort, a MatSort stand-in, recordEmissions.
   * Data: an initial name/asc sort, then a size/desc change.
   */
  it('fromMatSort starts with the current sort', () => {
    const sortChange = new EventEmitter<Sort>();
    const sort: Pick<MatSort, 'active' | 'direction' | 'sortChange'> = {
      active: 'name',
      direction: 'asc',
      sortChange,
    };
    const seen = recordEmissions(fromMatSort(sort as MatSort));

    sortChange.emit({ active: 'size', direction: 'desc' });

    expect(seen).toEqual([
      { active: 'name', direction: 'asc' },
      { active: 'size', direction: 'desc' },
    ]);
  });

  /**
   * Verifies: fromMatPaginator emits the paginator's current page on subscribe, then each page event.
   * Interacts with: fromMatPaginator, a MatPaginator stand-in, recordEmissions.
   * Data: page 0 of size 10, then page 1.
   */
  it('fromMatPaginator starts with the current page', () => {
    const page = new EventEmitter<PageEvent>();
    const paginator: Pick<
      MatPaginator,
      'pageIndex' | 'pageSize' | 'length' | 'page'
    > = {
      pageIndex: 0,
      pageSize: 10,
      length: 42,
      page,
    };
    const seen = recordEmissions(fromMatPaginator(paginator as MatPaginator));

    page.emit({ pageIndex: 1, pageSize: 10, length: 42 });

    expect(seen.map((p) => p.pageIndex)).toEqual([0, 1]);
  });
});

describe('SimpleDataSource', () => {
  /**
   * Verifies: the table connected to a SimpleDataSource sees every row list its source emits, in order.
   * Interacts with: SimpleDataSource.connect, recordEmissions.
   * Data: a subject that emits two rows, then one.
   */
  it('passes every row list from its source to the table', () => {
    const rows$ = new Subject<Row[]>();
    const source = new SimpleDataSource(rows$);
    const seen = recordEmissions(source.connect(null));

    rows$.next([{ name: 'a' }, { name: 'b' }]);
    rows$.next([{ name: 'c' }]);

    expect(seen.map((rows) => rows.map((r) => r.name))).toEqual([
      ['a', 'b'],
      ['c'],
    ]);
  });
});
