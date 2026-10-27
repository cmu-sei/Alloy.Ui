// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import {
  BehaviorSubject,
  firstValueFrom,
  Observable,
  of,
  throwError,
} from 'rxjs';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { User, UserService } from 'src/app/generated/alloy.api';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { recordEmissions } from 'src/app/test-utils/record-emissions';
import {
  captureUnhandledRxErrors,
  flush,
} from 'src/app/test-utils/unhandled-rx-errors';
import { UserDataService } from './user-data.service';
import { initialUserUiState, UserStore } from './user.store';
import { CurrentUserQuery, UserQuery } from './user.query';

type AuthUser = { profile: { name: string; sub: string } } | null;

function setup() {
  const api = {
    getUsers: vi.fn(() =>
      of<User[]>([
        { id: 'a', name: 'Alice' },
        { id: 'b', name: 'Bob' },
      ]),
    ),
    getUser: vi.fn((id: string) => of<User>({ id, name: `User ${id}` })),
    createUser: vi.fn((u: User) => of<User>({ ...u, id: 'created' })),
    updateUser: vi.fn((_id: string, u: User) => of(u)),
    deleteUser: vi.fn(() => of({})),
  } satisfies ApiStub<UserService>;
  const user$ = new BehaviorSubject<AuthUser>(null);
  const auth: Pick<ComnAuthService, 'user$'> = {
    user$: user$ as unknown as ComnAuthService['user$'],
  };
  TestBed.configureTestingModule({
    providers: [
      { provide: UserService, useValue: api },
      { provide: ComnAuthService, useValue: auth },
    ],
  });
  return {
    service: TestBed.inject(UserDataService),
    userStore: TestBed.inject(UserStore),
    userQuery: TestBed.inject(UserQuery),
    currentUserQuery: TestBed.inject(CurrentUserQuery),
    api,
    user$,
  };
}

