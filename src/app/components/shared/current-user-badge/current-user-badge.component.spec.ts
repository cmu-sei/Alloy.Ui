// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/angular';
import { CurrentUserStore } from 'src/app/data/user/user.store';
import { renderComponent } from 'src/app/test-utils/render-component';
import { CurrentUserBadgeComponent } from './current-user-badge.component';

async function renderBadge(userId: string | null) {
  return renderComponent(CurrentUserBadgeComponent, {
    providers: [
      // The real store, signed in as user u1; CurrentUserQuery reads it.
      {
        provide: CurrentUserStore,
        useFactory: () => {
          const store = new CurrentUserStore();
          store.update({ name: 'Alex Doe', id: 'u1' });
          return store;
        },
      },
    ],
    inputs: { userId },
  });
}

describe('CurrentUserBadgeComponent', () => {
  /**
   * Verifies: the component mounts with the default test providers and shows "You" for the signed-in user's id.
   * Interacts with: userId input, real CurrentUserStore/CurrentUserQuery.
   * Data: signed in as u1; userId u1.
   */
  it('renders with the default test providers', async () => {
    const { fixture } = await renderBadge('u1');

    expect(fixture.componentInstance).toBeInstanceOf(CurrentUserBadgeComponent);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  /**
   * Verifies: no badge renders for another user's id or without an id.
   * Interacts with: userId input, real CurrentUserQuery.
   * Data: signed in as u1; userId u2, then null.
   */
  it.each([{ userId: 'u2' }, { userId: null }])(
    'shows nothing for userId $userId',
    async ({ userId }) => {
      await renderBadge(userId);

      expect(screen.queryByText('You')).not.toBeInTheDocument();
    },
  );
});
