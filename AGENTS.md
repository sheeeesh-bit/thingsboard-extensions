# Repository Guidelines

## Project Structure & Module Organization
Widgets live under `src/app/components/widgets`, sharing interfaces in `src/app/interfaces` and localized text in `src/app/locale`. Shared services (`src/app/services`) handle data shaping, exports, and error management, while `src/app/scss` stores the Tailwind/PostCSS pipeline (`style.scss` → `style.comp.scss`). Build metadata (`angular.json`, `tsconfig*.json`, `load-tb-classes.js`) and custom builders (`builders/`) sit at the root. Use `docs/` for design notes, `examples/` for runnable snippets, and `tests/` for Playwright specs. Compiled bundles land in `dist/` during dev and `target/generated-resources/` after a release build.

## Build, Test, and Development Commands
- `npm install`: install Angular 18 toolchain plus ThingsBoard UI types (Node ≥ 18.19).
- `npm start`: compiles SCSS, launches the Angular dev server, and serves widgets for live preview at `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`.
- `npm run build`: production build, reruns SCSS compilation, executes `ng build`, then runs `node install.js` to stage the widget bundle under `target/...`.
- `npm run build:scss`: regenerates the compiled styles only; run after touching Tailwind tokens.
- `npm run lint`: Angular ESLint suite for TS, HTML templates, and Tailwind usage.

## Coding Style & Naming Conventions
Follow `.editorconfig`: UTF-8, two-space indentation, no trailing whitespace. Prefer Angular/TypeScript best practices—strong typing, `Observable` streams for async data, and template selectors in kebab-case (e.g., `tb-chart-settings`). Use PascalCase for classes/services, camelCase for members, and suffix files (`*.service.ts`, `*.component.ts`). Prettier and ESLint should run clean before pushing. Keep SCSS layered: variables in `lib-styles.ts`, component scopes near their widget folder.

## Testing Guidelines
Place Playwright specs under `tests/` named `*.spec.ts`. Target the published widget behavior (e.g., verifying zoom controls) and stub backend data where possible. Run `npx playwright test` locally; add `--headed` when debugging. New features should include at least one scenario guarding regressions, especially around data zoom and device filtering logic described in the research memos.

## Commit & Pull Request Guidelines
Recent history mixes Conventional Commit prefixes (`feat:`, `fix:`) with descriptive sentences; prefer the `type: subject` style (`feat: add Echarts Line Chart settings component`). Reference ThingsBoard tickets in the body, list notable configs touched (services, SCSS, tests), and mention any manual verification steps (e.g., “validated via npm start against demo tenant”). Pull requests should include scope summaries, screenshots or GIFs for UI tweaks, linked issues, and notes on how reviewers can reproduce test runs.
