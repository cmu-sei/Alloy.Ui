// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import {
  EventTemplate,
  EventTemplateService,
} from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventListComponent } from './event-list.component';

async function renderEventList(templates: EventTemplate[]) {
  const templateApi = {
    getEventTemplates: vi.fn(() => of(structuredClone(templates))),
  } satisfies ApiStub<EventTemplateService>;
  const rendered = await renderComponent(EventListComponent, {
    declarations: [EventListComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatIconModule,
      MatInputModule,
      MatPaginatorModule,
      MatProgressSpinnerModule,
      MatSortModule,
      MatTableModule,
    ],
    providers: [{ provide: EventTemplateService, useValue: templateApi }],
  });
  // combineQueries batches with auditTime(0): wait for it, then re-render.
  await rendered.fixture.whenStable();
  rendered.fixture.detectChanges();
  return { ...rendered, user: userEvent.setup(), templateApi };
}

describe('EventListComponent', () => {
  /**
   * Verifies: the user's event templates load from the API and list sorted by name, each linking to its template page.
   * Interacts with: EventTemplateService.getEventTemplates through the real EventTemplateDataService, real EventTemplateStore/EventTemplateQuery, rendered table.
   * Data: templates Bravo (t2) and Alpha (t1).
   */
  it('lists the templates by name with links to their pages', async () => {
    const { templateApi } = await renderEventList([
      { id: 't2', name: 'Bravo', description: 'Second' },
      { id: 't1', name: 'Alpha', description: 'First' },
    ]);

    expect(templateApi.getEventTemplates).toHaveBeenCalled();
    const links = screen.getAllByRole('link');
    expect(links.map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
      ['Alpha', '/templates/t1'],
      ['Bravo', '/templates/t2'],
    ]);
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  /**
   * Verifies: typing in Search narrows the templates, and a search with no match says so.
   * Interacts with: the search input (user-event type, keyup), applyFilter.
   * Data: Alpha and Bravo; search 'bra', then 'zulu'.
   */
  it('narrows the templates with the search box', async () => {
    const { user } = await renderEventList([
      { id: 't1', name: 'Alpha' },
      { id: 't2', name: 'Bravo' },
    ]);
    const search = screen.getByPlaceholderText('Search');

    await user.type(search, 'bra');
    expect(
      screen.queryByRole('link', { name: 'Alpha' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bravo' })).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'zulu');
    expect(screen.getByText('No results found')).toBeInTheDocument();
  });
});
