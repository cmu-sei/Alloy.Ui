/*
Crucible
Copyright 2020 Carnegie Mellon University.
NO WARRANTY. THIS CARNEGIE MELLON UNIVERSITY AND SOFTWARE ENGINEERING INSTITUTE MATERIAL IS FURNISHED ON AN "AS-IS" BASIS. CARNEGIE MELLON UNIVERSITY MAKES NO WARRANTIES OF ANY KIND, EITHER EXPRESSED OR IMPLIED, AS TO ANY MATTER INCLUDING, BUT NOT LIMITED TO, WARRANTY OF FITNESS FOR PURPOSE OR MERCHANTABILITY, EXCLUSIVITY, OR RESULTS OBTAINED FROM USE OF THE MATERIAL. CARNEGIE MELLON UNIVERSITY DOES NOT MAKE ANY WARRANTY OF ANY KIND WITH RESPECT TO FREEDOM FROM PATENT, TRADEMARK, OR COPYRIGHT INFRINGEMENT.
Released under a MIT (SEI)-style license, please see license.txt or contact permission@sei.cmu.edu for full terms.
[DISTRIBUTION STATEMENT A] This material has been approved for public release and unlimited distribution.  Please see Copyright notice for non-US Government use and distribution.
Carnegie Mellon(R) and CERT(R) are registered in the U.S. Patent and Trademark Office by Carnegie Mellon University.
DM20-0181
*/

import { Injectable } from '@angular/core';
import { EventTemplateService, EventTemplate, Event, EventService } from 'src/app/generated/alloy.api';
import { Observable, BehaviorSubject, combineLatest, of } from 'rxjs';
import { FormControl } from '@angular/forms';
import { map, shareReplay, take, mergeMap, tap, switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class EventTemplatesService {

  public eventTemplateList$: Observable<EventTemplate[]>;
  public searchControl$ = new FormControl();
  public selectedEventTemplateId: string | undefined = undefined;
  public fullEventTemplateList$ = new BehaviorSubject<EventTemplate[]>([]);


  public currentEventTemplate$: Observable<EventTemplate>;
  private searchTerm$ = new BehaviorSubject<string>('');
  private currentEventTemplateId$ = new BehaviorSubject<string>('');


  constructor(
    private eventTemplateService: EventTemplateService
  ) {

    this.updatelist();

    this.searchControl$.valueChanges.subscribe(searchString => {
      this.searchTerm$.next(searchString.trim().toLowerCase());
    });

    this.eventTemplateList$ = combineLatest([this.fullEventTemplateList$, this.searchTerm$]).pipe(
      map(([defs, srcTerm]) => {
        if (srcTerm === '') {
          return defs;
        } else {
          return defs.filter(d => d.name.toLowerCase().includes(srcTerm.toLowerCase()));
        }
      }),
      shareReplay(1)
    );

    this.currentEventTemplate$ = this.currentEventTemplateId$.pipe(
      switchMap(id => {
        return this.eventTemplateService.getEventTemplate(id).pipe(take(1));
      })
    );

  }

  addNew(eventTemplate: EventTemplate) {
    this.eventTemplateService.createEventTemplate(eventTemplate).pipe(take(1)).subscribe((def) => {
      this.selectedEventTemplateId = def.id;
      this.updatelist();
    });
  }

  update(eventTemplate: EventTemplate) {
    this.eventTemplateService.updateEventTemplate(eventTemplate.id, eventTemplate).pipe(take(1)).subscribe(() => {
      this.updatelist();
    });
  }

  delete(eventTemplate: string) {
    this.eventTemplateService.deleteEventTemplate(eventTemplate).pipe(take(1)).subscribe(() => {
      this.updatelist();
    });
  }

  getEventTemplate(id: string) {
    this.currentEventTemplateId$.next(id);
  }

  private updatelist() {
    this.eventTemplateService.getEventTemplates().pipe(take(1)).subscribe(defs => this.fullEventTemplateList$.next(defs));
  }
}
