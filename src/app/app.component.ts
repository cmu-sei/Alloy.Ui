// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, HostBinding, OnDestroy } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ComnAuthQuery, Theme } from '@cmusei/crucible-common';
import { Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnDestroy {
  @HostBinding('class') componentCssClass: string;
  theme$: Observable<Theme> = this.authQuery.userTheme$;
  unsubscribe$: Subject<null> = new Subject<null>();
  constructor(
    iconRegistry: MatIconRegistry,
    sanitizer: DomSanitizer,
    private overlayContainer: OverlayContainer,
    private authQuery: ComnAuthQuery
  ) {
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
    const classList = this.overlayContainer.getContainerElement().classList;
    switch (theme) {
      case Theme.LIGHT:
        this.componentCssClass = theme;
        classList.add(theme);
        classList.remove(Theme.DARK);
        break;
      case Theme.DARK:
        this.componentCssClass = theme;
        classList.add(theme);
        classList.remove(Theme.LIGHT);
    }
  }

  ngOnDestroy() {
    this.unsubscribe$.next(null);
    this.unsubscribe$.complete();
  }
}
