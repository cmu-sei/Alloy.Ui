// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, beforeEach } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { Theme } from '@cmusei/crucible-common';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import { CurrentUserStore, initialUserUiState, UserStore } from './user.store';
import { CurrentUserQuery, UserQuery } from './user.query';

describe('UserQuery', () => {
  let store: UserStore;
  let query: UserQuery;

  beforeEach(() => {
    store = new UserStore();
    query = new UserQuery(store);
  });

  /**
   * Verifies: selectAll() orders users by name ascending, per the @QueryConfig sortBy.
   * Interacts with: UserStore.set, UserQuery.selectAll.
   * Data: three users out of name order.
   */
  it('sorts users by name', async () => {
    store.set([
      { id: 'c', name: 'Carol' },
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ]);

    expect(
      (await firstValueFrom(query.selectAll())).map((u) => u.name),
    ).toEqual(['Alice', 'Bob', 'Carol']);
  });

  /**
   * Verifies: every user set into the store gets the initial UI state in the entity UI store.
   * Interacts with: UserStore.set (createUIStore + setInitialEntityState), UserQuery.ui.
   * Data: two users.
   */
  it('creates initial UI state for each user that is set', () => {
    store.set([
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ]);

    expect(query.ui.getEntity('a')).toEqual({ id: 'a', ...initialUserUiState });
    expect(query.ui.getEntity('b')).toEqual({ id: 'b', ...initialUserUiState });
  });

  /**
   * Verifies: a user added later also gets initial UI state, and UI state already edited is kept.
   * Interacts with: UserStore.add/ui.update, UserQuery.ui.selectEntity, recordEmissions.
   * Data: user 'a' marked editing, then user 'b' added.
   */
  it('gives added users initial UI state without resetting existing ones', () => {
    store.set([{ id: 'a', name: 'Alice' }]);
    store.ui.update('a', { isEditing: true });
    const seenB = recordEmissions(query.ui.selectEntity('b'));

    store.add({ id: 'b', name: 'Bob' });

    expect(query.ui.getEntity('a').isEditing).toBe(true);
    expect(seenB).toEqual([undefined, { id: 'b', ...initialUserUiState }]);
  });

  /**
   * Verifies: removing a user removes its UI state as well.
   * Interacts with: UserStore.remove, UserQuery.ui.
   * Data: one user, then removed.
   */
  it('drops UI state when a user is removed', () => {
    store.set([{ id: 'a', name: 'Alice' }]);

    store.remove('a');

    expect(query.ui.hasEntity('a')).toBe(false);
  });

  /**
   * Verifies: isLoading$ follows the store's loading flag.
   * Interacts with: UserStore.setLoading, UserQuery.isLoading$, recordEmissions.
   * Data: the entity store's initial loading=true, then false, then true.
   */
  it('isLoading$ follows setLoading', () => {
    const seen = recordEmissions(query.isLoading$);

    store.setLoading(false);
    store.setLoading(true);

    expect(seen).toEqual([true, false, true]);
  });

  /**
   * Verifies: selectByUserId emits the user with that id.
   * Interacts with: UserStore.set, UserQuery.selectByUserId.
   * Data: two users.
   */
  it('selectByUserId emits the matching user', async () => {
    store.set([
      { id: 'a', name: 'Alice' },
      { id: 'b', name: 'Bob' },
    ]);

    expect((await firstValueFrom(query.selectByUserId('b'))).name).toBe('Bob');
  });
});

describe('CurrentUserQuery', () => {
  let store: CurrentUserStore;
  let query: CurrentUserQuery;

  beforeEach(() => {
    store = new CurrentUserStore();
    query = new CurrentUserQuery(store);
  });

  /**
   * Verifies: the current user starts anonymous with the light theme.
   * Interacts with: CurrentUserStore initial state, CurrentUserQuery.getValue/userTheme$.
   * Data: a fresh store.
   */
  it('starts with an empty user and the light theme', async () => {
    expect(query.getValue()).toEqual({
      name: '',
      id: '',
      theme: Theme.LIGHT,
      lastRoute: '',
    });
    expect(await firstValueFrom(query.userTheme$)).toBe(Theme.LIGHT);
  });

  /**
   * Verifies: userTheme$ emits once per actual theme change (distinctUntilChanged).
   * Interacts with: CurrentUserStore.update, CurrentUserQuery.userTheme$, recordEmissions.
   * Data: dark, dark again, then a name change, then light.
   */
  it('userTheme$ emits only when the theme changes', () => {
    const seen = recordEmissions(query.userTheme$);

    store.update({ theme: Theme.DARK });
    store.update({ theme: Theme.DARK });
    store.update({ name: 'Alice' });
    store.update({ theme: Theme.LIGHT });

    expect(seen).toEqual([Theme.LIGHT, Theme.DARK, Theme.LIGHT]);
  });

  /**
   * Verifies: getLastRoute falls back to '/' when no route was recorded, and returns the recorded one otherwise.
   * Interacts with: CurrentUserStore.update, CurrentUserQuery.getLastRoute.
   * Data: an empty lastRoute, then '/admin'.
   */
  it('getLastRoute defaults to the home route', () => {
    expect(query.getLastRoute()).toBe('/');

    store.update({ lastRoute: '/admin' });

    expect(query.getLastRoute()).toBe('/admin');
  });
});
