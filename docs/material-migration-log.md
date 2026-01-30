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

