// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { By } from '@angular/platform-browser';
import { firstValueFrom, Observable, of } from 'rxjs';
import {
  CasterService,
  Directory,
  EventTemplate,
  PlayerService,
  ScenarioTemplate,
  SteamfitterService,
  View,
} from 'src/app/generated/alloy.api';
import { EventTemplateStore } from 'src/app/data/event-template/event-template.store';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EventTemplatesComponent } from './event-templates.component';

@Component({
  selector: 'app-event-template-list',
  template: '',
  standalone: false,
})
class EventTemplateListStubComponent {
  @Input() viewList: Observable<View[]>;
  @Input() directoryList: Observable<Directory[]>;
  @Input() scenarioTemplateList: Observable<ScenarioTemplate[]>;
  @Input() eventTemplates: EventTemplate[];
  @Output() refreshTemplates = new EventEmitter<void>();
}

async function renderEventTemplates() {
  const playerApi = {
    getViews: vi.fn(() =>
      of<View[]>([
        { id: 'v1', name: 'Range View', isTemplate: true },
        { id: 'v2', name: 'Live View', isTemplate: false },
      ]),
    ),
  } satisfies ApiStub<PlayerService>;
  const casterApi = {
    getDirectories: vi.fn(() => of<Directory[]>([{ id: 'd1', name: 'Range' }])),
  } satisfies ApiStub<CasterService>;
  const steamfitterApi = {
    getScenarioTemplates: vi.fn(() =>
      of<ScenarioTemplate[]>([{ id: 's1', name: 'Scenario' }]),
    ),
  } satisfies ApiStub<SteamfitterService>;
  const rendered = await renderComponent(EventTemplatesComponent, {
    declarations: [EventTemplatesComponent, EventTemplateListStubComponent],
    providers: [
      { provide: PlayerService, useValue: playerApi },
      { provide: CasterService, useValue: casterApi },
      { provide: SteamfitterService, useValue: steamfitterApi },
      {
        provide: EventTemplateStore,
        useFactory: () => {
          const store = new EventTemplateStore();
          store.set([{ id: 't1', name: 'Alpha' }]);
          return store;
        },
      },
    ],
  });
  const list = () =>
    rendered.fixture.debugElement.query(
      By.directive(EventTemplateListStubComponent),
    ).componentInstance as EventTemplateListStubComponent;
  return { ...rendered, list, playerApi, casterApi, steamfitterApi };
}

describe('EventTemplatesComponent', () => {
  /**
   * Verifies: the page fetches the Player views, Caster directories and Steamfitter scenario templates, and hands them and the stored templates to the list.
   * Interacts with: PlayerService.getViews, CasterService.getDirectories, SteamfitterService.getScenarioTemplates (through the real data services), real EventTemplateStore/EventTemplateQuery, list stub inputs.
   * Data: one template view and one live view; one directory; one scenario template; one stored event template.
   */
  it('passes the external template lists and the event templates to the list', async () => {
    const { list } = await renderEventTemplates();

    expect(list().eventTemplates.map((t) => t.id)).toEqual(['t1']);
    expect((await firstValueFrom(list().viewList)).map((v) => v.id)).toEqual([
      'v1',
    ]);
    expect(
      (await firstValueFrom(list().directoryList)).map((d) => d.id),
    ).toEqual(['d1']);
    expect(
      (await firstValueFrom(list().scenarioTemplateList)).map((s) => s.id),
    ).toEqual(['s1']);
  });

  /**
   * Verifies: a refreshTemplates from the list fetches the three external lists again.
   * Interacts with: list stub output, the three generated services.
   * Data: one refresh after the initial load.
   */
  it('refetches the external lists on refreshTemplates', async () => {
    const { list, playerApi, casterApi, steamfitterApi } =
      await renderEventTemplates();

    list().refreshTemplates.emit();

    expect(playerApi.getViews).toHaveBeenCalledTimes(2);
    expect(casterApi.getDirectories).toHaveBeenCalledTimes(2);
    expect(steamfitterApi.getScenarioTemplates).toHaveBeenCalledTimes(2);
  });
});
