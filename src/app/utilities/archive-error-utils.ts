// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

/** The largest file the Event Template import reads, as the API's ArchiveService.MaxBytes caps it. */
export const MAX_ARCHIVE_MB = 10;

/** The title the API's exception filter gives a 500 in production, which puts the reason in detail. */
const SERVER_ERROR_TITLE = 'A server error occurred.';

export default class ArchiveErrorUtils {
  /**
   * What to tell the user when an export or import request fails, from the most specific part of the answer:
   * the reason a request could not be sent or was too large, then the messages of a ValidationProblemDetails
   * (model binding), then the ProblemDetails title the API's exception filter writes. A blob request returns
   * its error body as a Blob, so that is read first. The detail of a 500 is a stack trace in development, so
   * it is only shown under the production title, where it holds the message.
   */
  static async message(err: any, fallback: string): Promise<string> {
    if (err?.status === 0) {
      return 'Alloy could not be reached. Check your connection and try again.';
    }

    if (err?.status === 413) {
      return `The file is too large to upload. Event Template files can be up to ${MAX_ARCHIVE_MB} MB.`;
    }

    const body = await ArchiveErrorUtils.readBody(err?.error);
    const errors = ArchiveErrorUtils.flatten(body?.errors);

    if (errors.length > 0) {
      return errors.join(' ');
    }

    if (body?.title === SERVER_ERROR_TITLE && body?.detail) {
      return body.detail;
    }

    return body?.title || fallback;
  }

  private static async readBody(error: unknown): Promise<any> {
    if (error instanceof Blob) {
      try {
        return JSON.parse(await error.text());
      } catch {
        return null;
      }
    }

    return typeof error === 'object' ? error : null;
  }

  /** The messages of a ValidationProblemDetails errors map ({ field: [messages] }). */
  private static flatten(errors: unknown): string[] {
    if (!errors || typeof errors !== 'object') {
      return [];
    }

    return Object.values(errors as Record<string, unknown>)
      .flatMap((x) => (Array.isArray(x) ? x : [x]))
      .filter((x): x is string => typeof x === 'string' && x.length > 0);
  }
}
