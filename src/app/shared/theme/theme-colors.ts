// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

/**
 * Framework-agnostic color math.
 *
 * Deliberately free of Angular, DOM and Crucible imports so this module can be
 * lifted into `@cmusei/crucible-common` unchanged and shared across the Crucible
 * UIs. Keep it that way: pure functions over hex strings, nothing else.
 *
 * Every input here ultimately comes from operator-editable settings, so nothing
 * assumes well-formed hex. The measurement functions return `null` rather than
 * `NaN` for input they cannot parse, and the two functions on the theme's runtime
 * path (`lighten` and `bestContrastingText`) degrade to a safe value instead of
 * emitting a malformed color that would blank out whatever it was tinting.
 */

/** Matches `#rgb` / `#rrggbb`, with or without the leading `#`, any case. */
const HEX_PATTERN = /^#?(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Split `#rgb` or `#rrggbb` into its three 0–255 channels, expanding shorthand
 * (`#fff` → `[255, 255, 255]`). Returns `null` for anything unparseable, so
 * callers must decide how to degrade rather than silently propagating `NaN`.
 */
export function parseHex(hex: string): [number, number, number] | null {
  if (!hex || !HEX_PATTERN.test(hex)) {
    return null;
  }
  const h = hex.replace('#', '');
  const pairs =
    h.length === 3
      ? Array.from(h, (c) => c + c)
      : [h.slice(0, 2), h.slice(2, 4), h.slice(4, 6)];
  const [r, g, b] = pairs.map((pair) => parseInt(pair, 16));
  return [r, g, b];
}

/**
 * Join three channels into a lowercase `#rrggbb` string, rounding and clamping
 * each into 0–255 so the result is always exactly six hex digits.
 */
export function toHex(r: number, g: number, b: number): string {
  const channel = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c)))
      .toString(16)
      .padStart(2, '0');
  return '#' + [r, g, b].map(channel).join('');
}

/**
 * Blend a hex color toward white by `ratio` (0–1) to lighten it. Unparseable
 * input is returned unchanged: passing it through lets the browser ignore one
 * bad custom property, where a malformed value would drop the color entirely.
 */
export function lighten(hex: string, ratio: number): string {
  const channels = parseHex(hex);
  if (!channels) {
    return hex;
  }
  const mix = (c: number) => c + (255 - c) * ratio;
  const [r, g, b] = channels;
  return toHex(mix(r), mix(g), mix(b));
}

/** WCAG relative luminance of a hex color, or `null` if it cannot be parsed. */
export function relativeLuminance(hex: string): number | null {
  const channels = parseHex(hex);
  if (!channels) {
    return null;
  }
  const [r, g, b] = channels.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * WCAG contrast ratio between two hex colors, from 1 to 21. Returns `null` if
 * either color cannot be parsed — callers checking a threshold should treat
 * `null` as "unknown", not as a pass.
 */
export function contrastRatio(a: string, b: string): number | null {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) {
    return null;
  }
  const hi = Math.max(la, lb);
  const lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Return black or white — whichever contrasts more with `hex`. Ties go to black.
 * Falls back to white for unparseable input, matching the light-on-dark default
 * the Crucible themes use for unknown surfaces.
 */
export function bestContrastingText(hex: string): string {
  const onBlack = contrastRatio(hex, '#000000');
  const onWhite = contrastRatio(hex, '#FFFFFF');
  if (onBlack === null || onWhite === null) {
    return '#FFFFFF';
  }
  return onBlack >= onWhite ? '#000000' : '#FFFFFF';
}
