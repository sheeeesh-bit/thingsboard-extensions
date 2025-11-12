# ThingsBoard Extension Widgets - Project Structure

## Overview
This document describes the organized folder structure of the ThingsBoard Extension Widgets project.

## Root Directory Structure

```
thingsboard-extensions/
├── README.md                       # Main project documentation
├── CLAUDE.md                       # Symlink to docs/CLAUDE.md
├── package.json                    # NPM dependencies
├── package-lock.json
├── angular.json                    # Angular CLI configuration
├── tsconfig.json                   # TypeScript configuration
├── eslint.config.mjs               # ESLint configuration
├── postcss.config.js               # PostCSS configuration
├── tailwind.config.js              # Tailwind CSS configuration
├── install.js                      # Post-build installation script
├── load-tb-classes.js              # ThingsBoard class loader
├── static.serve.conf.js            # Development server config
│
├── .claude/                        # Claude Code configuration
│   └── settings.local.json
│
├── docs/                           # 📚 All documentation
│   ├── CLAUDE.md                   # Claude Code instructions
│   ├── CODE_QUALITY_IMPROVEMENTS.md
│   ├── ENTITY_ATTRIBUTES_GUIDE.md
│   ├── LEGEND_DEVICE_STATE_ANALYSIS.md
│   ├── WIDGET_QUICK_START.md
│   ├── WIDGET_STRUCTURE_COMPARISON.md
│   ├── WIDGET_INFO.md
│   ├── THINGSBOARD_IMPORT_GUIDE.md
│   ├── PROJECT_STRUCTURE.md        # This file
│   ├── todo/                       # Todo lists
│   │   └── todo.md
│   └── migration/                  # Historical migration docs
│       ├── CLEANUP_COMPLETE.md
│       ├── MIGRATION_COMPLETE.md
│       ├── NEW_WIDGET_SETUP_COMPLETE.md
│       └── after_clear.md
│
├── archive/                        # 🗄️ Old/temporary files (not tracked)
│   ├── backups/
│   │   └── echarts-line-chart.component.backup.ts
│   ├── logs/
│   │   ├── npm-server.log
│   │   └── server.log
│   └── temp/
│       ├── PROJECT_STRUCTURE.txt
│       ├── README_WIDGET_SETUP.txt
│       ├── create-widget.sh
│       ├── executeautomation-playwright-mcp-server-1.0.6.tgz
│       ├── test-pulldown.html
│       ├── multi-chart-architecture.example.ts
│       └── mcp-server-package/
│
├── builders/                       # 🔧 Angular custom builders
│   ├── builders.json
│   ├── package.json
│   ├── tsconfig.builders.json
│   └── static-serve/
│       ├── index.ts
│       ├── index.js
│       └── schema.json
│
├── patches/                        # 🩹 NPM package patches
│   ├── @angular+compiler-cli+18.2.13.patch
│   └── ng-packagr+18.2.1.patch
│
├── examples/                       # 📖 Widget examples for ThingsBoard
│   ├── echarts-line-chart/
│   │   ├── README.md
│   │   └── echarts_line_chart.json
│   ├── example-action/
│   ├── example-chart/
│   ├── example-of-using-third-party-library/
│   ├── example-table/
│   ├── example-table-with-custom-settings/
│   ├── example-table-with-custom-subscription/
│   └── images/
│
├── tests/                          # 🧪 Test files
│   └── example.spec.ts
│
├── src/                            # 💻 Source code
│   ├── package.json
│   ├── ng-package.json
│   ├── tsconfig.lib.json
│   ├── tsconfig.lib.prod.json
│   ├── eslint.config.mjs
│   │
│   └── app/
│       ├── thingsboard-extension-widgets.module.ts  # Main module
│       ├── public-api.ts                            # Public exports
│       │
│       ├── components/
│       │   └── widgets/                             # Production widgets
│       │       ├── widgets.module.ts                # Widget registration
│       │       ├── public-api.ts                    # Widget exports
│       │       │
│       │       └── echarts-line-chart/              # ECharts Line Chart Widget
│       │           ├── echarts-line-chart.component.ts       # Main (7109 lines)
│       │           ├── echarts-line-chart.component.html
│       │           ├── echarts-line-chart.component.scss
│       │           ├── echarts-line-chart-sidebar.scss
│       │           ├── echarts-line-chart-widget.js          # Widget.js bridge
│       │           ├── settings-schema.json
│       │           ├── data-key-settings-schema.json
│       │           │
│       │           ├── settings/
│       │           │   ├── echarts-line-chart-settings.component.ts
│       │           │   ├── echarts-line-chart-settings.component.html
│       │           │   └── echarts-line-chart-settings.component.scss
│       │           │
│       │           ├── data-key-settings/
│       │           │   ├── echarts-line-chart-data-key-settings.component.ts
│       │           │   ├── echarts-line-chart-data-key-settings.component.html
│       │           │   └── echarts-line-chart-data-key-settings.component.scss
│       │           │
│       │           ├── settings-dialog/
│       │           │   ├── echarts-settings-dialog.component.ts
│       │           │   └── echarts-settings-dialog.component.html
│       │           │
│       │           └── debug-dialog/
│       │               ├── debug-logging-dialog.component.ts
│       │               ├── debug-logging-dialog.component.html
│       │               └── debug-logging-dialog.component.scss
│       │
│       ├── services/                                # Service layer
│       │   ├── chart-management.service.ts          # ECharts lifecycle
│       │   ├── data-processing.service.ts           # Data transformation
│       │   ├── error-handling.service.ts            # Error recovery
│       │   └── export.service.ts                    # CSV/XLS/XLSX export
│       │
│       ├── interfaces/                              # TypeScript interfaces
│       │   └── chart.interfaces.ts
│       │
│       ├── scss/                                    # Global styles
│       │   ├── lib-styles.ts
│       │   ├── style.scss
│       │   └── style.comp.scss
│       │
│       └── locale/                                  # Localization
│           └── custom-widget-locale.constant.ts
│
├── dist/                           # 📦 Build output (generated)
│   └── widget-extension/
│       ├── bundles/
│       ├── esm2022/
│       ├── fesm2022/
│       └── system/
│
└── target/                         # 🎯 Final output (generated)
    └── generated-resources/
        └── thingsboard-extension-widgets.js
```

