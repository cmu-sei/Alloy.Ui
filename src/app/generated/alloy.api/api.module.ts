/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

import { NgModule, ModuleWithProviders, SkipSelf, Optional } from '@angular/core';
import { Configuration } from './configuration';
import { HttpClient } from '@angular/common/http';


import { CasterService } from './api/caster.service';
import { EventService } from './api/event.service';
import { EventMembershipsService } from './api/eventMemberships.service';
import { EventPermissionsService } from './api/eventPermissions.service';
import { EventRolesService } from './api/eventRoles.service';
import { EventTemplateService } from './api/eventTemplate.service';
import { EventTemplateMembershipsService } from './api/eventTemplateMemberships.service';
import { EventTemplatePermissionsService } from './api/eventTemplatePermissions.service';
import { EventTemplateRolesService } from './api/eventTemplateRoles.service';
import { GroupService } from './api/group.service';
import { HealthService } from './api/health.service';
import { PlayerService } from './api/player.service';
import { SteamfitterService } from './api/steamfitter.service';
import { SystemPermissionsService } from './api/systemPermissions.service';
import { SystemRolesService } from './api/systemRoles.service';
import { UserService } from './api/user.service';

@NgModule({
  imports:      [],
  declarations: [],
  exports:      [],
  providers: []
})
export class ApiModule {
    public static forRoot(configurationFactory: () => Configuration): ModuleWithProviders<ApiModule> {
        return {
            ngModule: ApiModule,
            providers: [ { provide: Configuration, useFactory: configurationFactory } ]
        };
    }

    constructor( @Optional() @SkipSelf() parentModule: ApiModule,
                 @Optional() http: HttpClient) {
        if (parentModule) {
            throw new Error('ApiModule is already loaded. Import in your base AppModule only.');
        }
        if (!http) {
            throw new Error('You need to import the HttpClientModule in your AppModule! \n' +
            'See also https://github.com/angular/angular/issues/20575');
        }
    }
}
