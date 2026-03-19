# Alloy UI Readme

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 7.1.4.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory. Use the `--prod` flag for a production build.

## Running unit tests

Alloy UI uses **Vitest** with `@testing-library/angular`. Test files use the `.vitest.ts` extension.

```bash
npm test                    # Run all tests (jsdom, fast)
npm run test:watch          # Watch mode
npm run test:coverage       # With coverage report
npm run test:browser        # Run in headless Chromium via Playwright
```

### Permission Tests

Comprehensive permission tests verify UI gating across all three permission tiers:

| File | Coverage |
|------|----------|
| `src/app/test-utils/mock-permission-data.service.ts` | `permissionProvider(systemPerms, eventPerms, eventTemplatePerms)` factory |
| `src/app/data/permission/permission-data.service.vitest.ts` | All 15 `SystemPermission` values, `canEditEvent/canManageEvent/canExecuteEvent()` hierarchy, `canEditEventTemplate/canManageEventTemplate()` |
| `src/app/components/home-app/home-app.component.vitest.ts` | Admin link visibility gated by `canViewAdiminstration()` |

Key patterns tested:
- System permission grants access to any event/template ID
- Resource-level permission only grants access to the specific ID
- `canViewAdiminstration()` (note: intentional typo matches service) returns `true` for any `View*` permission

## Further help on Angular CLI

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Reporting bugs and requesting features

Think you found a bug? Please report all Crucible bugs - including bugs for the individual Crucible apps - in the [cmu-sei/crucible issue tracker](https://github.com/cmu-sei/crucible/issues).

Include as much detail as possible including steps to reproduce, specific app involved, and any error messages you may have received.

Have a good idea for a new feature? Submit all new feature requests through the [cmu-sei/crucible issue tracker](https://github.com/cmu-sei/crucible/issues).

Include the reasons why you're requesting the new feature and how it might benefit other Crucible users.

## License

Copyright 2021 Carnegie Mellon University. See the [LICENSE.md](./LICENSE.md) files for details.
