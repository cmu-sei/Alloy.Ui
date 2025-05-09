/*
Copyright 2021 Carnegie Mellon University. All Rights Reserved. 
 Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.
*/

/**
 * Alloy API
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: v1
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */
import { InternalEventStatus } from './internalEventStatus';
import { EventStatus } from './eventStatus';


export interface Event { 
    dateCreated?: Date;
    dateModified?: Date | null;
    createdBy?: string;
    modifiedBy?: string | null;
    id?: string;
    userId?: string;
    username?: string | null;
    eventTemplateId?: string | null;
    viewId?: string | null;
    workspaceId?: string | null;
    runId?: string | null;
    scenarioId?: string | null;
    name?: string | null;
    description?: string | null;
    shareCode?: string | null;
    status?: EventStatus;
    internalStatus?: InternalEventStatus;
    failureCount?: number;
    lastLaunchStatus?: EventStatus;
    lastLaunchInternalStatus?: InternalEventStatus;
    lastEndStatus?: EventStatus;
    lastEndInternalStatus?: InternalEventStatus;
    statusDate?: Date;
    launchDate?: Date | null;
    endDate?: Date | null;
    expirationDate?: Date | null;
    eventPermissions?: Array<string> | null;
}

