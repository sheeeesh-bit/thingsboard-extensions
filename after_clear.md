# ECharts ThingsBoard Widget - Implementation Summary

## Project Overview
This is a ThingsBoard Extension Widget that implements an ECharts multi-plot line chart with sophisticated features including dynamic subplot management, responsive scaling, and comprehensive data export capabilities.

## Critical Fixes Applied

### 1. ThingsBoard Bridge Integration (MOST CRITICAL)
**Problem**: ThingsBoard's widget.js was calling `onDataUpdated()` before the Angular component was ready, causing data to be lost.

**Solution**:
```typescript
// In ngAfterViewInit()
this.ctx.$scope.echartsLineChartComponent = this;
if (typeof this.ctx.$scope.componentReady === 'function') {
  this.ctx.$scope.componentReady();
}
```

### 2. Empty Data Guards
**Problem**: Chart was initializing with empty data arrays, blocking subsequent updates.

**Solution**:
- Check for actual data points before updating chart
- Show "Waiting for data..." spinner when series exist but have no points
- Only process updates when `totalDataPoints > 0`

### 3. State Change Detection
**Problem**: Chart data disappeared when switching between dashboard states.

**Solution**:
- Subscribe to `stateController.stateChanged()`
- Fallback polling mechanism if subscription fails
- Automatic chart refresh on state changes

### 4. Dynamic Legend Font Sizing
**Problem**: Legend font sizes stayed at initial size after resize.

**Solution**:
- Include legend configuration in `onDataUpdated()`
- Update with current `currentConfig` settings on every resize

### 5. Dynamic Export Filenames
**Feature**: All exports now use `<sensor-label>_YYYY-MM-DDThh-mm-ss-SSSZ.<ext>` format.

**Implementation**:
- Fetches sensor label from SERVER_SCOPE attributes
- Falls back to entity name if label unavailable
- Applies to PNG, CSV, XLS, and XLSX exports

## Key Technical Details

### Component Lifecycle
1. `ngOnInit()`: Setup grid configuration, subscribe to state changes
2. `ngAfterViewInit()`: Initialize chart, expose to ThingsBoard bridge
3. `onDataUpdated()`: Called by ThingsBoard when data changes
4. `onResize()`: Handle container size changes
5. `ngOnDestroy()`: Clean up subscriptions and chart instance

### Grid Management
- Supports 1-3 subplots based on axis assignments
- Dynamic grid configuration based on container height
- Three size modes: Small (<1000px), Large (1000-1200px), Huge (>1200px)

### Data Flow
1. ThingsBoard provides data through `ctx.data`
2. Component checks for real data points
3. Series are built with proper axis assignments
4. Chart updates with legend, axes, and grid configuration
5. Loading spinner shows when waiting for data

### Export System
- **CSV**: Semicolon-separated for ThingsBoard compatibility
- **XLS**: HTML table with Excel markup
- **XLSX**: Modern Excel with full metadata
- **PNG**: High-resolution chart image (7x pixel ratio)

## Common Issues and Solutions

### Issue: Chart doesn't render on first load
**Solution**: Ensure component is exposed to ThingsBoard bridge and `componentReady()` is called.

### Issue: Data disappears after state change
**Solution**: Subscribe to state changes and refresh chart when state changes.

### Issue: Legend font sizes don't update
**Solution**: Include legend configuration in every `onDataUpdated()` call.

### Issue: Empty data blocks future updates
**Solution**: Guard against empty data arrays and only process when data points exist.

## Development Guidelines

### Never Do This:
- Don't use merge mode in `setOption()`
- Don't call `onDataUpdated()` immediately in `initChart()`
- Don't forget to clean up subscriptions in `ngOnDestroy()`
- Don't process updates with zero data points

### Always Do This:
- Expose component to ThingsBoard's `$scope`
- Check for real data before updating
- Handle state changes properly
- Clean up all resources on destroy
- Use dynamic filenames for exports

## Testing Requirements
Before deploying, verify:
1. Chart renders without legend interaction
2. Data persists across state changes
3. Empty data doesn't block updates
4. All export formats work correctly
5. Legend resizing works properly
6. Loading states display correctly

## File Structure
```
src/app/components/examples/
├── echarts-line-chart.component.ts     # Main component (1900+ lines)
├── echarts-line-chart.component.html   # Template with buttons
├── echarts-line-chart.component.scss   # Styles
├── settings/                           # Settings components
└── thingbaord-example/                # Original reference
    └── main.js                        # Original widget code
```

## Version History
- Chart Version: 1.2
- Angular: 18
- ECharts: ThingsBoard fork
- Node: >=18.19.1
- npm: >=10.0.0

## Key Commits
- `fix: ensure ECharts always redraws after data update`
- `fix: expose component to ThingsBoard widget.js bridge for data sync`
- `feat: implement dynamic filename with sensor label and timestamp`
- `fix: Resolve chart initialization and state change detection issues`

## Important Constants
- Button bar height: 50px
- Resize timeout: 50ms (standard), 10ms (large data)
- State polling interval: 1000ms
- Symbol size multiplier: 2.5x
- PNG export pixel ratio: 7x

## Debug Mode
Controlled by `ctx.settings.debugOutput`. When enabled, logs detailed information about:
- Chart initialization
- Data updates
- State changes
- Export operations
- Resize events

## Future Considerations
- Consider implementing progressive rendering for datasets >2000 points
- Add support for real-time data streaming
- Implement custom tooltip templates
- Add support for annotations and markers
- Consider WebGL renderer for very large datasets