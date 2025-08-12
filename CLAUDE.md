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
- Dynamic filenames: `label[deviceName]_YYYY-MM-DD_HH-mm-ss-SSS.<ext>`
- Example: `Temperature_Sensor[Device_01]_2025-01-08_14-30-45-123.csv`
- Fetches both `label` and `deviceName` from SERVER_SCOPE attributes
- Fallback strategies:
  - Both missing: `entityName[unknown]`
  - Only label missing: `sensor[deviceName]`
  - Only deviceName missing: `label[unknown]`
- Three export formats supported: CSV, XLS, XLSX
- Excel exports include proper metadata and formatting
- CSV exports use semicolon separator to match ThingsBoard
- **Export Decimal Places Setting**: 
  - All formats (CSV, XLS, XLSX) use `ctx.settings.exportDecimals` (default: 6)
  - Falls back to series-specific decimals, then `ctx.decimals` if not set
  - Trailing zeros are automatically removed (e.g., 22.393000 → 22.393, 5.000 → 5)

## Important Development Notes

- The project uses Angular 18 with custom patches for the build system
- ECharts is loaded from a ThingsBoard-specific fork
- All widgets must implement proper cleanup in `ngOnDestroy`
- Use `ctx.detectChanges()` to trigger change detection in widgets
- Settings components must match form control names exactly
- Debug mode controlled by `ctx.settings.debugOutput`
- Chart version tracked in `CHART_VERSION` constant

### ECharts setOption Usage
- **NEVER use merge mode**: Always call `chart.setOption(options)` without the second parameter
- Do NOT use `chart.setOption(options, true)` - merge mode must not be enabled
- To ensure rendering with large datasets, use `chart.resize()` after a timeout instead
- Example pattern for forcing redraw:
  ```javascript
  this.chart.setOption(myNewOptions);
  setTimeout(() => {
    if (this.chart && !this.chart.isDisposed()) {
      this.chart.resize();
    }
  }, 50);
  ```

## Critical ThingsBoard Integration

### Widget Bridge Communication
The Angular component MUST expose itself to ThingsBoard's widget.js bridge:

```typescript
ngAfterViewInit(): void {
  setTimeout(() => {
    this.initChart();
    this.setupResizeObserver();
    
    // CRITICAL: Expose component to ThingsBoard's widget.js bridge
    if (this.ctx.$scope) {
      this.ctx.$scope.echartsLineChartComponent = this;
      
      // Flush any pending updates from widget.js
      if (typeof this.ctx.$scope.componentReady === 'function') {
        this.ctx.$scope.componentReady();
      }
    }
  }, 100);
}
```

### Data Update Guards
ALWAYS check for real data before updating the chart:

```typescript
public onDataUpdated(): void {
  // Check if we have real data with actual points
  const totalDataPoints = this.ctx.data.reduce((sum, series) => 
    sum + (series.data?.length || 0), 0);
  
  if (totalDataPoints === 0) {
    // Keep showing loading spinner
    this.chart.showLoading({ text: 'Waiting for data...' });
    return;
  }
  
  // Process data update...
}
```

### State Change Detection
Subscribe to dashboard state changes to handle navigation:

```typescript
private subscribeToStateChanges(): void {
  if (this.ctx.stateController) {
    this.stateChangeSubscription = this.ctx.stateController
      .stateChanged()
      .subscribe(() => this.handleStateChange());
  }
  
  // Fallback: Poll for state changes
  const stateCheckInterval = setInterval(() => {
    const newStateId = this.ctx.stateController?.getStateId();
    if (newStateId !== lastStateId) {
      this.handleStateChange();
    }
  }, 1000);
}
```

## Testing Checklist
When making changes, verify:
1. ✅ Chart renders immediately without legend interaction
2. ✅ Data persists across dashboard state changes
3. ✅ Empty data doesn't block subsequent updates
4. ✅ DataZoom is visible and not cut off at bottom
5. ✅ Chart height fits within widget bounds
6. ✅ Data points are clearly visible (2.5x base size)
7. ✅ Font sizes scale correctly with container size
8. ✅ Multiple grids display correctly without overlap
9. ✅ Export functions work with dynamic filenames
10. ✅ Legend selection/deselection works properly
11. ✅ Resize behavior maintains proportions
12. ✅ Loading spinner shows when waiting for data