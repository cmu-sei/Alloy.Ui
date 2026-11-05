// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { describe, it, expect } from 'vitest';
import { HttpHeaders } from '@angular/common/http';
import HttpHeaderUtils from './http-header-utils';

const disposition = (value: string) =>
  new HttpHeaders({ 'Content-Disposition': value });

describe('HttpHeaderUtils.getFilename', () => {
  /**
   * Verifies: the RFC 5987 form is preferred and percent-decoded.
   * Interacts with: HttpHeaderUtils.getFilename.
   * Data: the header ASP.NET writes for a name with a space and a non-ASCII character.
   */
  it('reads the encoded filename* form', () => {
    expect(
      HttpHeaderUtils.getFilename(
        disposition(
          'attachment; filename="Range Caf_.json"; filename*=UTF-8\'\'Range%20Caf%C3%A9.json',
        ),
        'fallback.json',
      ),
    ).toBe('Range Café.json');
  });

  /**
   * Verifies: a plain filename is taken as written, so a literal % does not throw.
   * Interacts with: HttpHeaderUtils.getFilename.
   * Data: quoted and unquoted plain filenames; one holding "100% done".
   */
  it.each([
    ['attachment; filename="100% done.json"', '100% done.json'],
    ['attachment; filename=event-templates.json', 'event-templates.json'],
  ])('reads the plain form of %s', (header, expected) => {
    expect(HttpHeaderUtils.getFilename(disposition(header), 'x')).toBe(
      expected,
    );
  });

  /**
   * Verifies: badly encoded filename* falls back to the plain form, and no header falls back to the default.
   * Interacts with: HttpHeaderUtils.getFilename.
   * Data: filename*=UTF-8''%E0 (invalid UTF-8); no Content-Disposition.
   */
  it('falls back when the header is unusable', () => {
    expect(
      HttpHeaderUtils.getFilename(
        disposition(
          'attachment; filename="plain.json"; filename*=UTF-8\'\'%E0',
        ),
        'x',
      ),
    ).toBe('plain.json');
    expect(
      HttpHeaderUtils.getFilename(new HttpHeaders(), 'event-templates.json'),
    ).toBe('event-templates.json');
  });
});
