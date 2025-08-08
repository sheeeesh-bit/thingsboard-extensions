# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build and Development Commands

```bash
# Install dependencies (requires Node >=18.19.1, npm >=10.0.0)
npm install

# Start development server (port 5000)
npm start
# Widget will be available at: http://localhost:5000/static/widgets/thingsboard-extension-widgets.js

# Build for production
npm run build
# Built file will be at: target/generated-resources/thingsboard-extension-widgets.js

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
│   ├── echarts-line-chart.component.ts     # Main chart component
│   ├── echarts-line-chart.component.html   # Chart template
│   ├── echarts-line-chart.component.scss   # Chart styles
│   ├── settings/                           # Settings components
│   │   └── echarts-line-chart-settings.component.ts
│   └── thingbaord-example/                 # Original reference implementation
│       └── main.js                         # Original widget code
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

## Current Widget: ECharts Multi-Plot Line Chart

### Critical Implementation Details

#### Height Management
- **Container Height**: The widget receives `ctx.height` from ThingsBoard
- **Button Bar**: Takes approximately 50px (20px margin-bottom + ~30px button height)
- **Chart Height Calculation**: `availableHeight = ctx.height - 50px`
- **Important**: Apply height only to `#echartContainer`, NOT to the outer container
- **CSS**: Keep overflow settings minimal to prevent double scrollbars

#### Grid Configuration (Must Match Original Exactly)
The grid configuration determines subplot positioning and must include proper bottom margins:

```javascript
// Single Grid - bottom: "2%" prevents datazoom cutoff
"singleGrid": {
  "small": [{ top: "8%", height: "70%", bottom: "2%" }],
  "large": [{ top: "5%", height: "75%", bottom: "2%" }],
  "huge": [{ top: "5%", height: "75%", bottom: "2%" }]
}

// Double Grid - last grid needs bottom: "2%"
"doubleGrid": {
  "small": [
    { top: "8%", height: "30%" },
    { top: "50%", height: "30%", bottom: "2%" }
  ],
  // ... similar for large and huge
}

// Triple Grid - last grid needs bottom margin
"tripleGrid": {
  "small": [
    { top: "5%", height: "20%" },
    { top: "36%", height: "20%" },
    { top: "68%", height: "20%" }
  ],
  "large": [
    // ... first two grids ...
    { top: "68%", height: "20%", bottom: "2%" }
  ],
  "huge": [
    // ... first two grids ...
    { top: "65%", height: "20%", bottom: "10%" }
  ]
}
```

#### DataZoom Configuration
- **Position**: Always at `top: '92%'` (as in original)
- **No dynamic positioning**: Don't adjust based on grid count
- **Grid bottom margins**: Handle spacing via grid `bottom` property

#### Scaling Configuration
Container size thresholds:
- **Small**: height < 1000px
- **Large**: 1000px <= height < 1200px
- **Huge**: height >= 1200px

Font and element sizes by container:
```javascript
// Small Container
Legend: 14px, Items: 40x12px, Gap: 20px
Axis Labels: 14px
Line Width: 4px (3px for middle)
Symbol Size: base * 2.5

// Large Container
Legend: 20px, Items: 60x15px, Gap: 20px
Axis Labels: 16px
Line Width: 5px (4px for middle)
Symbol Size: base * 2.5

// Huge Container
Legend: 24px, Items: 70x20px, Gap: 30px
Axis Labels: 18px
Line Width: 5px (4px for middle)
Symbol Size: base * 2.5
```

#### Data Point Sizing
- Base size from settings: `ctx.settings.symbolSize_data` (default: 5)
- **Multiplier: 2.5x** to match original appearance
- Applied formula: `(ctx.settings.symbolSize_data || 5) * 2.5`

#### Common Linting Fixes
When working with this codebase, these linting issues commonly appear:
1. **Unused imports**: Remove `EChartsOption`, `formatValue`, `isDefinedAndNotNull` if not used
2. **Set generic type**: Use `new Set<string>()` instead of `new Set()`
3. **Regex escaping**: Use `/[/\\?*[\]]/g` instead of `/[\/\\\?\*\[\]]/g`
4. **hasOwnProperty**: Use `Object.prototype.hasOwnProperty.call(obj, prop)`
5. **Unused variables in catch**: Use `catch {` instead of `catch(error) {`

#### Export Functionality
- CSV export filename: "Hello_Thomas.csv"
- Excel exports include proper metadata and formatting
- Three export formats supported: CSV, XLS, XLSX

## Important Development Notes

- The project uses Angular 18 with custom patches for the build system
- ECharts is loaded from a ThingsBoard-specific fork
- All widgets must implement proper cleanup in `ngOnDestroy`
- Use `ctx.detectChanges()` to trigger change detection in widgets
- Settings components must match form control names exactly
- Debug mode controlled by `ctx.settings.debugOutput`
- Chart version tracked in `CHART_VERSION` constant

## Testing Checklist
When making changes, verify:
1. ✅ DataZoom is visible and not cut off at bottom
2. ✅ Chart height fits within widget bounds
3. ✅ Data points are clearly visible (2.5x base size)
4. ✅ Font sizes scale correctly with container size
5. ✅ Multiple grids display correctly without overlap
6. ✅ Export functions work (CSV, XLS, XLSX)
7. ✅ Legend selection/deselection works properly
8. ✅ Resize behavior maintains proportions