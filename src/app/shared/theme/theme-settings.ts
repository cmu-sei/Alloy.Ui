// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

/**
 * Resolves the app's configured brand colors into the CSS custom properties the
 * theme actually paints with, and applies them.
 *
 * Framework-agnostic on purpose — no Angular, no Crucible imports, and the only
 * DOM access is through a `Document` handed in by the caller — so this module can
 * be lifted into `@cmusei/crucible-common` unchanged and shared across the
 * Crucible UIs. Keep it that way.
 *
 * ## Why the dark values are settings rather than computed
 *
 * The top bar shows the brand color in both themes. Material's `primary` role,
 * however, also tints meaningful action icons (see `icon-button-overrides` in
 * `styles.scss`), and a brand color chosen to carry white top-bar text is too
 * dark to clear the WCAG 2.1 AA 1.4.11 3:1 non-text-contrast minimum against the
 * dark surface. The two roles need different values in dark mode.
 *
 * The app ships compliant dark values in `settings.json` rather than deriving
 * them at runtime. `ComnSettingsService` loads `settings.json` first and deep
 * merges `settings.shared.json` and `settings.env.json` over it, and the Helm
 * chart mounts only those two overlays — so the shipped defaults are always the
 * base layer and are always compliant with no operator action. An operator who
 * overrides them owns the result: nothing here corrects or clamps an explicit
 * value. `AppDarkModeAutoLightenPrimary` is the opt-in escape hatch for
 * operators who set a custom brand color and want a matching dark accent without
 * doing the math themselves.
 */

import { bestContrastingText, lighten } from './theme-colors';

/** The subset of app settings this module reads. All fields are optional. */
export interface ThemeColorSettings {
  /** Brand color: the top bar fill in both themes, and `primary` in light mode. */
  AppTopBarHexColor?: string;
  /** Text/icon color drawn on the brand color. */
  AppTopBarHexTextColor?: string;
  /** `primary` in dark mode. Used verbatim — never contrast-corrected. */
  AppDarkModePrimaryHexColor?: string;
  /** `on-primary` in dark mode. Used verbatim — never contrast-corrected. */
  AppDarkModePrimaryHexTextColor?: string;
  /**
   * Opt in to deriving the dark values from `AppTopBarHexColor` instead of
   * reading them from settings. Defaults to off.
   */
  AppDarkModeAutoLightenPrimary?: boolean;
}

/** The resolved colors, one per CSS custom property the theme sets. */
export interface ResolvedThemeColors {
  /** `--app-topbar-background` */
  topBarBackground: string;
  /** `--app-topbar-text` */
  topBarText: string;
  /** `--mat-sys-primary` */
  primary: string;
  /** `--mat-sys-on-primary` */
  onPrimary: string;
}

/** Fallbacks for when a setting is absent entirely. */
export const THEME_COLOR_FALLBACKS = {
  topBarBackground: '#C41230',
  topBarText: '#FFFFFF',
} as const;

/** How much to blend the brand color toward white when auto-lightening. */
export const AUTO_LIGHTEN_RATIO = 0.4;

/**
 * Resolve the colors for one theme.
 *
 * The top bar always takes the brand color, in either theme. In light mode
 * `primary`/`onPrimary` are the brand pair too. In dark mode they resolve in this
 * order:
 *
 * 1. `AppDarkModeAutoLightenPrimary === true` — derive from the brand color:
 *    `lighten(brand, AUTO_LIGHTEN_RATIO)` paired with `bestContrastingText` of
 *    that result. Takes precedence over the explicit settings below, so an
 *    operator can flip the toggle without first clearing them.
 * 2. `AppDarkModePrimaryHexColor` / `AppDarkModePrimaryHexTextColor` — used
 *    verbatim. No contrast correction: override badly and the result is bad.
 *    Each is honored independently, so setting only the color still resolves a
 *    text value (and vice versa) via step 3.
 * 3. The brand pair, unchanged. In practice this never applies, because the
 *    shipped `settings.json` always supplies step 2's values; it exists so the
 *    function degrades predictably instead of returning `undefined`.
 */
export function resolveThemeColors(
  settings: ThemeColorSettings | null | undefined,
  isDark: boolean
): ResolvedThemeColors {
  const topBarBackground =
    settings?.AppTopBarHexColor || THEME_COLOR_FALLBACKS.topBarBackground;
  const topBarText =
    settings?.AppTopBarHexTextColor || THEME_COLOR_FALLBACKS.topBarText;

  if (!isDark) {
    return {
      topBarBackground,
      topBarText,
      primary: topBarBackground,
      onPrimary: topBarText,
    };
  }

  if (settings?.AppDarkModeAutoLightenPrimary === true) {
    const primary = lighten(topBarBackground, AUTO_LIGHTEN_RATIO);
    return {
      topBarBackground,
      topBarText,
      primary,
      onPrimary: bestContrastingText(primary),
    };
  }

  return {
    topBarBackground,
    topBarText,
    primary: settings?.AppDarkModePrimaryHexColor || topBarBackground,
    onPrimary: settings?.AppDarkModePrimaryHexTextColor || topBarText,
  };
}

/**
 * Write the resolved colors onto `doc` as CSS custom properties.
 *
 * Sets each property on both `documentElement` and `body`: Material components
 * resolve `--mat-sys-*` from whichever is nearer, and the app toggles the
 * `darkMode` class on `body`.
 */
export function applyThemeColors(
  colors: ResolvedThemeColors,
  doc: Document
): void {
  const properties: [string, string][] = [
    ['--app-topbar-background', colors.topBarBackground],
    ['--app-topbar-text', colors.topBarText],
    ['--mat-sys-primary', colors.primary],
    ['--mat-sys-on-primary', colors.onPrimary],
  ];

  for (const target of [doc.documentElement.style, doc.body.style]) {
    for (const [name, value] of properties) {
      target.setProperty(name, value);
    }
  }
}
