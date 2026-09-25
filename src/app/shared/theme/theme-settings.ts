// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

/**
 * Resolves the app's color settings into the CSS custom properties the theme
 * paints with, and applies them. Implements the Crucible colors design
 * specification (`design-specs/angular/colors.md`).
 *
 * Framework-agnostic on purpose — no Angular, no Crucible imports, and the only
 * DOM access is through a `Document` handed in by the caller — so this module can
 * be lifted into `@cmusei/crucible-common` unchanged and shared across the
 * Crucible UIs. Keep it that way.
 *
 * ## Why the top bar and `primary` are separate settings
 *
 * The top bar shows the brand color in both themes. Material's `primary` role,
 * however, also colors text buttons, links, outlines and action icons drawn
 * directly on the surface (see `icon-button-overrides` in `styles.scss`), and a
 * brand color chosen to carry white top-bar text is too dark to meet WCAG 2.1 AA
 * against the dark surface. So the top bar, light-mode `primary` and dark-mode
 * `primary` are each configured by their own pair of keys.
 *
 * The compliant defaults ship in `settings.json`. `ComnSettingsService` loads it
 * first and deep merges `settings.shared.json` and `settings.env.json` over it,
 * so the defaults remain the base layer under any operator overlay.
 *
 * Every value is used exactly as given. Nothing here checks contrast, corrects,
 * clamps or derives a color: an operator who overrides a color owns its
 * accessibility compliance.
 */

/** The subset of app settings this module reads. All fields are optional. */
export interface ThemeColorSettings {
  /** Top bar background, in both themes. */
  AppTopBarHexColor?: string;
  /** Text/icon color on the top bar, in both themes. */
  AppTopBarHexTextColor?: string;
  /** `primary` in light mode. */
  AppLightModePrimaryHexColor?: string;
  /** `on-primary` in light mode. */
  AppLightModePrimaryHexTextColor?: string;
  /** `primary` in dark mode. Falls back to `AppLightModePrimaryHexColor`. */
  AppDarkModePrimaryHexColor?: string;
  /** `on-primary` in dark mode. Falls back to `AppLightModePrimaryHexTextColor`. */
  AppDarkModePrimaryHexTextColor?: string;
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

/** Alloy's brand color pair, used when a top-bar or light-mode key is absent. */
export const BRAND_COLORS = {
  color: '#006B6D',
  text: '#FFFFFF',
} as const;

/**
 * Resolve the colors for one theme. Each value is resolved independently: the
 * top-bar keys never affect `primary`, and the `primary` keys never affect the
 * top bar. A missing dark-mode key falls back to its light-mode counterpart; a
 * missing top-bar or light-mode key falls back to the brand color.
 */
export function resolveThemeColors(
  settings: ThemeColorSettings | null | undefined,
  isDark: boolean
): ResolvedThemeColors {
  const lightPrimary =
    settings?.AppLightModePrimaryHexColor || BRAND_COLORS.color;
  const lightOnPrimary =
    settings?.AppLightModePrimaryHexTextColor || BRAND_COLORS.text;

  return {
    topBarBackground: settings?.AppTopBarHexColor || BRAND_COLORS.color,
    topBarText: settings?.AppTopBarHexTextColor || BRAND_COLORS.text,
    primary: isDark
      ? settings?.AppDarkModePrimaryHexColor || lightPrimary
      : lightPrimary,
    onPrimary: isDark
      ? settings?.AppDarkModePrimaryHexTextColor || lightOnPrimary
      : lightOnPrimary,
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
