// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Injectable, inject } from '@angular/core';
import { ComnAuthService, Theme } from '@cmusei/crucible-common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { User, UserService } from 'src/app/generated/alloy.api';
import { UserQuery } from './user.query';
import { CurrentUserStore, UserStore } from './user.store';

@Injectable({
  providedIn: 'root',
})
export class UserDataService {
  private userStore = inject(UserStore);
  private currentUserStore = inject(CurrentUserStore);
  private userQuery = inject(UserQuery);
  private userService = inject(UserService);
  private authService = inject(ComnAuthService);

  load(): Observable<User[]> {
    this.userStore.setLoading(true);
    return this.userService.getUsers().pipe(
      tap((users: User[]) => {
        this.userStore.set(users);
      }),
      tap(() => {
        this.userStore.setLoading(false);
      }),
    );
  }

  loadById(id: string): Observable<User> {
    this.userStore.setLoading(true);
    return this.userService.getUser(id).pipe(
      tap((_user: User) => {
        this.userStore.upsert(_user.id, { ..._user });
      }),
      tap(() => {
        this.userStore.setLoading(false);
      }),
    );
  }

  create(user: User): Observable<User> {
    return this.userService.createUser(user).pipe(
      tap((u) => {
        this.userStore.add(u);
        this.userStore.ui.upsert(u.id, this.userQuery.ui.getEntity(u.id));
      }),
    );
  }

  update(user: User) {
    this.userService
      .updateUser(user.id, user)
      .pipe(
        tap((u) => {
          this.userStore.add(u);
          this.userStore.ui.upsert(u.id, this.userQuery.ui.getEntity(u.id));
        }),
      )
      .subscribe();
  }

  delete(userId: string): Observable<any> {
    return this.userService.deleteUser(userId).pipe(
      tap(() => {
        this.userStore.remove(userId);
        this.userStore.ui.remove(userId);
      }),
    );
  }

  setCurrentUser() {
    const currentUser = {
      name: '',
      id: '',
    };
    this.currentUserStore.update(currentUser);
    this.authService.user$.subscribe((user) => {
      if (!!user) {
        currentUser.name = user.profile.name;
        currentUser.id = user.profile.sub;
        this.currentUserStore.update(currentUser);
      }
    });
  }

  setUserTheme(theme: Theme) {
    this.currentUserStore.update({ theme });
  }

  setActive(id) {
    this.userStore.setActive(id);
    this.userStore.ui.setActive(id);
  }
}
