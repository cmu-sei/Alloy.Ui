// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi } from 'vitest';
import { ActivatedRoute, Router } from '@angular/router';
import { screen } from '@testing-library/angular';
import { NEVER, Observable, of, throwError } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Event as AlloyEvent, EventService } from 'src/app/generated/alloy.api';
import { activatedRouteStub } from 'src/app/test-utils/activated-route';
import { ApiStub } from 'src/app/test-utils/api-stub';
import { renderComponent } from 'src/app/test-utils/render-component';
import { EnlistComponent } from './enlist.component';

async function renderEnlist(
  enlist: () => Observable<AlloyEvent>,
  options: { realRouter?: boolean } = {},
) {
  const eventApi = {
    enlist: vi.fn(enlist),
  } satisfies ApiStub<EventService>;
  const navigate = vi.fn<Router['navigate']>(() => Promise.resolve(true));
  const { route } = activatedRouteStub({}, { code: 'ABC123' });
  const rendered = await renderComponent(EnlistComponent, {
    declarations: [EnlistComponent],
    imports: [
      MatButtonModule,
      MatCardModule,
      MatIconModule,
      MatProgressSpinnerModule,
    ],
    providers: [
      { provide: EventService, useValue: eventApi },
      { provide: ActivatedRoute, useValue: route },
      // The error card's routerLink needs the real router; the paths that
      // navigate use a stub so the navigation can be asserted.
      ...(options.realRouter
        ? []
        : [
            {
              provide: Router,
              useValue: { navigate } satisfies Pick<Router, 'navigate'>,
            },
          ]),
    ],
  });
  rendered.fixture.detectChanges();
  return { ...rendered, eventApi, navigate };
}

describe('EnlistComponent', () => {
  /**
   * Verifies: while the enlist request is pending the page says it is adding the user.
   * Interacts with: route param code, EventService.enlist (never answers), isLoading$.
   * Data: code ABC123; the request stays pending (NEVER keeps it open).
   */
  it('shows progress while enlisting', async () => {
    const { eventApi } = await renderEnlist(() => NEVER);

    expect(eventApi.enlist).toHaveBeenCalledWith('ABC123');
    expect(screen.getByText(/Adding you to the event/)).toBeInTheDocument();
  });

  /**
   * Verifies: a successful enlist navigates to the event's template page.
   * Interacts with: EventService.enlist, Router.navigate stub.
   * Data: code ABC123; the API returns an event of template t1.
   */
  it('navigates to the template after enlisting', async () => {
    const { navigate } = await renderEnlist(() =>
      of<AlloyEvent>({ id: 'e1', eventTemplateId: 't1' }),
    );

    expect(navigate).toHaveBeenCalledWith(['templates/t1']);
    expect(
      screen.queryByText(/Adding you to the event/),
    ).not.toBeInTheDocument();
  });

  /**
   * Verifies: a failed enlist stops the progress and shows the API's ProblemDetails title, or a generic message without one, with a way back.
   * Interacts with: EventService.enlist (error), rendered alert and link.
   * Data: code ABC123; a 400 with a title, then a 500 without one.
   */
  it.each([
    {
      error: { status: 400, error: { title: 'The event is full.' } },
      text: 'The event is full.',
    },
    { error: { status: 500 }, text: 'Could not add you to this event.' },
  ])(
    'shows the failure reason when enlisting fails ($error.status)',
    async ({ error, text }) => {
      await renderEnlist(() => throwError(() => error), { realRouter: true });

      expect(screen.getByRole('alert')).toHaveTextContent(text);
      expect(
        screen.getByRole('link', { name: 'Back to Event Templates' }),
      ).toHaveAttribute('href', '/templates');
      expect(
        screen.queryByText(/Adding you to the event/),
      ).not.toBeInTheDocument();
    },
  );
});
