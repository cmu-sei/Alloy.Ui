// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { of } from 'rxjs';
import { EventListComponent } from './event-list.component';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplateQuery } from 'src/app/data/event-template/event-template.query';
import { EventTemplateDataService } from 'src/app/data/event-template/event-template-data.service';
import { MatSortModule } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';

const mockTemplates = [
  {
    id: 'tmpl-1',
    name: 'Cyber Exercise Alpha',
    description: 'A training exercise for incident response',
    durationHours: 4,
  },
  {
    id: 'tmpl-2',
    name: 'Network Defense Beta',
    description: 'Advanced network defense scenario',
    durationHours: 8,
  },
];

async function renderEventList(overrides: Partial<EventListComponent> = {}) {
  const loadTemplatesSpy = vi.fn();

  return renderComponent(EventListComponent, {
    declarations: [EventListComponent],
    imports: [MatSortModule, MatTableModule],
    providers: [
      {
        provide: EventTemplateDataService,
        useValue: {
          loadTemplates: loadTemplatesSpy,
          loadTemplate: vi.fn(),
          addNew: () => of({}),
          update: vi.fn(),
          delete: vi.fn(),
          stateCreate: vi.fn(),
          stateUpdate: vi.fn(),
          stateDelete: vi.fn(),
        },
      },
      {
        provide: EventTemplateQuery,
        useValue: {
          selectAll: () => of(mockTemplates),
          selectLoading: () => of(false),
          selectEntity: () => of(undefined),
          selectById: () => of(undefined),
        },
      },
    ],
    componentProperties: {
      templates: mockTemplates as any,
      ...overrides,
    },
  });
}

describe('EventListComponent', () => {
  it('should create the component', async () => {
    const { fixture } = await renderEventList();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display "My Events" title', async () => {
    await renderEventList();
    expect(screen.getByText('My Events')).toBeInTheDocument();
  });

  it('should render the search input placeholder', async () => {
    await renderEventList();
    expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
  });

  it('should initialize the data source and call loadTemplates', async () => {
    const { fixture } = await renderEventList();
    const component = fixture.componentInstance;
    expect(component.eventTemplateDataSource).toBeTruthy();
    expect(component.filterString).toBe('');
  });

  it('should display column headers', async () => {
    await renderEventList();
    expect(screen.getByText('Event Name')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Duration (Hours)')).toBeInTheDocument();
  });

  it('should filter templates when search input is used', async () => {
    const { fixture } = await renderEventList();
    const component = fixture.componentInstance;

    // Apply a filter that matches only one template
    component.applyFilter('Alpha');
    expect(component.filterString).toBe('Alpha');
    expect(component.eventTemplateDataSource.filter).toBe('alpha');
  });

  it('should clear the filter when clearFilter is called', async () => {
    const { fixture } = await renderEventList();
    const component = fixture.componentInstance;

    component.applyFilter('something');
    expect(component.filterString).toBe('something');

    component.clearFilter();
    expect(component.filterString).toBe('');
    expect(component.eventTemplateDataSource.filter).toBe('');
  });

  it('should show "No results found" when filtered data is empty', async () => {
    const { fixture } = await renderEventList();
    const component = fixture.componentInstance;

    // Apply a filter that matches nothing
    component.applyFilter('zzzznonexistent');
    fixture.detectChanges();

    expect(screen.getByText('No results found')).toBeInTheDocument();
  });

  it('should navigate when openEvent is called', async () => {
    const { fixture } = await renderEventList();
    const component = fixture.componentInstance;
    const router = fixture.debugElement.injector.get(
      (await import('@angular/router')).Router
    );
    const navigateSpy = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    component.openEvent('tmpl-1');
    expect(navigateSpy).toHaveBeenCalledWith(['/templates/tmpl-1']);
  });
});
