# Angular Material Migration Log

This document tracks all Angular Material changes made during the upgrade from Angular 15 to Angular 21.

## Format
Each entry includes:
- **Version Step**: The Angular version jump (e.g., 15→16)
- **Change**: What was modified (before/after)
- **Files**: Files touched
- **TODOs**: Any manual verification needed

---

## 15→16: Replace Legacy Material Imports

**Change**: Replaced all `@angular/material/legacy-*` imports with non-legacy equivalents
- Before: `import { MatLegacyDialog as MatDialog } from '@angular/material/legacy-dialog'`
- After: `import { MatDialog } from '@angular/material/dialog'`

**Files**: 24 files updated
- src/app/app.module.ts
- src/app/shared/name-dialog/name-dialog.component.ts
- src/app/services/dialog/dialog.service.ts
- src/app/datasource-utils.ts
- src/app/data/event-template/event-template.query.ts
- Multiple component files in admin-app and home-app directories

**Components migrated**:
- Dialog, Paginator, Autocomplete, Button, Card, Checkbox, Chips
- Input, List, Menu, Progress Bar, Progress Spinner, Radio
- Select, Slider, Slide Toggle, Snack Bar, Table, Tabs, Tooltip

**TODOs**: None - all replacements maintain existing class names via aliases

## 15→16: Material MDC Migration

**Change**: Ran `ng generate @angular/material:mdc-migration` to add MDC (Material Design Components) styles
- Before: Only legacy Material component styles loaded
- After: Both legacy and MDC styles loaded (transitional state)

**Files**:
- src/styles/_theme.scss - Added `mat.all-component-typographies()` and changed typography config to non-legacy
- src/styles/styles.scss - Added `mat.core()`, `mat.all-component-typographies()`, and `mat.all-component-themes()` for both themes

**Changes**:
- Typography: Added `mat.define-typography-config()` alongside legacy version
- Core: Added `mat.core()` alongside `mat.legacy-core()`
- Themes: Added `mat.all-component-themes()` for light-theme and dark-theme

**TODOs**:
- Visual verification of all Material components (forms, dialogs, tables, etc.)
- TODO comments added by migration indicate legacy styles can be removed after full migration
- Monitor for any styling discrepancies during Angular 16 upgrade

## 15→16: Fix MatLegacyTableDataSource Imports

**Change**: Replaced missed MatLegacyTableDataSource imports after build failure
- Before: `import { MatLegacyTableDataSource as MatTableDataSource } from '@angular/material/table'`
- After: `import { MatTableDataSource } from '@angular/material/table'`

**Files**: 15 component files using table data sources
- All admin-app list components (users, groups, events, event-templates, roles)
- All home-app list components

**TODOs**: None - build now succeeds

## 16→17: Remove All Legacy Material Components

**Change**: Removed all legacy Material component references as they no longer exist in Angular Material 17
- Removed: `mat.all-legacy-component-typographies()`
- Removed: `mat.all-legacy-component-themes()`
- Removed: `mat.legacy-core()`
- Removed: `@import '@angular/material/theming'` (no longer available)

**Files**:
- src/styles/styles.scss - Removed legacy typography, core, and theme includes
- src/styles/_theme.scss - Removed legacy theming import and typography includes

**New Approach**:
- Added manual definitions for Material theming variables ($dark-primary-text, $light-primary-text, etc.)
- Now using only `mat.all-component-typographies()`, `mat.core()`, and `mat.all-component-themes()`
- Theming variables that were previously exported now defined locally

**TODOs**:
- Visual verification of all components to ensure theming works correctly
- Monitor for any color/typography inconsistencies

## 17→18: Material M2 Theming Migration

**Change**: Angular Material 18 migration updated theming to use M2 (Material 2) prefixed APIs
- Before: `mat.$grey-palette`, `mat.define-palette()`, `mat.define-typography-config()`
- After: `mat.$m2-grey-palette`, `mat.m2-define-palette()`, `mat.m2-define-typography-config()`

**Files**:
- src/styles/_theme.scss - All palette and theming functions updated with m2- prefix

**Automatic Migrations**:
- HttpClientModule replaced with provider functions in app.module.ts
- All generated API service files updated to use new HTTP imports

**Changes**:
- `mat.$grey-palette` → `mat.$m2-grey-palette`
- `mat.$red-palette` → `mat.$m2-red-palette`
- `mat.define-palette()` → `mat.m2-define-palette()`
- `mat.define-typography-config()` → `mat.m2-define-typography-config()`
- `mat.get-color-from-palette()` → `mat.m2-get-color-from-palette()`

**TODOs**:
- None - migration was automatic and build succeeds

## 18→19: Component Standalone Status Migration

**Change**: Angular 19 migration added explicit `standalone: false` to all non-standalone components
- 33 component files updated with `standalone: false` decorator property
- Prepares codebase for eventual migration to standalone components

**Files**:
- All component files across admin-app, home-app, and shared directories
- src/app/app.component.ts and other root components

**Material Changes**:
- Minor style updates in src/styles/styles.scss (automatic migration)

**TODOs**:
- None - migration was automatic and build succeeds

