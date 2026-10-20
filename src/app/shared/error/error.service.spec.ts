// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { SystemMessageService } from '../system-message/system-message.service';
import { ErrorService } from './error.service';

function setup() {
  const systemMessage = { displayMessage: vi.fn() };
  TestBed.configureTestingModule({
    providers: [{ provide: SystemMessageService, useValue: systemMessage }],
  });
  return { service: TestBed.inject(ErrorService), systemMessage };
}

function uncaught(rejection: unknown) {
  return { message: 'Uncaught (in promise): ' + String(rejection), rejection };
}

describe('ErrorService', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  /**
   * Verifies: a failed request shows the ProblemDetails title the API returned, under the status text.
   * Interacts with: SystemMessageService.displayMessage.
   * Data: a 409 whose body carries a title.
   */
  it('shows the API title of a failed request', () => {
    const { service, systemMessage } = setup();

    service.handleError(
      new HttpErrorResponse({
        status: 409,
        statusText: 'Conflict',
        error: {
          title: 'You already have an active event from this template.',
        },
      }),
    );

    expect(systemMessage.displayMessage).toHaveBeenCalledWith(
      'Conflict',
      'You already have an active event from this template.',
    );
  });

  /**
   * Verifies: a failed request without a ProblemDetails body falls back to the HTTP message.
   * Interacts with: SystemMessageService.displayMessage.
   * Data: a 500 with a plain-text body.
   */
  it('falls back to the HTTP message when the body has no title', () => {
    const { service, systemMessage } = setup();
    const err = new HttpErrorResponse({
      status: 500,
      statusText: 'Internal Server Error',
      url: 'http://api/x',
      error: 'boom',
    });

    service.handleError(err);

    expect(systemMessage.displayMessage).toHaveBeenCalledWith(
      'Internal Server Error',
      err.message,
    );
  });

  /**
   * Verifies: a request that never reached the API says so rather than showing "0 Unknown Error".
   * Interacts with: SystemMessageService.displayMessage.
   * Data: a status 0 response with no url, as the browser reports a refused connection.
   */
  it('reports an unreachable API', () => {
    const { service, systemMessage } = setup();

    service.handleError(
      new HttpErrorResponse({ status: 0, statusText: 'Unknown Error' }),
    );

    expect(systemMessage.displayMessage).toHaveBeenCalledWith(
      'API Error',
      'The API could not be reached.',
    );
  });

  /**
   * Verifies: each kind of unhandled promise rejection is shown, logged, or ignored as intended.
   * Interacts with: SystemMessageService.displayMessage, console.warn.
   * Data: one rejection per row.
   * Why: SignalR reports its own failures and reconnects on a 401, so those must not reach the user twice.
   */
  it.each<{
    name: string;
    rejection: unknown;
    shown: [string, string] | null;
  }>([
    { name: 'an expired token', rejection: { statusCode: 401 }, shown: null },
    {
      name: 'an unreachable identity server',
      rejection: { message: 'Network Error' },
      shown: [
        'Identity Server Error',
        'The Identity Server could not be reached for user authentication.',
      ],
    },
    {
      name: 'a hub start no service caught',
      rejection: { message: 'Failed to start the connection: Failed to fetch' },
      shown: null,
    },
    {
      name: 'an error with a message',
      rejection: { message: 'Something broke' },
      shown: ['Error', 'Something broke'],
    },
    { name: 'a bare value', rejection: 'nope', shown: ['Error', 'nope'] },
  ])('handles $name', ({ rejection, shown }) => {
    const { service, systemMessage } = setup();

    service.handleError(uncaught(rejection));

    if (shown) {
      expect(systemMessage.displayMessage).toHaveBeenCalledWith(...shown);
    } else {
      expect(systemMessage.displayMessage).not.toHaveBeenCalled();
    }
  });

  /**
   * Verifies: an error the service cannot explain is logged with its stack and not shown to the user.
   * Interacts with: console.error, SystemMessageService.displayMessage.
   * Data: a plain Error.
   */
  it('logs an error it cannot explain without showing it', () => {
    const { service, systemMessage } = setup();
    const err = new Error('template bug');

    service.handleError(err);

    expect(console.error).toHaveBeenCalledWith(err);
    expect(systemMessage.displayMessage).not.toHaveBeenCalled();
  });
});
