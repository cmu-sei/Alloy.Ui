// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import userEvent from '@testing-library/user-event';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { renderComponent } from 'src/app/test-utils/render-component';
import { SystemMessageComponent } from './system-message.component';

describe('SystemMessageComponent', () => {
  /**
   * Verifies: the sheet shows the title and message it was opened with, and Close dismisses it.
   * Interacts with: MatBottomSheetRef.dismiss (stub).
   */
  it('shows the message and closes on Close', async () => {
    const sheetRef = { dismiss: vi.fn() };
    await renderComponent(SystemMessageComponent, {
      imports: [MatButtonModule, MatIconModule],
      providers: [
        { provide: MatBottomSheetRef, useValue: sheetRef },
        {
          provide: MAT_BOTTOM_SHEET_DATA,
          useValue: { title: 'Conflict', message: 'Already launched.' },
        },
      ],
    });

    expect(screen.getByRole('heading', { name: 'Conflict' })).toBeTruthy();
    expect(screen.getByText('Already launched.')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(sheetRef.dismiss).toHaveBeenCalled();
  });
});
