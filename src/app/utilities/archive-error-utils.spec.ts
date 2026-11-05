// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { HttpErrorResponse } from '@angular/common/http';
import ArchiveErrorUtils from './archive-error-utils';

const failure = (status: number, error: unknown = null) =>
  new HttpErrorResponse({ status, error });

const blob = (body: unknown) =>
  new Blob([JSON.stringify(body)], { type: 'application/json' });

describe('ArchiveErrorUtils.message', () => {
  /**
   * Verifies: a ValidationProblemDetails is answered with its messages, not its generic title.
   * Interacts with: ArchiveErrorUtils.message.
   * Data: the 400 model binding writes for a missing form field.
   */
  it('lists the messages of a validation problem', async () => {
    const err = failure(400, {
      title: 'One or more validation errors occurred.',
      errors: { File: ['The File field is required.'], '': ['Bad form.'] },
    });

    expect(await ArchiveErrorUtils.message(err, 'fallback')).toBe(
      'The File field is required. Bad form.',
    );
  });

  /**
   * Verifies: a 413, which has no body, names the size limit.
   * Data: a 413 with no body.
   */
  it('names the size limit for a 413', async () => {
    expect(await ArchiveErrorUtils.message(failure(413), 'fallback')).toBe(
      'The file is too large to upload. Event Template files can be up to 10 MB.',
    );
  });

  /**
   * Verifies: a request that never reached the API says so.
   * Data: status 0, as a network error or an aborted connection reports.
   */
  it('says the API could not be reached for status 0', async () => {
    expect(await ArchiveErrorUtils.message(failure(0), 'fallback')).toContain(
      'could not be reached',
    );
  });

  /**
   * Verifies: the title of a ProblemDetails is read out of a Blob body, as a blob request returns it.
   * Data: a 404 whose body is a json Blob.
   */
  it('reads the title from a blob body', async () => {
    const err = failure(
      404,
      blob({ title: 'Event Template x was not found.' }),
    );

    expect(await ArchiveErrorUtils.message(err, 'fallback')).toBe(
      'Event Template x was not found.',
    );
  });

  /**
   * Verifies: the production 500 shows its detail, which holds the message; a development 500's detail (a stack trace) is not shown.
   * Data: the two 500 shapes the API's exception filter writes.
   */
  it('shows the detail only under the production server error title', async () => {
    expect(
      await ArchiveErrorUtils.message(
        failure(500, {
          title: 'A server error occurred.',
          detail: 'Disk full',
        }),
        'fallback',
      ),
    ).toBe('Disk full');
    expect(
      await ArchiveErrorUtils.message(
        failure(500, { title: 'Disk full', detail: '   at Alloy.Api...' }),
        'fallback',
      ),
    ).toBe('Disk full');
  });

  /**
   * Verifies: an answer with nothing to show falls back.
   * Data: a 502 with a text body.
   */
  it('falls back when the answer carries no reason', async () => {
    expect(
      await ArchiveErrorUtils.message(failure(502, 'Bad Gateway'), 'fallback'),
    ).toBe('fallback');
  });
});
