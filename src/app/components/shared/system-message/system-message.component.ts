// Copyright 2026 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import { Component, OnInit, inject } from '@angular/core';
import {
  MatBottomSheetRef,
  MAT_BOTTOM_SHEET_DATA,
} from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-system-message',
  templateUrl: './system-message.component.html',
  styleUrls: ['./system-message.component.scss'],
  imports: [MatButtonModule, MatIconModule],
})
export class SystemMessageComponent implements OnInit {
  messageSheet =
    inject<MatBottomSheetRef<SystemMessageComponent>>(MatBottomSheetRef);
  data = inject(MAT_BOTTOM_SHEET_DATA);

  public displayTitle: string;
  public displayMessage: string;

  constructor() {
    const data = this.data;

    this.displayTitle = data.title;
    this.displayMessage = data.message;
  }

  ngOnInit() {}

  close() {
    this.messageSheet.dismiss();
  }
}
