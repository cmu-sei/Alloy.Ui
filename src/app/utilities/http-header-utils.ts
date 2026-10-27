// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpHeaders } from '@angular/common/http';

export default class HttpHeaderUtils {
  /**
   * The filename from a Content-Disposition header, or the fallback if it is absent or not exposed by CORS.
   * The RFC 5987 form (filename*=UTF-8''...), which ASP.NET sends for every name, is percent-encoded and is
   * preferred; the plain form is taken as written, since a name such as "100% done.json" is not encoded.
   */
  static getFilename(headers: HttpHeaders, fallback: string): string {
    const header = headers.get('content-disposition') ?? '';
    const encoded = header.match(
      /filename\*\s*=\s*[^']*'[^']*'([^;\r\n]+)/i,
    )?.[1];

    if (encoded) {
      try {
        return decodeURIComponent(encoded.trim().replace(/^"|"$/g, ''));
      } catch {
        // Not valid percent-encoding: fall through to the plain form
      }
    }

    const plain = header.match(/filename\s*=\s*("([^"]*)"|[^;\r\n]+)/i);
    const name = (plain?.[2] ?? plain?.[1])?.trim();
    return name || fallback;
  }
}
