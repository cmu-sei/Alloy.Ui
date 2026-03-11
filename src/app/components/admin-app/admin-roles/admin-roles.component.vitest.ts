// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { AdminRolesComponent } from './admin-roles.component';
import { renderComponent } from 'src/app/test-utils/render-component';

async function renderRoles() {
  return renderComponent(AdminRolesComponent, {
    declarations: [AdminRolesComponent],
  });
}

describe('AdminRolesComponent', () => {
  it('should create', async () => {
    const { fixture } = await renderRoles();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should display Roles tab', async () => {
    await renderRoles();
    expect(screen.getByText('Roles')).toBeInTheDocument();
  });

  it('should display EventTemplate Roles tab', async () => {
    await renderRoles();
    expect(screen.getByText('EventTemplate Roles')).toBeInTheDocument();
  });

  it('should display Event Roles tab', async () => {
    await renderRoles();
    expect(screen.getByText('Event Roles')).toBeInTheDocument();
  });
});
