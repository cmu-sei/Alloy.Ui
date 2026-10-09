# Alloy UI Readme

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) and uses Angular 21 (`@angular/core` and `@angular/cli` `^21.2.13`). Node.js `^20.19.0 || ^22.12.0 || >=24.0.0` is required by Angular 21; the Dockerfile builds with `node:24-alpine`.

Run `npm ci` (or `npm install`) first. The Angular CLI is a local devDependency, so use the `npm` scripts below instead of a global `ng`.

## Development server

Run `npm start` (`ng serve`) for a dev server. Navigate to `http://localhost:4403/` (port set in `angular.json`). Runtime configuration is read from `src/assets/config/settings.json`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build` (`ng build`) to build the project. The build artifacts will be stored in the `dist/browser` directory. Use `--configuration production` for an optimized production build (the `--prod` flag no longer exists; the default build configuration is not optimized).

## Running unit tests

Unit tests run on Vitest through Angular's `@angular/build:unit-test` builder, in jsdom with zone.js, following the Crucible UI test standard.

```bash
npm test               # run every spec once (ng test --watch=false)
npm run test:watch     # re-run on change (ng test)
npm run test:coverage  # run once with coverage and the thresholds in angular.json
npx ng test --watch=false --include='src/app/data/**/*.spec.ts'  # a subset
```

Shared test helpers (`renderComponent`, `getDefaultProviders`, `permissionDataProviders`, `mockHubConnectionBuilder`, `recordEmissions`, ...) live in `src/app/test-utils/`. `vitest.config.ts` applies `patches/` with patch-package when the tests start, because Akita ships ESM that Node cannot load unpatched.

## Running end-to-end tests

The `e2e` target in `angular.json` still references the `@angular-devkit/build-angular:protractor` builder, which is not available in current Angular versions, so `ng e2e` does not work on this branch. Likewise `npm run lint` (`ng lint`) targets the removed `@angular-devkit/build-angular:tslint` builder.

## Further help on Angular CLI

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).

## Reporting bugs and requesting features

Think you found a bug? Please report all Crucible bugs - including bugs for the individual Crucible apps - in the [cmu-sei/crucible issue tracker](https://github.com/cmu-sei/crucible/issues).

Include as much detail as possible including steps to reproduce, specific app involved, and any error messages you may have received.

Have a good idea for a new feature? Submit all new feature requests through the [cmu-sei/crucible issue tracker](https://github.com/cmu-sei/crucible/issues).

Include the reasons why you're requesting the new feature and how it might benefit other Crucible users.

## License

Copyright 2021 Carnegie Mellon University. See the [LICENSE.md](./LICENSE.md) files for details.