describe('UserDataService', () => {
  describe('load()', () => {
    /**
     * Verifies: load flags loading as soon as it is called, sets the users, then clears loading.
     * Interacts with: UserService.getUsers, real UserStore/UserQuery (isLoading$), recordEmissions.
     * Data: two users; loading first forced false so the true transition is visible.
     */
    it('sets the users and toggles loading around the request', async () => {
      const { service, userStore, userQuery } = setup();
      userStore.setLoading(false);
      const loading = recordEmissions(userQuery.isLoading$);

      const request = service.load();
      expect(loading).toEqual([false, true]);
      await firstValueFrom(request);

      expect(userQuery.getAll().map((u) => u.name)).toEqual(['Alice', 'Bob']);
      expect(loading).toEqual([false, true, false]);
    });
  });

  describe('loadById()', () => {
    /**
     * Verifies: loadById upserts one user next to the others and clears loading.
     * Interacts with: UserService.getUser, real UserQuery.
     * Data: two loaded users; user 'c' fetched by id.
     */
    it('adds a single user', async () => {
      const { service, userQuery, api } = setup();
      await firstValueFrom(service.load());

      await firstValueFrom(service.loadById('c'));

      expect(api.getUser).toHaveBeenCalledWith('c');
      expect(userQuery.getAll().map((u) => u.id)).toEqual(['a', 'b', 'c']);
      expect(userQuery.getValue().loading).toBe(false);
    });
  });

  /**
   * Verifies: a failed load() or loadById() leaves the store loading and the stored users unchanged (current behavior).
   * Interacts with: UserService.getUsers / getUser (error), real UserStore/UserQuery.
   * Data: two loaded users 'a' and 'b'; then one failing request per row.
   * Why: setLoading(false) lives in a tap after the request, so nothing resets the spinner on error.
   */
  it.each<{
    method: string;
    fail: (api: ReturnType<typeof setup>['api'], failure: unknown) => void;
    call: (service: UserDataService) => Observable<unknown>;
    failure: { status: number };
  }>([
    {
      method: 'load()',
      fail: (api, failure) =>
        api.getUsers.mockReturnValueOnce(throwError(() => failure)),
      call: (service) => service.load(),
      failure: { status: 500 },
    },
    {
      method: 'loadById()',
      fail: (api, failure) =>
        api.getUser.mockReturnValueOnce(throwError(() => failure)),
      call: (service) => service.loadById('c'),
      failure: { status: 404 },
    },
  ])(
    '$method stays loading when the request fails',
    async ({ fail, call, failure }) => {
      const { service, userQuery, api } = setup();
      await firstValueFrom(service.load());
      fail(api, failure);

      await expect(firstValueFrom(call(service))).rejects.toEqual(failure);

      expect(userQuery.getAll().map((u) => u.id)).toEqual(['a', 'b']);
      expect(userQuery.getValue().loading).toBe(true);
    },
  );

  /**
   * Verifies: create stores the created user with the initial UI state.
   * Interacts with: UserService.createUser, real UserStore UI store, UserQuery.ui.
   * Data: a new user named Carol; the server assigns id 'created'.
   */
  it('create stores the user with initial UI state', async () => {
    const { service, userQuery } = setup();

    await firstValueFrom(service.create({ name: 'Carol' }));

    expect(userQuery.getEntity('created').name).toBe('Carol');
    expect(userQuery.ui.getEntity('created')).toEqual({
      id: 'created',
      ...initialUserUiState,
    });
  });

  /**
   * Verifies: update sends the change to the API but leaves the stored user unchanged (current behavior).
   * Interacts with: UserService.updateUser, real UserStore (EntityStore.add skips existing ids).
   * Data: loaded user 'a' named Alice; update renames it to Alicia.
   */
  it('update does not change the stored user', () => {
    const { service, userStore, userQuery, api } = setup();
    userStore.set([{ id: 'a', name: 'Alice' }]);

    service.update({ id: 'a', name: 'Alicia' });

    expect(api.updateUser).toHaveBeenCalledWith('a', {
      id: 'a',
      name: 'Alicia',
    });
    expect(userQuery.getEntity('a').name).toBe('Alice');
  });

  /**
   * Verifies: a failed update leaves the stored user unchanged and its error escapes as an unhandled RxJS error (current behavior).
   * Interacts with: UserService.updateUser (error), real UserStore/UserQuery, captureUnhandledRxErrors.
   * Data: stored user 'a' named Alice; the rename answers 403.
   */
  it('update lets a failed request escape unhandled', async () => {
    const unhandled = captureUnhandledRxErrors();
    const { service, userStore, userQuery, api } = setup();
    userStore.set([{ id: 'a', name: 'Alice' }]);
    api.updateUser.mockReturnValueOnce(throwError(() => ({ status: 403 })));

    service.update({ id: 'a', name: 'Alicia' });
    await flush();

    expect(userQuery.getEntity('a').name).toBe('Alice');
    expect(unhandled).toEqual([{ status: 403 }]);
  });

  /**
   * Verifies: delete removes the user and its UI state after the API confirms.
   * Interacts with: UserService.deleteUser, real UserStore/UserQuery (entity and UI).
   * Data: two loaded users; 'a' deleted.
   */
  it('delete removes the user and its UI state', async () => {
    const { service, userQuery } = setup();
    await firstValueFrom(service.load());

    await firstValueFrom(service.delete('a'));

    expect(userQuery.getAll().map((u) => u.id)).toEqual(['b']);
    expect(userQuery.ui.hasEntity('a')).toBe(false);
  });

  /**
   * Verifies: setCurrentUser resets the current user, then copies the name and subject of each signed-in user.
   * Interacts with: ComnAuthService.user$ (stubbed subject), real CurrentUserStore/CurrentUserQuery, recordEmissions.
   * Data: no user at first, then Alice (sub u-1) signs in.
   * Why: the reset is a new state object, so select() emits it even though the values match the initial state.
   */
  it('setCurrentUser follows the signed-in user', () => {
    const { service, currentUserQuery, user$ } = setup();
    const seen = recordEmissions(currentUserQuery.select());

    service.setCurrentUser();
    user$.next({ profile: { name: 'Alice', sub: 'u-1' } });

    expect(seen.map((u) => [u.name, u.id])).toEqual([
      ['', ''],
      ['', ''],
      ['Alice', 'u-1'],
    ]);
  });

  /**
   * Verifies: setUserTheme updates the current user's theme.
   * Interacts with: real CurrentUserStore, CurrentUserQuery.userTheme$.
   * Data: the dark theme.
   */
  it('setUserTheme updates the theme', async () => {
    const { service, currentUserQuery } = setup();

    service.setUserTheme(Theme.DARK);

    expect(await firstValueFrom(currentUserQuery.userTheme$)).toBe(Theme.DARK);
  });

  /**
   * Verifies: setActive marks the user active in both the entity store and its UI store.
   * Interacts with: real UserStore/UserQuery (getActiveId on entity and UI query).
   * Data: two loaded users; 'b' activated.
   */
  it('setActive activates the user and its UI entry', async () => {
    const { service, userQuery } = setup();
    await firstValueFrom(service.load());

    service.setActive('b');

    expect(userQuery.getActiveId()).toBe('b');
    expect(userQuery.ui.getActiveId()).toBe('b');
  });
});
