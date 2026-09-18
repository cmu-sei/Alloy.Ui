// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import {
  ComnAuthQuery,
  ComnAuthService,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnDestroy {
  theme$: Observable<Theme> = this.authQuery.userTheme$;
  private paramTheme;
  unsubscribe$: Subject<null> = new Subject<null>();

  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private authQuery: ComnAuthQuery,
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private authService: ComnAuthService,
    private settingsService: ComnSettingsService,
  ) {
    iconRegistry.setDefaultFontSetClass('mdi');

    iconRegistry.addSvgIcon(
      'ic_apps_white_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_apps_white_24px.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_chevron_left',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_chevron_left.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_chevron_right',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_chevron_right.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_expand_more_white_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_expand_more_white_24px.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_clear_black_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_clear_black_24px.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_expand_more_black_24px',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_expand_more_black_24px.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_cancel_circle',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_cancel_circle.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_back_arrow',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_back_arrow_24px.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_magnify_search',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_magnify_glass.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_clipboard_copy',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_clipboard_copy.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'clipboard_outline',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/clipboard-outline.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'clipboard_play_outline',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/clipboard-play-outline.svg'
      )
    );
    iconRegistry.addSvgIcon(
      'ic_crucible_alloy',
      sanitizer.bypassSecurityTrustResourceUrl(
        'assets/svg-icons/ic_crucible_alloy.svg'
      )
    );

    this.theme$.pipe(takeUntil(this.unsubscribe$)).subscribe((theme) => {
      if (this.paramTheme && this.paramTheme !== theme) {
        this.router.navigate([], {
          queryParams: { theme: theme },
          queryParamsHandling: 'merge',
        });
      }
      this.setTheme(theme);
    });
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.unsubscribe$))
      .subscribe((params) => {
        const theme = params.get('theme');
        if (theme != null) {
          this.paramTheme = theme === Theme.DARK ? Theme.DARK : Theme.LIGHT;
          this.authService.setUserTheme(this.paramTheme);
        }
      });
  }

  setTheme(theme: Theme) {
    const isDark = theme === Theme.DARK;
    document.body.classList.toggle('darkMode', isDark);

    const topBarColor =
      this.settingsService.settings?.AppTopBarHexColor || '#C41230';
    const topBarTextColor =
      this.settingsService.settings?.AppTopBarHexTextColor || '#FFFFFF';

    const root = document.documentElement.style;
    const body = document.body.style;

    // The top bar always shows the configured brand color, in either theme, via
    // its own tokens. It used to reuse Material's `primary` role for this, but
    // `primary` also tints meaningful action icons (see icon-button-overrides in
    // styles.scss), so conflating the two forced every action icon to the brand
    // color everywhere.
    root.setProperty('--app-topbar-background', topBarColor);
    body.setProperty('--app-topbar-background', topBarColor);
    root.setProperty('--app-topbar-text', topBarTextColor);
    body.setProperty('--app-topbar-text', topBarTextColor);
    this.updateFavicon(topBarColor);

    // The brand color reads fine as the action-icon tint on the light surface,
    // but on the dark surface it falls to ~2:1 — below the WCAG 1.4.11 3:1
    // non-text-contrast minimum. In dark mode we lighten it (and flip on-primary
    // to a contrasting tone for filled-primary elements); light mode keeps the
    // brand color unchanged.
    const primary = isDark ? this.lighten(topBarColor, 0.4) : topBarColor;
    const onPrimary = isDark ? this.bestTextColor(primary) : topBarTextColor;
    root.setProperty('--mat-sys-primary', primary);
    body.setProperty('--mat-sys-primary', primary);
    root.setProperty('--mat-sys-on-primary', onPrimary);
    body.setProperty('--mat-sys-on-primary', onPrimary);
  }

  /** Blend a hex color toward white by `ratio` (0–1) to lighten it. */
  private lighten(hex: string, ratio: number): string {
    const mix = (c: number) => Math.round(c + (255 - c) * ratio);
    const [r, g, b] = this.parseHex(hex);
    return this.toHex(mix(r), mix(g), mix(b));
  }

  /** Return black or white — whichever contrasts more with `hex`. */
  private bestTextColor(hex: string): string {
    return this.contrast(hex, '#000000') >= this.contrast(hex, '#FFFFFF')
      ? '#000000'
      : '#FFFFFF';
  }

  private parseHex(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  private toHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b].map((c) => c.toString(16).padStart(2, '0')).join('')
    );
  }

  /** WCAG relative luminance of a hex color. */
  private relativeLuminance(hex: string): number {
    const [r, g, b] = this.parseHex(hex).map((c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /** WCAG contrast ratio between two hex colors. */
  private contrast(a: string, b: string): number {
    const la = this.relativeLuminance(a);
    const lb = this.relativeLuminance(b);
    const hi = Math.max(la, lb);
    const lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
  }

  private updateFavicon(color: string) {
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!link) return;
    fetch(link.href)
      .then(res => res.text())
      .then(svg => {
        const colored = svg.replace(/\.cls-1\{[^}]*\}/, `.cls-1{fill:${color};}`);
        const blob = new Blob([colored], { type: 'image/svg+xml' });
        link.href = URL.createObjectURL(blob);
      });
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
