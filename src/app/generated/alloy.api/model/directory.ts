// Copyright 2021 Carnegie Mellon University. All Rights Reserved.
// Released under a MIT (SEI)-style license. See LICENSE.md in the project root for license information.

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
import { Workspace } from './workspace';


export interface Directory { 
    id?: string | null;
    name?: string | null;
    projectId?: string | null;
    parentId?: string | null;
    files?: Array<any> | null;
    workspaces?: Array<Workspace> | null;
}

