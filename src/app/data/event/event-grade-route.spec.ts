// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, afterEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';
import { BASE_PATH, EventService } from 'src/app/generated/alloy.api';

describe('EventService.gradeEvent route', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());

  /**
   * Verifies: gradeEvent posts the answers to events/{id}/grade, not the old misspelled qrade route.
   * Interacts with: the generated EventService over HttpTestingController.
   * Data: one event id and one answer.
   */
  it('posts to events/{id}/grade', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: BASE_PATH, useValue: 'http://alloy' },
      ],
    });
    const api = TestBed.inject(EventService);
    const http = TestBed.inject(HttpTestingController);
    const id = '6c5e4c8a-0000-4000-8000-000000000001';

    const graded = firstValueFrom(api.gradeEvent(id, ['a']));
    const req = http.expectOne(`http://alloy/api/events/${id}/grade`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(['a']);
    req.flush([]);

    expect(await graded).toEqual([]);
  });
});
