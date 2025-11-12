# ECharts Line Chart Component - Code Flow Documentation

## Table of Contents
1. [Overview](#overview)
2. [Component Architecture](#component-architecture)
3. [Lifecycle Flow](#lifecycle-flow)
4. [Key Data Structures](#key-data-structures)
5. [Main Data Flow](#main-data-flow)
6. [Feature Flows](#feature-flows)
7. [Performance Optimizations](#performance-optimizations)
8. [State Management](#state-management)

---

## Overview

The ECharts Line Chart Component (`echarts-line-chart.component.ts`) is a sophisticated, production-grade Angular component spanning **7,109 lines** of code. It provides a multi-grid, multi-device time-series visualization widget for the ThingsBoard IoT platform.

### Key Features
- ✅ Multi-grid system (up to 7 subplots)
- ✅ Multi-device support (color-coded entity visualization)
- ✅ Custom legend with pagination
- ✅ Entity sidebar (3 display modes: full/compact/colors)
- ✅ Export functionality (CSV/XLS/XLSX)
- ✅ Device type-based measurement filtering
- ✅ Min/max reference lines
- ✅ Alarm overlay visualization
- ✅ Responsive scaling (small/large/huge containers)
- ✅ Performance optimizations for large datasets

**File Location**: `src/app/components/widgets/echarts-line-chart/echarts-line-chart.component.ts`

---

## Component Architecture

### Component Decorator
```typescript
@Component({
  selector: 'tb-echarts-line-chart',
  templateUrl: './echarts-line-chart.component.html',
  styleUrls: ['./echarts-line-chart.component.scss']
})
export class EchartsLineChartComponent implements OnInit, AfterViewInit, OnDestroy
```

### Core Dependencies
- **ECharts**: Chart rendering engine
- **ThingsBoard**: WidgetContext for data and platform integration
- **RxJS**: Reactive data handling
- **Angular Material**: Dialogs for settings
- **XLSX/JSZip**: Data export functionality

### ViewChildren
```typescript
@ViewChild('chartContainer', {static: false}) chartContainer: ElementRef<HTMLElement>;
@ViewChild('legendOverlay', { static: false }) legendOverlay: ElementRef<HTMLDivElement>;
@ViewChild('zoomOverlay', { static: false }) zoomOverlay: ElementRef<HTMLDivElement>;
@ViewChild('legendViewport', { static: false }) legendViewport: ElementRef;
@ViewChild('legendTrack', { static: false }) legendTrack: ElementRef;
```

### Input
```typescript
@Input() ctx: WidgetContext;  // ThingsBoard widget context containing data and settings
```

---

## Lifecycle Flow

### 1. Component Initialization: `ngOnInit()`

**Line**: 583

**Purpose**: Initialize component settings and state before view rendering.

**Flow**:
```
ngOnInit()
├── Initialize sidebar settings
│   ├── sidebarDisplayMode (full/compact/colors)
│   └── sidebarCollapsedMode (hidden/colors)
│
├── Initialize default visibility settings
│   ├── defaultPlotsVisible (all plots visible by default)
│   └── defaultDevicesVisible (mode-dependent)
│       ├── Single device mode → always visible
│       └── Multiple devices mode → respect setting (default hidden)
│
├── Initialize color scheme
│   └── currentColorScheme = ctx.settings.colorScheme || 'default'
│
├── Initialize min/max reference lines
│   ├── minMaxVisible
│   ├── minMaxStyle (dashed/solid/dotted)
│   ├── minMaxColor
│   └── minMaxLineWidth
│
├── Initialize alarm settings
│   ├── alarmStatusVisible
│   ├── alarmLinesVisible
│   ├── alarmLineStyle
│   └── alarmDebugLogs
│
├── Reset color mappings
│   ├── entityColorMap = {}
│   └── labelColorMap = {}
│
├── Initialize debug flags
│   ├── DEBUG = ctx.settings.debugOutput
│   └── PERF_DEBUG = ctx.settings.performanceDebug
│
├── Log debug info (if DEBUG enabled)
│   └── logCtxDebugInfo()
│
├── Apply maximum performance settings
│   └── applyMaximumPerformanceSettings()
│
├── Setup menu buttons
│   ├── 'genImage' → downloadChartImage()
│   └── 'reset' → resetChartCompletely()
│
├── Override CSV export functionality
│   └── overrideCsvExport()
│
├── Count grids by settings
│   ├── setGrids = countGridsBySettings()
│   ├── currentGridNames = Array.from(setGrids)
│   └── maxGrids = setGrids.size
│
└── Subscribe to ThingsBoard state changes
    └── subscribeToStateChanges()
```

**Key Actions**:
- Reads widget settings from `ctx.settings`
- Initializes state flags and mappings
- Sets up ThingsBoard integration hooks
- Configures performance optimizations

---

### 2. View Initialization: `ngAfterViewInit()`

**Line**: 680

**Purpose**: Initialize chart after DOM is ready.

**Flow**:
```
ngAfterViewInit()
├── Check lazy loading setting
│   └── useLazyLoading = ctx.settings.useLazyLoading !== false
│
├── Branch: Lazy Loading?
│   ├── YES → initializeLazyLoading()
│   │   ├── Create IntersectionObserver
│   │   ├── Observe chartContainer element
│   │   ├── Wait for chart to become visible
│   │   └── When visible → initializeImmediate()
│   │
│   └── NO → initializeImmediate()
│       ├── Sync legend to grid margins
│       ├── setTimeout(100ms)
│       ├── initChart()
│       │   └── [See Chart Initialization Flow]
│       ├── setupResizeObserver()
│       ├── updateZoomOverlay()
│       └── Expose component to ThingsBoard bridge
│           ├── ctx.$scope.echartsLineChartComponent = this
│           └── ctx.$scope.componentReady()
│
└── Setup fullscreen listener
    └── setupFullscreenListener()
```

**Key Actions**:
- Waits for DOM to be ready
- Optionally uses lazy loading (Intersection Observer)
- Initializes ECharts instance
- Exposes component to ThingsBoard's widget.js bridge
- Sets up resize handling

**Critical ThingsBoard Integration**:
```typescript
// CRITICAL: Expose component to ThingsBoard's widget.js bridge
if (this.ctx.$scope) {
  this.ctx.$scope.echartsLineChartComponent = this;

  // Flush any pending updates from widget.js
  if (typeof this.ctx.$scope.componentReady === 'function') {
    this.ctx.$scope.componentReady();
  }
}
```

---

### 3. Component Cleanup: `ngOnDestroy()`

**Line**: 872

**Purpose**: Clean up resources and subscriptions.

**Flow**:
```
ngOnDestroy()
├── Clean up ThingsBoard scope reference
│   └── delete ctx.$scope.echartsLineChartComponent
│
├── Clean up alarm monitoring
│   └── clearInterval(alarmUpdateTimer)
│
├── Clean up alarm attribute subscription
│   └── alarmAttributeSubscription?.unsubscribe()
│
├── Dispose ECharts instance
│   ├── chart.off('mousemove')
│   ├── chart.off('mouseout')
│   └── chart.dispose()
│
├── Disconnect ResizeObserver
│   └── resizeObserver?.disconnect()
│
├── Unsubscribe from state changes
│   └── stateChangeSubscription?.unsubscribe()
│
├── Clear timeouts
│   ├── resizeDebounceTimer
│   ├── clickDebounceTimeout
│   ├── uiUpdateBatch
│   ├── chartActionBatch
│   ├── rafId (requestAnimationFrame)
│   └── paginationCalculationTimer
│
└── Remove fullscreen event listeners
    └── Remove all fullscreen change handlers
```

**Key Actions**:
- Prevents memory leaks
- Properly disposes ECharts instance
- Cleans up all event listeners and subscriptions

---

## Key Data Structures

### 1. Entity List (Device Sidebar)
```typescript
public entityList: Array<{
  name: string;           // Original entity name (for functionality)
  displayName: string;    // Display name (deviceName attribute or fallback)
  label: string;          // Label attribute for tooltip
  deviceName: string;     // DeviceName attribute for tooltip
  color: string;          // Entity color
  count: number;          // Number of series for this entity
  dataPoints: number;     // Total data points
  visible: boolean;       // Visibility state
}> = [];
```

**Purpose**: Tracks all devices/entities with their metadata and visibility state.

**Usage**:
- Displayed in the entity sidebar
- Controls device-level visibility
- Used for color assignment in multi-device mode

---

### 2. Legend Items (Plot Labels)
```typescript
public legendItems: Array<{
  label: string;          // Measurement label (e.g., "Temperature")
  color: string;          // Series color
  selected: boolean;      // Visibility state
  plotNumber: number;     // Grid index (0-6)
}> = [];
```

**Purpose**: Tracks all measurement labels (plots) with their visibility.

**Usage**:
- Displayed in custom legend overlay with pagination
- Controls plot-level visibility
- Independent of device visibility

---

### 3. State Maps

```typescript
// Plot (label) visibility - persists across device toggles
private plotLabelStates = new Map<string, boolean>();
// Example: "Temperature" → true

// Device (entity) visibility - independent of plot states
private deviceVisibilityStates = new Map<string, boolean>();
// Example: "Device_01" → false

// Device type filtering
private deviceTypeMap = new Map<string, string>();
// Example: "Device_01" → "S200 3D"

// Device forbidden measurements
private deviceForbiddenMeasurements = new Map<string, string[]>();
// Example: "Device_01" → ["alpha", "beta", "gamma"]
```

**Purpose**: Maintains component state across interactions.

**Key Behavior**:
- Plot states persist when devices are toggled
- Device states persist when plots are toggled
- Device types determine which measurements can be shown

---

### 4. Color Mappings

```typescript
// Entity-based colors (multiple devices mode)
private entityColorMap: Record<string, string> = {};
// Example: { "Device_01": "#007aff", "Device_02": "#ff9500" }

// Label-based colors (single device mode)
private labelColorMap: Record<string, string> = {};
// Example: { "Temperature": "#007aff", "Pressure": "#ff9500" }
```

**Purpose**: Consistent color assignment across renders.

**Mode Behavior**:
- **Single device mode**: Colors assigned by label (measurement)
- **Multiple devices mode**: Colors assigned by entity (device)

---

## Main Data Flow

### The Core: `onDataUpdated()` Method

**Line**: 954

**Purpose**: Called by ThingsBoard whenever new data arrives. This is the **heart of the component**.

**Trigger Points**:
- Initial data load from ThingsBoard
- Real-time data updates
- Time window changes
- Dashboard state changes
- Manual refresh

**Complete Flow**:

```
onDataUpdated()
├── [1] Device Type Filtering (if enabled)
│   ├── Check if deviceTypeFiltering enabled
│   ├── If not fetched yet → await fetchDeviceTypesAndFilter()
│   │   ├── For each entity
│   │   ├── Fetch "deviceName" attribute from SERVER_SCOPE
│   │   ├── Parse device type (e.g., "S-200" → "S200 3D")
│   │   └── Store forbidden measurements
│   └── isDeviceTypesFetched = true
│
├── [2] Performance Tracking
│   ├── Count total data points
│   ├── totalDataPoints = sum of all series data lengths
│   ├── Log performance warnings if > 10k or 50k points
│   └── Log series count warnings if > 50 or 100 series
│
├── [3] Data Change Detection
│   ├── Compare current data lengths with lastDataLengths
│   ├── If data changed → clear legendOverridesGrids flag
│   └── Update lastDataLengths
│
├── [4] Empty Data Handling
│   ├── Check if totalDataPoints === 0
│   ├── If empty AND initial load
│   │   ├── Show loading spinner: "Waiting for data..."
│   │   └── Set timeout(5s) to show "no data" message
│   ├── If empty AND not initial load
│   │   ├── Hide loading spinner
│   │   ├── Set hasNoVisibleData = true
│   │   └── Trigger change detection
│   └── If has data
│       ├── hasReceivedData = true
│       └── hasNoVisibleData = false
│
├── [5] Chart Initialization Check
│   └── If chart not initialized → return (wait for initChart)
│
├── [6] Grid Configuration
│   ├── Check container size → isContainerHeight()
│   │   └── Returns 'small' (<1000px), 'large' (1000-1200px), 'huge' (>=1200px)
│   │
│   ├── If NOT legendOverridesGrids
│   │   ├── Count grids from data → countGridsBySettings()
│   │   │   ├── Examine all series axisAssignment
│   │   │   └── Return Set of unique grid names
│   │   ├── Update currentGridNames
│   │   ├── Update maxGrids and currentGrids
│   │   └── If grid count changed → resetGrid = true
│   └── Else → keep existing grid configuration
│
├── [7] Build Chart Options
│   ├── Create myNewOptions object
│   ├── Set animation settings (based on data size)
│   │   ├── < 5000 points → animation enabled
│   │   └── >= 5000 points → animation disabled
│   ├── Set global emphasis settings (prevent glossy effects)
│   └── Initialize empty series array
│
├── [8] Process Series Data
│   ├── For each series in ctx.data
│   │   ├── Get axisAssignment (default 'Top')
│   │   ├── Get gridIndex from dynamicAxisMap
│   │   ├── Get entity name and label
│   │   ├── Check if measurement allowed (device type filtering)
│   │   │   └── Skip if forbidden (e.g., "alpha" for 3D devices)
│   │   ├── Get color for series
│   │   │   ├── Single device mode → color by label
│   │   │   └── Multiple devices mode → color by entity
│   │   ├── Get per-series settings (showLine, showPoints, pointSize)
│   │   ├── Check legend selection state
│   │   ├── Build series element
│   │   │   ├── Set itemStyle (colors, opacity)
│   │   │   ├── Set lineStyle (width, opacity)
│   │   │   ├── Disable emphasis/blur (prevent glossy)
│   │   │   ├── Set symbol settings (points)
│   │   │   ├── Apply LTTB sampling if > 1000 points
│   │   │   ├── Set xAxisIndex and yAxisIndex
│   │   │   └── Add data points
│   │   └── Push to myNewOptions.series
│   │
│   └── If no data → add empty placeholder series
│
├── [9] Build Grid Configuration
│   ├── Call getGridConfig(currentSize, currentGrids)
│   │   ├── Returns grid layout based on size and count
│   │   ├── Examples:
│   │   │   ├── Small, 1 grid: { top: "8%", height: "70%", bottom: "2%" }
│   │   │   ├── Large, 3 grids: [grid0, grid1, grid2] with spacing
│   │   │   └── Huge, 7 grids: [grid0-6] with optimized spacing
│   │   └── Each grid has: top, height, bottom, left, right
│   └── Assign to myNewOptions.grid
│
├── [10] Build Axes
│   ├── Build X-axes (time axes)
│   │   ├── One per grid
│   │   ├── UTC timestamps
│   │   ├── Time formatter based on zoom level
│   │   └── gridIndex assignment
│   │
│   └── Build Y-axes (value axes)
│       ├── One per grid
│       ├── Dynamic min/max or fixed range
│       ├── Number formatter based on decimals
│       └── gridIndex assignment
│
├── [11] Add Min/Max Reference Lines (if enabled)
│   ├── If minMaxVisible === true
│   ├── For each grid
│   │   ├── Calculate min and max from visible series
│   │   ├── Create markLine for axis
│   │   ├── Add to first series in grid
│   │   └── Style: dashed/solid/dotted with custom colors
│   └── Cache results in minMaxCache
│
├── [12] Add Alarm Overlays (if enabled)
│   ├── If alarmStatusVisible === true
│   ├── Fetch alarm data from entity attributes
│   ├── For each series with alarm thresholds
│   │   ├── Create markArea for critical/warning ranges
│   │   ├── Color: red (critical), orange (warning)
│   │   └── Opacity: configurable (default 0.12)
│   └── If alarmLinesVisible → add alarm threshold lines
│
├── [13] Build Tooltip
│   ├── Create custom formatter
│   ├── Filter by hovered grid (if hoveredGridIndex set)
│   ├── Format:
│   │   ├── Timestamp (formatted based on zoom)
│   │   ├── For each series:
│   │   │   ├── Color indicator
│   │   │   ├── Entity name (if multiple devices mode)
│   │   │   ├── Label
│   │   │   ├── Value (with units and decimals)
│   │   │   └── Only show if in hovered grid
│   │   └── Sort by value or grid order
│   └── Configure trigger: 'axis' (crosshair)
│
├── [14] Build DataZoom
│   ├── Position: top: '92%' (fixed)
│   ├── Type: 'slider'
│   ├── xAxisIndex: [0, 1, 2, ...] (all x-axes)
│   ├── Start/End from zoomStart/zoomEnd (0-100%)
│   └── Update zoom overlay on change
│
├── [15] Apply Options to Chart
│   ├── CRITICAL: Never use merge mode!
│   ├── chart.setOption(myNewOptions)  // No second parameter
│   ├── If large dataset → setTimeout → chart.resize()
│   └── Hide loading spinner
│
├── [16] Update UI Components
│   ├── Update legend items
│   │   ├── Extract unique labels from series
│   │   ├── Sort by grid order
│   │   ├── Assign colors
│   │   ├── Set selected states from plotLabelStates
│   │   └── Calculate pagination
│   │
│   ├── Update entity list (device sidebar)
│   │   ├── Extract unique entities
│   │   ├── Count series per entity
│   │   ├── Count data points per entity
│   │   ├── Set display names (fetch deviceName attribute)
│   │   ├── Assign colors
│   │   ├── Set visible states from deviceVisibilityStates
│   │   └── Calculate sidebar width
│   │
│   ├── Update zoom overlay
│   │   └── Sync external zoom slider with DataZoom
│   │
│   └── Trigger change detection
│       └── ctx.detectChanges()
│
└── [17] Post-Render Actions
    ├── If resetGrid flag → force chart resize
    ├── Flush pending chart actions (batch operations)
    ├── Update scroll position (if transitioning modes)
    └── Log performance metrics (if PERF_DEBUG)
```

---

## Feature Flows

### 1. Legend Interaction Flow

**User clicks legend item to toggle visibility**

```
legendItemClick(label: string)
├── Find legend item by label
├── Toggle selected state
├── Update plotLabelStates Map
│   └── plotLabelStates.set(label, newState)
│
├── Check: Is this the last visible series?
│   ├── YES → Revert change, show warning
│   └── NO → Continue
│
├── For each series with matching label
│   ├── Build series key (entity + label)
│   ├── Batch chart action
│   │   ├── type: 'legendToggleSelect'
│   │   ├── name: seriesKey
│   │   └── Push to pendingChartActions
│   └── Update series opacity in chart
│       ├── Selected: opacity 1.0
│       └── Unselected: opacity 0.08
│
├── Schedule batch execution
│   └── setTimeout(30ms) → flushChartActionBatch()
│       ├── Temporarily disable animations
│       ├── Execute all pending actions
│       ├── chart.dispatchAction(action)
│       ├── Restore animations
│       └── Apply glossy fix (if first device activation)
│
└── Trigger change detection
    └── ctx.detectChanges()
```

**Key Points**:
- Actions are batched for performance
- Last visible series cannot be hidden
- Opacity changes provide visual feedback
- Glossy fix prevents 3D visual effects on first activation

---

### 2. Device Toggle Flow

**User clicks device in sidebar to show/hide**

```
toggleEntityVisibility(entityName: string)
├── Update UI optimistically
│   ├── Find entity in entityList
│   ├── Toggle visible flag
│   └── ctx.detectChanges() (immediate feedback)
│
├── Perform actual toggle
│   └── performEntityToggle(entityName)
│       ├── Get current visible state
│       ├── Toggle deviceVisibilityStates Map
│       │   └── deviceVisibilityStates.set(entityName, newState)
│       │
│       ├── For each series with matching entity
│       │   ├── Get label from series
│       │   ├── Check if label (plot) is visible
│       │   │   └── plotVisible = plotLabelStates.get(label)
│       │   │
│       │   ├── Determine final visibility
│       │   │   └── visible = deviceVisible AND plotVisible
│       │   │
│       │   ├── Build series key
│       │   └── Batch chart action
│       │       ├── If visible → 'legendSelect'
│       │       └── If hidden → 'legendUnSelect'
│       │
│       └── Flush chart action batch
│           └── [See Legend Interaction Flow]
│
└── Update entity list
    └── refreshEntityList()
        ├── Recalculate visible counts
        └── ctx.detectChanges()
```

**Key Points**:
- Device visibility is independent of plot visibility
- Final series visibility = device visible AND plot visible
- Plot states persist across device toggles
- Optimistic UI updates for responsiveness

---

### 3. Export Flow

**User clicks export button and selects format**

```
exportSingleFile(format: 'csv' | 'xls' | 'xlsx')
├── Set loading state
│   ├── isExporting = true
│   └── ctx.detectChanges()
│
├── Build export filename
│   └── makeFilename(format).subscribe()
│       ├── Fetch entity attributes
│       │   ├── label (from SERVER_SCOPE)
│       │   └── deviceName (from SERVER_SCOPE)
│       │
│       ├── Build filename
│       │   └── Format: "label[deviceName]_YYYY-MM-DD_HH-mm-ss-SSS.ext"
│       │   └── Example: "Temperature_Sensor[Device_01]_2025-01-08_14-30-45-123.csv"
│       │
│       └── Fallback strategies:
│           ├── Both missing → "entityName[unknown]"
│           ├── Label missing → "sensor[deviceName]"
│           └── DeviceName missing → "label[unknown]"
│
├── Collect export data
│   ├── For each visible series
│   │   ├── Get entity name, label, units
│   │   ├── Get data points with timestamps
│   │   ├── Apply decimal formatting
│   │   │   └── Use ctx.settings.exportDecimals (default 6)
│   │   └── Remove trailing zeros (22.393000 → 22.393)
│   └── Build data matrix
│
├── Format based on export type
│   ├── CSV
│   │   ├── Use semicolon separator (ThingsBoard standard)
│   │   ├── UTF-8 BOM for Excel compatibility
│   │   └── Headers: Timestamp, Entity, Label, Value, Units
│   │
│   ├── XLS
│   │   ├── Create XLSX workbook (BIFF5 format)
│   │   ├── Add metadata sheet
│   │   ├── Add data sheet with formatting
│   │   └── Auto-size columns
│   │
│   └── XLSX
│       ├── Create XLSX workbook (modern format)
│       ├── Add metadata sheet
│       ├── Add data sheet with formatting
│       ├── Apply cell styles (headers bold)
│       └── Auto-size columns
│
├── Create Blob and download
│   ├── Generate blob with correct MIME type
│   ├── Use File System Access API (if supported)
│   │   └── Native save dialog with suggested filename
│   └── Fallback to traditional download
│       ├── Create invisible <a> element
│       ├── Set href to blob URL
│       └── Trigger click
│
└── Clear loading state
    ├── isExporting = false
    └── ctx.detectChanges()
```

**Key Points**:
- Dynamic filenames with entity metadata
- Multiple format support with proper formatting
- Configurable decimal places
- Modern File System Access API with fallback

---

### 4. Device Type Filtering Flow

**Automatically filter measurements based on device type**

```
fetchDeviceTypesAndFilter()
├── Log: "📋 [DEVICE TYPE] Fetching device types and filtering"
│
├── For each entity in ctx.data
│   ├── Extract entity ID
│   ├── Skip if already fetched
│   │
│   ├── Fetch attributes from ThingsBoard
│   │   └── ctx.attributeService.getEntityAttributes(entityId, 'SERVER_SCOPE')
│   │
│   ├── Extract deviceName attribute
│   │   └── Example: "S-200-a3-2d3412ab"
│   │
│   ├── Parse device type
│   │   └── parseDeviceType(deviceName)
│   │       ├── Check patterns in deviceTypePatterns
│   │       │   ├── "S-200" → "S200 3D"
│   │       │   ├── "S-210" → "S210 3D XT"
│   │       │   ├── "S-201" → "S201 3D XT self build"
│   │       │   ├── "S-100" → "S100 6D"
│   │       │   └── "S-400" → "S400 GNSS"
│   │       └── Use case-insensitive partial matching
│   │
│   ├── Store device type
│   │   └── deviceTypeMap.set(entityId, deviceType)
│   │
│   ├── Get forbidden measurements
│   │   └── deviceTypeForbiddenMeasurements[deviceType]
│   │       ├── "S200 3D" → ["alpha", "beta", "gamma"]
│   │       ├── "S210 3D XT" → ["alpha", "beta", "gamma"]
│   │       ├── "S201 3D XT" → ["alpha", "beta", "gamma"]
│   │       ├── "S100 6D" → []
│   │       └── "S400 GNSS" → []
│   │
│   ├── Store forbidden measurements
│   │   └── deviceForbiddenMeasurements.set(entityId, forbidden)
│   │
│   └── Debug log (if debugOutput)
│       └── "  {entityId} → {deviceName} → {deviceType} (forbidden: {keywords})"
│
├── Mark as fetched
│   └── isDeviceTypesFetched = true
│
├── Filter series in onDataUpdated
│   └── For each series
│       ├── Check isMeasurementAllowed(entityName, label)
│       │   ├── Get forbidden keywords for entity
│       │   ├── Check if label contains any keyword
│       │   │   └── Use word boundary matching: \b{keyword}\b
│       │   ├── Examples:
│       │   │   ├── "alpha_d_avg_day" contains "alpha" → FORBIDDEN for 3D
│       │   │   ├── "tv1_d_avg_day" contains "day" → NOT matched (word boundary)
│       │   │   └── "temperature" → ALLOWED for 3D
│       │   └── Return true/false
│       │
│       └── If not allowed → skip series (continue loop)
│
└── Log summary (if debugOutput)
    ├── "✅ Device type fetching complete. {count} devices typed."
    ├── "📊 Filtering Summary: {filtered}/{total} series will be hidden"
    └── "   Filtered measurements: {list}"
```

**Configuration**:
```typescript
// Add new device types
private deviceTypePatterns: Record<string, string> = {
  'S-200': 'S200 3D',
  'S-300': 'S300 Custom',  // Add custom device
};

// Add forbidden measurements
private deviceTypeForbiddenMeasurements: Record<string, string[]> = {
  'S200 3D': ['alpha', 'beta', 'gamma'],
  'S300 Custom': ['rotation', 'tilt'],  // Custom restrictions
};
```

**Key Points**:
- Runs once per component lifecycle
- Fetches device metadata from ThingsBoard
- Pattern-based device type recognition
- Word boundary matching prevents false positives
- Future measurements automatically work for allowed types

---

### 5. Resize Flow

**Window or container resize event**

```
onResize()
├── Debounce resize event
│   ├── Clear existing timer
│   └── setTimeout(300ms)
│
└── Execute resize logic
    ├── Check container size
    │   └── currentConfig = isContainerHeight()
    │       ├── height < 1000px → 'small'
    │       ├── 1000px <= height < 1200px → 'large'
    │       └── height >= 1200px → 'huge'
    │
    ├── If size changed
    │   ├── Update currentSize
    │   ├── Force resetGrid = true
    │   └── Recalculate grid layout
    │
    ├── Resize ECharts instance
    │   └── chart.resize()
    │
    ├── Update responsive font sizes
    │   ├── Small: 14px legend, 14px axes
    │   ├── Large: 20px legend, 16px axes
    │   └── Huge: 24px legend, 18px axes
    │
    ├── Update responsive line widths
    │   ├── Small: 4px (3px middle)
    │   ├── Large: 5px (4px middle)
    │   └── Huge: 5px (4px middle)
    │
    ├── Update responsive symbol sizes
    │   └── All sizes: base * 2.5x
    │
    ├── Recalculate legend pagination
    │   └── calculateItemsPerPage()
    │       ├── Measure legendViewport width
    │       ├── Measure single legend item width
    │       ├── Calculate columns that fit
    │       ├── Calculate rows available
    │       └── itemsPerPage = columns * rows
    │
    ├── Recalculate sidebar width
    │   └── calculateDynamicSidebarWidth()
    │       ├── Based on container width
    │       ├── Min: 200px, Max: 300px
    │       └── Update CSS variable
    │
    ├── Refresh chart
    │   └── onDataUpdated()
    │
    └── Trigger change detection
        └── ctx.detectChanges()
```

**Key Points**:
- Debounced to prevent excessive updates
- Recalculates all responsive elements
- Updates font sizes, line widths, symbol sizes
- Re-paginates legend items
- Adjusts sidebar width dynamically

---

## Performance Optimizations

### 1. Data Sampling (LTTB Algorithm)

**For series with > 1000 points**

```typescript
if (points > 1000) {
  seriesElement.sampling = 'lttb';  // Largest Triangle Three Buckets
  seriesElement.large = true;       // Enable large dataset mode
  seriesElement.largeThreshold = 1000;  // Threshold for optimization
}
```

**Benefits**:
- Reduces rendered points while preserving visual shape
- Dramatically improves rendering performance
- Maintains data trends and peaks

---

### 2. Animation Control

**Dynamic based on data size**

```typescript
private getAnimationSettings(): boolean {
  return this.totalDataPoints < 5000;  // Disable animation for large datasets
}

private getAnimationDuration(): number {
  if (this.totalDataPoints > 10000) return 0;
  if (this.totalDataPoints > 5000) return 300;
  return 1000;  // Default animation duration
}
```

**Benefits**:
- Smooth animations for small datasets
- Instant updates for large datasets
- Improves perceived performance

---

### 3. Batched Chart Actions

**Batch legend toggle actions**

```typescript
private batchedDispatchAction(action: any): void {
  this.pendingChartActions.push(action);

  if (this.chartActionBatch) {
    clearTimeout(this.chartActionBatch);
  }

  this.chartActionBatch = setTimeout(() => {
    this.flushChartActionBatch();
  }, 30);  // Batch window: 30ms
}

private flushChartActionBatch(): void {
  // Temporarily disable animations
  this.temporarilyDisableAnimations();

  // Execute all pending actions
  this.pendingChartActions.forEach(action => {
    this.chart.dispatchAction(action);
  });

  // Clear batch
  this.pendingChartActions = [];

  // Restore animations after delay
  setTimeout(() => this.restoreAnimations(), 100);
}
```

**Benefits**:
- Reduces chart reflows
- Improves UI responsiveness
- Prevents animation stuttering

---

### 4. Lazy Loading

**Defer chart initialization until visible**

```typescript
private initializeLazyLoading(): void {
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          observer.disconnect();
          this.initializeImmediate();
        }
      });
    }, {
      root: null,
      rootMargin: '50px',  // Start loading 50px before visible
      threshold: 0.1       // Trigger at 10% visibility
    });

    observer.observe(this.chartContainer.nativeElement);
  }
}
```

**Benefits**:
- Faster initial page load
- Reduces memory usage
- Only initializes visible charts

---

### 5. Emphasis Disabling (Anti-Glossy)

**Prevent 3D visual effects on hover**

```typescript
// Global settings
myNewOptions.emphasis = {
  disabled: true,
  scale: false
};

// Per-series settings
seriesElement.emphasis = {
  disabled: true
};

seriesElement.blur = {
  itemStyle: { opacity: 1 },
  lineStyle: { opacity: 1 }
};

seriesElement.stateAnimation = {
  duration: 0  // Instant state changes
};
```

**Benefits**:
- Flat, modern appearance
- Prevents unwanted glossy/3D effects
- Improves hover performance

---

## State Management

### State Hierarchy

```
Component State
├── Plot States (plotLabelStates)
│   ├── Independent of device states
│   └── Persists across device toggles
│
├── Device States (deviceVisibilityStates)
│   ├── Independent of plot states
│   └── Persists across plot toggles
│
└── Final Visibility = Device Visible AND Plot Visible
    └── Applied when rendering series
```

### State Persistence

**Across dashboard navigation:**
```typescript
private subscribeToStateChanges(): void {
  this.stateChangeSubscription = this.ctx.stateController
    .stateChanged()
    .subscribe(() => {
      // Preserve states through navigation
      this.handleStateChange();
    });
}
```

**Key Behaviors**:
- Plot visibility persists when devices are toggled
- Device visibility persists when plots are toggled
- Cannot hide the last visible series
- State is preserved across dashboard navigation
- State is reset on widget reload

---

## Integration with ThingsBoard

### Widget.js Bridge

**Located at**: `echarts-line-chart-widget.js`

**Purpose**: Bridge between ThingsBoard widget system and Angular component

**Key Integration Points**:

```javascript
// ThingsBoard widget entry point
self.onInit = function() {
  // Wait for Angular component to initialize
  self.ctx.$scope.$watch('echartsLineChartComponent', function(component) {
    if (component) {
      // Component is ready, flush pending updates
      if (self.pendingUpdate) {
        component.onDataUpdated();
        self.pendingUpdate = false;
      }
    }
  });
};

// ThingsBoard data update
self.onDataUpdated = function() {
  if (self.ctx.$scope.echartsLineChartComponent) {
    // Component is ready, update immediately
    self.ctx.$scope.echartsLineChartComponent.onDataUpdated();
  } else {
    // Component not ready, queue update
    self.pendingUpdate = true;
  }
};
```

**Angular Side**:
```typescript
ngAfterViewInit(): void {
  setTimeout(() => {
    // Expose component to ThingsBoard
    if (this.ctx.$scope) {
      this.ctx.$scope.echartsLineChartComponent = this;

      // Flush queued updates from widget.js
      if (typeof this.ctx.$scope.componentReady === 'function') {
        this.ctx.$scope.componentReady();
      }
    }
  }, 100);
}
```

**Benefits**:
- Prevents race conditions
- Ensures data updates don't get lost
- Smooth integration with ThingsBoard lifecycle

---

## Common Patterns and Best Practices

### 1. Change Detection
```typescript
// Always trigger change detection after state updates
this.hasNoVisibleData = true;
this.ctx.detectChanges();  // Required!
```

### 2. Chart Options
```typescript
// NEVER use merge mode - always full replace
this.chart.setOption(myNewOptions);  // ✅ Correct
// this.chart.setOption(myNewOptions, true);  // ❌ Wrong - causes issues
```

### 3. Async Operations
```typescript
// Always handle async operations properly
private async fetchData(): Promise<void> {
  try {
    const result = await someAsyncOperation();
    // Process result
  } catch (error) {
    console.error('Error:', error);
  } finally {
    // Always cleanup
    this.ctx.detectChanges();
  }
}
```

### 4. Cleanup
```typescript
// Always clean up resources in ngOnDestroy
ngOnDestroy(): void {
  if (this.chart && !this.chart.isDisposed()) {
    this.chart.dispose();  // Critical!
  }
  // ... other cleanup
}
```

---

## Debugging

### Debug Output

Enable comprehensive logging:
```json
{
  "debugOutput": true,
  "performanceDebug": true,
  "debugMinMaxLogs": true,
  "debugAlarmLogs": true
}
```

### Console Output

**Widget Information:**
```
📊 [CTX DEBUG] Widget Context Information
  🔧 Widget Dimensions: { width: 1200, height: 800 }
  ⚙️ Settings: { multipleDevices: true, debugOutput: true, ... }
  📡 Datasources (3): [...]
  📈 Data Series (6): [...]
```

**Device Type Filtering:**
```
📋 [DEVICE TYPE] Fetching device types and filtering measurements
  62a09b46 → "S-100-a3-74512691" → S100 6D (forbidden: none)
  e260efd1 → "S-210-a3-14805d0b" → S210 3D XT (forbidden: alpha, beta, gamma)
  🚫 [DEVICE TYPE] Filtering out "alpha_d_avg_day" for e260efd1
✅ Device type fetching complete. 19 devices typed.
📊 Filtering Summary: 51/133 series will be hidden
```

**Performance Metrics:**
```
⏱️ Chart render: 45ms
📊 Data points: 12,543
📈 Series count: 28
```

---

## File References

### Component Files
- **Main Component**: `echarts-line-chart.component.ts` (7,109 lines)
- **Template**: `echarts-line-chart.component.html`
- **Styles**: `echarts-line-chart.component.scss`
- **Sidebar Styles**: `echarts-line-chart-sidebar.scss`
- **Widget Bridge**: `echarts-line-chart-widget.js`

### Related Components
- **Settings**: `settings/echarts-line-chart-settings.component.ts`
- **Data Key Settings**: `data-key-settings/echarts-line-chart-data-key-settings.component.ts`
- **Settings Dialog**: `settings-dialog/echarts-settings-dialog.component.ts`
- **Debug Dialog**: `debug-dialog/debug-logging-dialog.component.ts`

### Configuration
- **Settings Schema**: `settings-schema.json`
- **Data Key Schema**: `data-key-settings-schema.json`

---

## Summary

This component is a **production-grade, enterprise-level** time-series visualization widget with:

- ✅ Robust state management
- ✅ Performance optimizations for large datasets
- ✅ Comprehensive feature set
- ✅ Extensive error handling
- ✅ Clean integration with ThingsBoard
- ✅ Responsive design
- ✅ Accessibility considerations
- ✅ Debug tooling

**Total Complexity**: 7,109 lines of carefully crafted TypeScript implementing one of the most sophisticated widgets in the ThingsBoard ecosystem.

---

## Additional Resources

- [ThingsBoard Widget API Documentation](https://thingsboard.io/docs/user-guide/contribution/widgets-development/)
- [ECharts Documentation](https://echarts.apache.org/en/index.html)
- [Angular Lifecycle Hooks](https://angular.io/guide/lifecycle-hooks)
- [RxJS Operators](https://rxjs.dev/guide/operators)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-27
**Component Version**: 1.2
**Author**: Technical Documentation Team
