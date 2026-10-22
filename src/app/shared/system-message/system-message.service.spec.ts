// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { MatBottomSheet } from '@angular/material/bottom-sheet';
import { SystemMessageComponent } from '../../components/shared/system-message/system-message.component';
import { SystemMessageService } from './system-message.service';

describe('SystemMessageService', () => {
  /**
   * Verifies: displayMessage opens the system message bottom sheet with the title and message.
   * Interacts with: MatBottomSheet.open (stub).
   */
  it('opens the system message sheet', () => {
    const sheet = { open: vi.fn() };
    TestBed.configureTestingModule({
      providers: [
        SystemMessageService,
        { provide: MatBottomSheet, useValue: sheet },
      ],
    });

    TestBed.inject(SystemMessageService).displayMessage(
      'Conflict',
      'Already launched.',
    );

    expect(sheet.open).toHaveBeenCalledWith(SystemMessageComponent, {
      data: { title: 'Conflict', message: 'Already launched.' },
    });
  });
});
