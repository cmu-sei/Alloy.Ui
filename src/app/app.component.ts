// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnDestroy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import {
  ComnAuthQuery,
  ComnSettingsService,
  Theme,
} from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TopbarView } from './components/shared/top-bar/topbar.models';

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnDestroy {
  theme$: Observable<Theme> = this.authQuery.userTheme$;
  unsubscribe$: Subject<null> = new Subject<null>();

  titleText: string;
  TopbarView = TopbarView;

  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private authQuery: ComnAuthQuery,
    private settingsService: ComnSettingsService,
  ) {
    iconRegistry.setDefaultFontSetClass('mdi');

    // Set the page title from configuration file
    this.titleText = this.settingsService.settings.AppTopBarText;

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
      this.setTheme(theme);
    });
  }

  setTheme(theme: Theme) {
    document.body.classList.toggle('darkMode', theme === Theme.DARK);
    const primaryColor = this.settingsService.settings?.AppPrimaryThemeColor || '#C41230';
    if (primaryColor) {
      document.documentElement.style.setProperty('--mat-sys-primary', primaryColor);
      document.body.style.setProperty('--mat-sys-primary', primaryColor);
      this.updateFavicon(primaryColor);
    }
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

  isIframe(): boolean {
    if (window.location !== window.parent.location) {
      // The page is in an iframe
      return true;
    } else {
      // The page is not in an iframe
      return false;
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
