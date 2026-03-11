// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/angular';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { renderComponent } from 'src/app/test-utils/render-component';

function dialogProviders(data: any = {}, closeFn = vi.fn()) {
  return [
    { provide: MAT_DIALOG_DATA, useValue: data },
    {
      provide: MatDialogRef,
      useValue: { close: closeFn, disableClose: false },
    },
  ];
}

async function renderDialog(overrides: Record<string, any> = {}) {
  const closeFn = vi.fn();
  const data = overrides.data ?? {};
  const result = await renderComponent(ConfirmDialogComponent, {
    declarations: [ConfirmDialogComponent],
    providers: dialogProviders(data, closeFn),
    componentProperties: {
      title: overrides.title ?? 'Confirm Action',
      message: overrides.message ?? 'Are you sure?',
    },
  });

  return { ...result, closeFn };
}

describe('ConfirmDialogComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderDialog();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display dialog title', async () => {
    await renderDialog({ title: 'Delete Item?' });
    expect(screen.getByText('Delete Item?')).toBeInTheDocument();
  });

  it('should display dialog message', async () => {
    await renderDialog({ message: 'This cannot be undone.' });
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
  });

  it('should display default Yes button text', async () => {
    await renderDialog();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('should display default No button text', async () => {
    await renderDialog();
    expect(screen.getByText('No')).toBeInTheDocument();
  });

  it('should display custom button text from data', async () => {
    await renderDialog({
      data: { buttonTrueText: 'Delete', buttonFalseText: 'Cancel' },
    });
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should close dialog with confirm=true when confirm clicked', async () => {
    const { fixture, closeFn } = await renderDialog();
    fixture.componentInstance.onClick(true);
    expect(closeFn).toHaveBeenCalledWith(
      expect.objectContaining({ confirm: true, wasCancelled: false })
    );
  });

  it('should close dialog with wasCancelled=true when cancel clicked', async () => {
    const { fixture, closeFn } = await renderDialog();
    fixture.componentInstance.onCancel();
    expect(closeFn).toHaveBeenCalledWith(
      expect.objectContaining({ wasCancelled: true })
    );
  });
});
