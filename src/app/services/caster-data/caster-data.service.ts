// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

import {Injectable} from '@angular/core';
import {FormControl} from '@angular/forms';
import { Directory, CasterService } from 'src/app/generated/alloy.api';
import {map, take} from 'rxjs/operators';
import {Observable, combineLatest, BehaviorSubject} from 'rxjs';
import {Router, ActivatedRoute} from '@angular/router';

@Injectable({
  providedIn: 'root'
})

export class CasterDataService {
  private _apiDirectories: Directory[];
  private _directories: Directory[] = [];
  private _directoryMask: Observable<string>;
  readonly directories = new BehaviorSubject<Directory[]>(this._directories);
  readonly directoryList: Observable<Directory[]>;
  readonly directoryFilter = new FormControl();
  readonly selectedDirectory: Observable<Directory>;
  private _selectedDirectoryId: string;
  private _vmMask: Observable<string>;
  private requestedDirectoryId = this.activatedRoute.queryParamMap.pipe(
    map(params => params.get('exId') || '')
  );

  constructor(
    private casterService: CasterService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {
    this._directoryMask = activatedRoute.queryParamMap.pipe(
      map(params => params.get('exmask') || '')
    );
    this.directoryFilter.valueChanges.subscribe(term => {
      router.navigate([], { queryParams: { exmask: term }, queryParamsHandling: 'merge'});
    });
    this.directoryList = combineLatest([this.directories, this._directoryMask]).pipe(
      map(([items, filterTerm]) =>
        items ? (items as Directory[])
          .sort((a: Directory, b: Directory) => a.name.toLowerCase() < b.name.toLowerCase() ? -1 : 1)
          .filter(item => item.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
            item.id.toLowerCase().includes(filterTerm.toLowerCase()))
        : [])
    );
    this.selectedDirectory = combineLatest([this.directoryList, this.requestedDirectoryId]).pipe(
      map(([directoryList, requestedDirectoryId]) => {
        if (directoryList && directoryList.length > 0 && requestedDirectoryId) {
          const selectedDirectory = directoryList.find(directory => directory.id === requestedDirectoryId);
          if (selectedDirectory && selectedDirectory.id !== this._selectedDirectoryId) {
            this._selectedDirectoryId = selectedDirectory.id;
          }
          return selectedDirectory;
        } else {
          this._selectedDirectoryId = '';
          return undefined;
        }
      })
    );
  }

  private updateDirectories(directories: Directory[]) {
    this._directories = Object.assign([], directories);
    this.directories.next(this._directories);
  }

  getDirectoriesFromApi() {
    this.casterService.getDirectories().pipe(take(1)).subscribe(directories => {
        this._apiDirectories = directories;
      const directoryList = new Array<Directory>();
      const parentIds = new Array<string>();
      directories.forEach(d => {
        if (d.parentId) {
            parentIds.push(d.parentId);
        }
      });
      const leaves = directories.filter(d => {
        return !parentIds.includes(d.id);
      });
      leaves.forEach(leaf => {
        leaf.name = this.getFullName(leaf);
        directoryList.push(leaf);
      });
      this.updateDirectories(directoryList.sort((a: Directory, b: Directory) => a.name < b.name ? -1 : 1));
    }, error => {
      this.updateDirectories([]);
    });
  }

  selectDirectory(directoryId: string) {
    this.router.navigate([], { queryParams: { exId: directoryId }, queryParamsHandling: 'merge'});
  }

  private getFullName (me: Directory) {
    let name = me.name;
    if (me.parentId) {
        const parent = this._apiDirectories.find(d => d.id === me.parentId);
        name = this.getFullName(parent) + ' - ' + name;
    }
    return name;
  }

}