## Key Directories Explained

### `/docs/` - Documentation Hub
All project documentation is centralized here:
- **Root level**: Active documentation (CLAUDE.md, guides, etc.)
- **`/migration/`**: Historical migration and cleanup records
- **`/todo/`**: Task lists and planning

### `/archive/` - Historical Files
Contains old files that are not part of the active codebase but are kept for reference:
- **`/backups/`**: Component backups
- **`/logs/`**: Development logs
- **`/temp/`**: Temporary files, old scripts, unrelated packages

### `/src/app/components/examples/` - Main Widget
The ECharts Line Chart widget implementation:
- Main component: 7109 lines with comprehensive features
- Settings components for configuration
- Debug dialog for troubleshooting
- Service-based refactored version (demonstration)

### `/src/app/services/` - Service Layer
Extracted services for better separation of concerns:
- **chart-management.service.ts**: ECharts initialization, configuration, grid layouts
- **data-processing.service.ts**: Data transformation and validation
- **error-handling.service.ts**: Error recovery and monitoring
- **export.service.ts**: Multi-format export (CSV/XLS/XLSX)

### `/examples/` - ThingsBoard Widget Examples
Ready-to-import widget JSON files for ThingsBoard dashboard:
- Complete widget configurations
- Import instructions
- Screenshots and documentation

## Build Output

### Development
```bash
npm start
# Output: http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
```

### Production
```bash
npm run build
# Output: target/generated-resources/thingsboard-extension-widgets.js
```

## File Organization Principles

1. **Documentation**: All `.md` files in `/docs/` (except root README.md)
2. **Source Code**: Only active, production-ready code in `/src/`
3. **Archives**: Old/backup files in `/archive/` (git-ignored)
4. **Examples**: Complete widget examples in `/examples/`
5. **Build Artifacts**: Generated files in `/dist/` and `/target/` (git-ignored)

## Ignored Directories (`.gitignore`)

```
/node_modules/
/dist/
/target/
/archive/
*.log
```

## Recent Reorganizations

### October 27, 2025 - Source Code Reorganization
**Production widget files moved from `examples/` to `widgets/`:**
- Renamed `src/app/components/examples/` → `widgets/`
- Created proper structure: `widgets/echarts-line-chart/`
- Renamed `examples.module.ts` → `widgets.module.ts`
- Changed module class: `ExamplesModule` → `WidgetsModule`
- Updated all imports in main module and public-api.ts
- **Rationale**: The "examples" folder name was misleading as it contained production code, not examples

**Files moved to archive:**
- `echarts-line-chart-refactored.component.ts` → `/archive/backups/`
- `thingsboard-example/` → `/archive/temp/`
- `multi-chart-architecture.example.ts` → `/archive/temp/`

**Module updates:**
- `thingsboard-extension-widgets.module.ts`: imports `WidgetsModule` instead of `ExamplesModule`
- `src/app/public-api.ts`: exports from `./components/widgets/` instead of `./components/examples/`
- `widgets.module.ts`: updated all import paths to reflect new structure

### January 27, 2025 - Documentation Reorganization
**Files moved to improve organization:**
- Documentation: Root → `/docs/`
- Backups: Source → `/archive/backups/`
- Logs: Root → `/archive/logs/`
- Temporary files: Root → `/archive/temp/`
- Fixed typo: `thingbaord-example` → `thingsboard-example`
- Created symlink: `CLAUDE.md` → `docs/CLAUDE.md`

## Maintenance

To keep the structure clean:
1. Add new docs to `/docs/`
2. Move completed migration docs to `/docs/migration/`
3. Archive old code in `/archive/` instead of deleting
4. Keep examples in `/examples/` with proper READMEs
5. Never commit `/dist/`, `/target/`, or `/archive/` to git
