# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies (requires Node >=18.19.1, npm >=10.0.0)
npm install

# Start development server (port 5000)
npm start

# Build for production
npm run build

# Run linter
npm run lint

# Build styles only
npm run build:scss
```

## Architecture Overview

This is a ThingsBoard Extension Widgets project that creates custom Angular components for the ThingsBoard IoT platform. The build system compiles Angular components into a SystemJS bundle that can be dynamically loaded into ThingsBoard dashboards.

### Build Pipeline
- PostCSS processes `style.scss` → `style.comp.scss`
- Angular CLI builds the library using ng-packagr
- Custom builder creates SystemJS bundle in `target/generated-resources/`
- Development server serves from `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`

### Key Project Structure
```
src/app/
├── components/examples/       # Widget implementations
├── thingsboard-extension-widgets.module.ts  # Main module
├── public-api.ts             # Public exports
└── scss/                     # Global styles (processed by PostCSS)
```

### ThingsBoard Import Conventions
Use these module prefixes for ThingsBoard dependencies:
```typescript
import { WidgetContext } from '@home/models/widget-component.models';
import { WidgetConfig } from '@shared/public-api';
import { DashboardService } from '@core/public-api';
// Available modules: @app, @core, @shared, @modules, @home
```

## Widget Development Process

1. Create component files in `src/app/components/examples/[widget-name]/`
2. Export component in `src/app/components/examples/examples.module.ts`
3. Add to module imports if using additional Angular modules
4. Test in ThingsBoard dashboard using the development server URL

### Testing in ThingsBoard
- Widget Editor: `http://localhost:8080/resources/widgets-library/widget-types/0b1f1400-63b2-11f0-ada4-17812a0522d3`
- Test Dashboard: `http://localhost:8080/dashboards/865bc570-6630-11f0-90af-17812a0522d3`
- Credentials: `tenant@thingsboard.org` / `tenant`

## Current Widget: ECharts Multi-Plot Line Chart

Located in `src/app/components/examples/echarts-line-chart/`, this widget provides:
- Multi-plot support (up to 7 plots)
- Interactive toolbar with export, zoom, statistics
- Real-time data visualization
- Alarm threshold visualization
- Extensive customization through settings

## Important Development Notes

- The project uses Angular 18 with custom patches for the build system
- ECharts is loaded from a ThingsBoard-specific fork
- All widgets must implement proper cleanup in `ngOnDestroy`
- Use `ctx.detectChanges()` to trigger change detection in widgets
- Settings components must match form control names exactly