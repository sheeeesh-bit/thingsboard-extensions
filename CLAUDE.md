# CLAUDE.md

1. First think through the problem, read the codebase for relevant files, and write a plan to tasks/todo.md.
2. The plan should have a list of todo items that you can check off as you complete them
3. Before you begin working, check in with me and I will verify the plan.
4. Then, begin working on the todo items, marking them as complete as you go.
5. Please every step of the way just give me a high level explanation of what changes you made
6. Make every task and code change you do as simple as possible. We want to avoid making any massive or complex changes. Every change should impact as little code as possible. Everything is about simplicity.
7. Finally, add a review section to the [todo.md](http://todo.md/) file with a summary of the changes you made and any other relevant information.


## Project Overview

This is a ThingsBoard Extension Widgets project that provides a framework for developing custom widgets that integrate with the ThingsBoard IoT platform. The project uses Angular 18 with a custom build system to create widgets that can be loaded dynamically into ThingsBoard dashboards.

## Widget Access Information
- **Widget Editor URL**: `http://localhost:8080/resources/widgets-library/widget-types/0b1f1400-63b2-11f0-ada4-17812a0522d3`
- **Login Credentials**: `tenant@thingsboard.org` / `tenant`
- **Development Server**: `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`
- **testing dashboard**: http://localhost:8080/dashboards/865bc570-6630-11f0-90af-17812a0522d3

## Key Commands

### Development
```bash
npm install              # Install dependencies
npm start               # Start development server on port 5000
npm run lint            # Run ESLint with Angular/TypeScript/Tailwind rules
```

### Building
```bash
npm run build           # Full production build (builds SCSS, Angular lib, and moves to target/)
```

### Development Server URL
When running `npm start`, widgets are served at:
```
http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
```

## Architecture Overview

### Build Pipeline
1. **PostCSS Processing**: `style.scss` → `style.comp.scss` (extracts ThingsBoard CSS classes for Tailwind)
2. **Angular Library Build**: Uses ng-packagr to build the widget library
3. **Custom Builder**: `@tb/custom-builder:static-serve` serves widgets during development
4. **Install Script**: `install.js` moves built files from `dist/` to `target/generated-resources/`

### Module Structure
- **Main Module**: `src/app/thingsboard-extension-widgets.module.ts`
- **Examples Module**: `src/app/components/examples/examples.module.ts` - exports all example widgets
- **Public API**: Components must be exported through `public-api.ts` files

### ThingsBoard Integration
The project uses path mappings in `tsconfig.json` to import ThingsBoard dependencies:
```typescript
import { WidgetConfig } from '@shared/public-api';
import { DashboardService } from '@core/public-api';
```

Available module prefixes: `@app`, `@core`, `@shared`, `@modules`, `@home`

### Widget Development Pattern
Each widget consists of:
1. Angular component files (`.ts`, `.html`, `.scss`)
2. Optional settings/configuration components
3. Export in `examples.module.ts`
4. JSON configuration file for ThingsBoard widget library
5. README with usage instructions

### Special Configurations
- **Patches**: Applied via patch-package to disable Angular debug info
- **Tailwind Integration**: Custom PostCSS plugin blocks ThingsBoard's existing CSS classes
- **SystemJS Format**: Widgets are built in SystemJS format for dynamic loading
- **Source Maps**: Automatically generated and served for debugging

## Important Notes

1. When creating new widgets, always export them through the `examples.module.ts`
2. The build process requires the custom builder to compile first (`builders/` directory)
3. Development mode requires checking "Is module" when adding widget resources in ThingsBoard
4. Production widgets are located in `target/generated-resources/` after build
5. The project uses npm (migrated from yarn) - use npm commands exclusively

## Testing Guidelines

- **Playwright Testing**:
  - Don't do screenshots, take the HTML element or context instead of screenshot when using Playwright
  - For Testing a Widget go to the Dashboard and Test it

## Widget Settings Navigation

### Accessing Widget Settings in Dashboard Edit Mode
1. Navigate to a dashboard containing the widget: `http://localhost:8080/dashboards/865bc570-6630-11f0-90af-17812a0522d3`
2. Click "Edit mode" button in the top toolbar
3. Hover over the widget to reveal action buttons
4. Click the edit button (appears as `<tb-icon>edit</tb-icon>` in a button)
5. Widget settings dialog opens with tabs: Data, Appearance, Widget card, Actions, Layout

### Widget Settings Structure
The Multi-Plot-Chart widget has the following settings categories in the Appearance tab:
- **Basic Settings**: Chart title configuration
- **Visual Settings**: Smooth lines toggle
- **Multi-Plot Configuration**: 
  - Number of Plots dropdown (Single Plot, 2 Plots, 3 Plots, etc.)
  - Enable Zoom option

### Important Findings
1. The widget component supports multi-plot functionality but the Settings schema in the widget editor only exposes basic settings
2. The actual multi-plot configuration is available in the widget instance settings when added to a dashboard
3. The Data key settings schema is empty, which prevents proper plot assignment configuration