// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { HttpHeaders } from '@angular/common/http';

export default class HttpHeaderUtils {
  /** The filename from a Content-Disposition header, or the fallback if it is absent or not exposed by CORS. */
  static getFilename(headers: HttpHeaders, fallback: string): string {
    const match = headers
      .get('content-disposition')
      ?.match('filename\\*?=[\'"]?(?:UTF-\\d[\'"]*)?([^;\r\n"\']*)[\'"]?;?');
    return match?.[1] ? decodeURIComponent(match[1]) : fallback;
  }
}
