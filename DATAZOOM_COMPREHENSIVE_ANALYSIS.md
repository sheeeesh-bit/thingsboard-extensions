# 🔍 DataZoom Comprehensive Analysis

**Created:** 2025-11-17
**Purpose:** Complete documentation of how DataZoom is used, initialized, and why it might not be showing up

---

## 📋 Table of Contents

1. [DataZoom Architecture Overview](#datazoom-architecture-overview)
2. [Initialization Flow](#initialization-flow)
3. [DataZoom Configuration](#datazoom-configuration)
4. [Visual Overlay (HTML/CSS)](#visual-overlay-htmlcss)
5. [Bidirectional Synchronization](#bidirectional-synchronization)
6. [Why DataZoom Might Not Show](#why-datazoom-might-not-show)
7. [Debug Strategy](#debug-strategy)
8. [Previous Fixes Applied](#previous-fixes-applied)

---

## 🏗️ DataZoom Architecture Overview

The widget implements **dual dataZoom system**:

### 1. ECharts Internal DataZoom
- **Type:** Two components (slider + inside)
- **Location:** `echarts-line-chart.component.ts:6053-6086`
- **Purpose:** Actual data filtering and zoom logic

### 2. Custom Visual Overlay
- **Type:** HTML/CSS overlay at bottom of chart
- **Location:** `echarts-line-chart.component.html:407-418`
- **Purpose:** Better UX (custom styled handles and track)

### How They Work Together

```
User Interaction (drag handle, mouse wheel)
         ↓
Custom Overlay OR ECharts Inside DataZoom
         ↓
Synchronization via Events & dispatchAction
         ↓
Both Components Stay in Sync
         ↓
Chart Updates
```

---

## 🚀 Initialization Flow

### Component Lifecycle

**Location:** `echarts-line-chart.component.ts:760-833`

```typescript
ngAfterViewInit(): void {
  setTimeout(() => {
    // Step 1: Initialize chart
    this.initChart();
    this.setupResizeObserver();

    // Step 2: Critical - Expose to ThingsBoard bridge
    if (this.ctx.$scope) {
      this.ctx.$scope.echartsLineChartComponent = this;
      if (typeof this.ctx.$scope.componentReady === 'function') {
        this.ctx.$scope.componentReady();
      }
    }

    // Step 3: Initialize zoom overlay AFTER DOM rendered
    setTimeout(() => {
      if (this.shouldShowDataZoom()) {
        this.updateZoomOverlay();           // Position handles
        this.applyScrollableHeight();       // Recalculate heights
        if (this.chart && !this.chart.isDisposed()) {
          this.chart.resize();              // Apply new dimensions
        }
      }

      if (this.isMobileDevice) {
        this.calculateMobileMenuMaxHeight();
      }
    }, 250); // Critical delay for Angular template rendering

  }, 100);
}
```

### Key Timing Issues

**Problem:** Race condition between Angular rendering and TypeScript initialization

**Timeline:**
```
T+0ms:   ngAfterViewInit starts
T+100ms: Chart initialization begins
T+250ms: Zoom overlay initialization (MUST wait for DOM)
T+350ms: Everything should be visible
```

**Why 250ms delay?**
- Angular needs time to render `*ngIf="shouldShowDataZoom()"` template
- ViewChild reference (`@ViewChild('zoomOverlay')`) needs to be populated
- DOM query selectors need actual elements to exist

---

## ⚙️ DataZoom Configuration

### ECharts Configuration

**Location:** `echarts-line-chart.component.ts:6053-6086`

```typescript
private getDataZoomConfig(): any[] {
  // Check if zoom should be shown
  const showZoom = this.shouldShowDataZoom();

  if (!showZoom) {
    return []; // Disabled - return empty array
  }

  return [
    // Component #1: Slider (HIDDEN - we use custom overlay)
    {
      type: 'slider',
      show: false,              // Hidden - custom overlay provides UI
      xAxisIndex: 'all',        // Control all x-axes (all subplots)
      start: this.zoomStart,    // 0-100 percentage
      end: this.zoomEnd,        // 0-100 percentage
      filterMode: 'filter'      // Actually filter data (not just visual)
    },

    // Component #2: Inside (for mouse wheel/touch)
    {
      type: 'inside',
      xAxisIndex: 'all',
      start: this.zoomStart,
      end: this.zoomEnd,
      zoomOnMouseWheel: true,   // Enable wheel zoom
      moveOnMouseWheel: false,  // Wheel zooms, doesn't pan
      moveOnMouseMove: true,    // Drag to pan
      zoomOnTouch: true,        // Enable pinch zoom
      filterMode: 'filter',
      throttle: 50              // Performance optimization
    }
  ];
}
```

### When DataZoom Config is Applied

**1. Initial Chart Creation** (`echarts-line-chart.component.ts:5996`)
```typescript
const initOptions = {
  // ... other options ...
  dataZoom: this.getDataZoomConfig()
};
```

**2. Every Chart Update** (`echarts-line-chart.component.ts:1330`)
```typescript
myNewOptions.xAxis = this.currentXAxisArray();
myNewOptions.yAxis = this.currentYAxisArray();
myNewOptions.grid = this.currentGridArray();
myNewOptions.dataZoom = this.getDataZoomConfig(); // ← Updated here
```

**3. Grid Changes** (`echarts-line-chart.component.ts:1366`)
```typescript
this.chart.setOption(myNewOptions, {
  replaceMerge: ['grid', 'xAxis', 'yAxis', 'series', 'dataZoom'] // ← Replaced
});
```

---

## 🎨 Visual Overlay (HTML/CSS)

### HTML Structure

**Location:** `echarts-line-chart.component.html:407-418`

```html
<!-- Bottom floating zoom overlay -->
<div class="zoom-overlay" #zoomOverlay *ngIf="shouldShowDataZoom()">
  <div class="zoom-track">
    <div class="zoom-window"></div>
    <div class="zoom-handle left"
         (mousedown)="startDragHandle($event, 'start')"
         (touchstart)="startDragHandle($event, 'start')"></div>
    <div class="zoom-handle right"
         (mousedown)="startDragHandle($event, 'end')"
         (touchstart)="startDragHandle($event, 'end')"></div>
  </div>
  <button class="zoom-reset" (click)="resetZoom()">Reset</button>
</div>
```

**Critical:** The `*ngIf="shouldShowDataZoom()"` determines visibility!

### CSS Positioning

**Location:** `echarts-line-chart.component.scss:1019-1045`

```scss
.zoom-overlay {
  /* Layout/Positioning */
  position: relative;        // Flex child in column layout
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;           // Don't shrink - maintain size
  width: 100%;
  z-index: 100;

  /* Visual Styling */
  background: linear-gradient(180deg,
    rgba(252, 252, 254, 0.98) 0%,
    rgba(255, 255, 255, 0.95) 100%);
  backdrop-filter: saturate(180%) blur(12px);
  box-shadow:
    0 -1px 0 rgba(255, 255, 255, 0.9) inset,
    0 1px 0 rgba(0, 0, 0, 0.04) inset,
    0 -2px 8px rgba(0, 0, 0, 0.04);
  border-top: 1px solid rgba(0, 0, 0, 0.08);

  /* Padding */
  padding: 8px;
  padding-left: var(--plot-left, 10%);   // Align with chart grid
  padding-right: var(--plot-right, 1%);
}
```

### Layout Hierarchy

**Location:** `echarts-line-chart.component.html:84-420`

```
<div class="echarts-layout">           // flex-direction: column
  ├── <div class="echarts-main-area">  // flex-direction: row, flex: 1
  │     ├── <aside class="entity-sidebar">
  │     └── <div class="chart-container-wrapper">
  │           ├── <nav class="legend-overlay">
  │           └── <div class="chart-outer">
  │                 └── <div id="echartContainer">
  └── <div class="zoom-overlay">       // flex-shrink: 0 (stacks at bottom)
```

**Key:**
- `echarts-layout`: Column layout enables vertical stacking
- `echarts-main-area`: Row layout for sidebar + chart
- `zoom-overlay`: Naturally positioned at bottom as last flex child

---

## 🔄 Bidirectional Synchronization

### State Properties

**Location:** `echarts-line-chart.component.ts:99-100`

```typescript
// External zoom state (percentages)
public zoomStart = 0;   // 0-100
public zoomEnd = 100;   // 0-100
```

### 1. User Drags Custom Overlay Handle

**Flow:**
```
User drags handle
  ↓
startDragHandle() (Line 5077)
  ↓
moveHandler updates zoomStart/zoomEnd
  ↓
onZoomInput() (Line 4972)
  ↓
chart.dispatchAction({
  type: 'dataZoom',
  dataZoomIndex: 0,      // ← Explicitly target slider component
  start: this.zoomStart,
  end: this.zoomEnd
})
  ↓
ECharts updates chart
  ↓
updateZoomOverlay() - visual sync
```

**Code:** `echarts-line-chart.component.ts:4972-4993`

```typescript
private onZoomInput(): void {
  if (!this.chart || this.chart.isDisposed()) return;

  // Dispatch to ECharts (explicit dataZoomIndex)
  this.chart.dispatchAction({
    type: 'dataZoom',
    dataZoomIndex: 0,      // CRITICAL: Target first (slider) component
    start: this.zoomStart,
    end: this.zoomEnd
  });

  // Update visual overlay
  this.updateZoomOverlay();
  this.ctx.detectChanges?.();
}
```

### 2. User Zooms with Mouse Wheel

**Flow:**
```
User scrolls mouse wheel
  ↓
ECharts 'inside' dataZoom handles zoom
  ↓
'dataZoom' event fires (Line 3638)
  ↓
Event listener reads option.dataZoom[0]
  ↓
zoomStart/zoomEnd updated
  ↓
updateZoomOverlay() - handle positions sync
  ↓
ctx.detectChanges()
```

**Code:** `echarts-line-chart.component.ts:3638-3680`

```typescript
this.chart.on('dataZoom', () => {
  if (!this.chart || this.chart.isDisposed()) return;

  try {
    const option = this.chart.getOption();
    const dataZoomArray = option.dataZoom;

    // Proper type checking
    if (dataZoomArray && Array.isArray(dataZoomArray) && dataZoomArray.length > 0) {
      const dz = dataZoomArray[0]; // First component (slider)

      if (dz && typeof dz.start === 'number' && typeof dz.end === 'number') {
        const s = Math.round(dz.start * 1000) / 1000;
        const e = Math.round(dz.end * 1000) / 1000;

        // Only update if changed (prevent infinite loops)
        if (s !== this.zoomStart || e !== this.zoomEnd) {
          this.zoomStart = s;
          this.zoomEnd = e;
          this.updateZoomOverlay();
          this.ctx.detectChanges?.();
        }
      }
    }
  } catch (error) {
    console.warn('[ZOOM] Error syncing dataZoom:', error);
  }
});
```

### 3. Update Visual Overlay

**Code:** `echarts-line-chart.component.ts:5043-5074`

```typescript
private updateZoomOverlay(): void {
  const track = this.zoomOverlay?.nativeElement?.querySelector('.zoom-track') as HTMLElement;

  if (!track) {
    // Element not ready - retry after Angular renders
    setTimeout(() => {
      const retryTrack = this.zoomOverlay?.nativeElement?.querySelector('.zoom-track') as HTMLElement;
      if (retryTrack) {
        this.updateZoomOverlayDOM(retryTrack);
      }
    }, 100);
    return;
  }

  this.updateZoomOverlayDOM(track);
}

private updateZoomOverlayDOM(track: HTMLElement): void {
  const left = this.zoomStart;
  const right = 100 - this.zoomEnd;

  const win = track.querySelector('.zoom-window') as HTMLElement;
  const hl = track.querySelector('.zoom-handle.left') as HTMLElement;
  const hr = track.querySelector('.zoom-handle.right') as HTMLElement;

  if (win) {
    win.style.left = `${left}%`;
    win.style.right = `${right}%`;
  }
  if (hl) hl.style.left = `calc(${left}% - 7px)`;
  if (hr) hr.style.right = `calc(${right}% - 7px)`;
}
```

**Key:** Retry logic handles race condition when element not yet rendered

---

## 🚫 Why DataZoom Might Not Show

### Checklist of Possible Causes

#### 1. **Setting Disabled**

**Check:** `echarts-line-chart.component.ts:6049-6051`

```typescript
public shouldShowDataZoom(): boolean {
  return this.getBooleanSetting('showZoomControls', true);
}
```

**Diagnosis:**
- Default is `true` (should show)
- Setting name: `showZoomControls`
- Check ThingsBoard widget settings for this key

**How to verify:**
```typescript
// Add debug log in ngOnInit or ngAfterViewInit
console.log('🔍 shouldShowDataZoom:', this.shouldShowDataZoom());
console.log('🔍 showZoomControls setting:', this.ctx?.settings?.showZoomControls);
```

#### 2. **Angular Template Not Rendered**

**Problem:** `*ngIf="shouldShowDataZoom()"` condition false or element not created

**Check HTML:** `echarts-line-chart.component.html:407`

```html
<div class="zoom-overlay" #zoomOverlay *ngIf="shouldShowDataZoom()">
```

**Diagnosis:**
- If `shouldShowDataZoom()` returns `false` → element never created
- ViewChild reference (`@ViewChild('zoomOverlay')`) will be `undefined`
- `updateZoomOverlay()` will fail silently

**How to verify:**
```typescript
// In ngAfterViewInit, after 250ms timeout
console.log('🔍 zoomOverlay element:', this.zoomOverlay?.nativeElement);
console.log('🔍 Element exists in DOM:', document.querySelector('.zoom-overlay'));
```

#### 3. **CSS Display/Visibility Issue**

**Possible causes:**
- `display: none` somewhere in CSS cascade
- `visibility: hidden`
- `opacity: 0`
- `height: 0` or `overflow: hidden` on parent

**Check:** `echarts-line-chart.component.scss:1019-1045`

**How to verify (browser console):**
```javascript
const zoomEl = document.querySelector('.zoom-overlay');
console.log('Element:', zoomEl);
console.log('Computed style:', window.getComputedStyle(zoomEl));
console.log('Display:', zoomEl.style.display);
console.log('Visibility:', zoomEl.style.visibility);
console.log('Height:', zoomEl.offsetHeight);
console.log('Position in viewport:', zoomEl.getBoundingClientRect());
```

#### 4. **Z-Index / Positioning Issue**

**Problem:** Element rendered but covered by another element

**Current z-index:** `z-index: 100` (should be high enough)

**How to verify (browser console):**
```javascript
const zoomEl = document.querySelector('.zoom-overlay');
const rect = zoomEl.getBoundingClientRect();
console.log('Position:', rect);
console.log('Is in viewport:', rect.top >= 0 && rect.bottom <= window.innerHeight);
console.log('Elements at position:', document.elementsFromPoint(rect.left + rect.width/2, rect.top + rect.height/2));
```

#### 5. **Flexbox Layout Issue**

**Problem:** Parent flex container misconfigured

**Expected hierarchy:**
```
echarts-layout (flex-direction: column)
  ├── echarts-main-area (flex: 1)
  └── zoom-overlay (flex-shrink: 0)
```

**Check:** `echarts-line-chart.component.scss:306-323`

**How to verify (browser console):**
```javascript
const layout = document.querySelector('.echarts-layout');
const mainArea = document.querySelector('.echarts-main-area');
const zoom = document.querySelector('.zoom-overlay');

console.log('Layout flex-direction:', window.getComputedStyle(layout).flexDirection);
console.log('Main area flex:', window.getComputedStyle(mainArea).flex);
console.log('Zoom flex-shrink:', window.getComputedStyle(zoom).flexShrink);
console.log('Zoom height:', zoom.offsetHeight);
```

#### 6. **Height Calculation Issue**

**Problem:** Parent container has `height: 0` or insufficient height

**Check:** `echarts-line-chart.component.ts:1445-1502` (applyScrollableHeight)

**How to verify:**
```typescript
// Add debug logs in applyScrollableHeight()
console.log('🔍 Container height:', this.ctx.height);
console.log('🔍 Button bar height:', buttonBarHeight);
console.log('🔍 Legend height:', legendH);
console.log('🔍 Zoom height:', zoomH);
console.log('🔍 Viewport height:', viewport);
```

#### 7. **Race Condition (Still)**

**Problem:** Even with 250ms delay, element not ready

**Check timing:** `echarts-line-chart.component.ts:812-831`

**How to verify:**
```typescript
// Add debug logs
setTimeout(() => {
  console.log('🔍 [T+250ms] Zoom initialization');
  console.log('🔍 shouldShowDataZoom:', this.shouldShowDataZoom());
  console.log('🔍 zoomOverlay ref:', this.zoomOverlay);
  console.log('🔍 DOM element:', this.zoomOverlay?.nativeElement);
  console.log('🔍 .zoom-track:', this.zoomOverlay?.nativeElement?.querySelector('.zoom-track'));

  if (this.shouldShowDataZoom()) {
    this.updateZoomOverlay();
  }
}, 250);
```

#### 8. **ECharts Configuration Not Applied**

**Problem:** `getDataZoomConfig()` returns empty array or incorrect config

**How to verify:**
```typescript
// After chart initialization
console.log('🔍 Chart option:', this.chart.getOption());
console.log('🔍 DataZoom config:', this.chart.getOption().dataZoom);
console.log('🔍 Expected config:', this.getDataZoomConfig());
```

---

## 🔧 Debug Strategy

### Step-by-Step Debugging

**1. Check Setting**
```typescript
// Add to ngOnInit or ngAfterViewInit
console.group('🔍 DataZoom Debug');
console.log('Setting value:', this.ctx?.settings?.showZoomControls);
console.log('shouldShowDataZoom():', this.shouldShowDataZoom());
console.groupEnd();
```

**2. Check Template Rendering**
```typescript
// Add after 250ms timeout in ngAfterViewInit
console.group('🔍 Template Check');
console.log('ViewChild ref:', this.zoomOverlay);
console.log('Native element:', this.zoomOverlay?.nativeElement);
console.log('Query selector:', document.querySelector('.zoom-overlay'));
console.log('Element in DOM:', !!document.querySelector('.zoom-overlay'));
console.groupEnd();
```

**3. Check Computed Styles**
```javascript
// Browser console
const el = document.querySelector('.zoom-overlay');
const style = window.getComputedStyle(el);
console.table({
  display: style.display,
  visibility: style.visibility,
  opacity: style.opacity,
  height: style.height,
  width: style.width,
  position: style.position,
  zIndex: style.zIndex,
  bottom: style.bottom,
  flexShrink: style.flexShrink
});
```

**4. Check Layout Position**
```javascript
// Browser console
const el = document.querySelector('.zoom-overlay');
const rect = el.getBoundingClientRect();
console.table({
  'In viewport': rect.top >= 0 && rect.bottom <= window.innerHeight,
  'Top': rect.top,
  'Bottom': rect.bottom,
  'Left': rect.left,
  'Right': rect.right,
  'Width': rect.width,
  'Height': rect.height,
  'Window height': window.innerHeight
});
```

**5. Check Parent Container**
```javascript
// Browser console
const layout = document.querySelector('.echarts-layout');
const layoutStyle = window.getComputedStyle(layout);
console.table({
  'Flex direction': layoutStyle.flexDirection,
  'Height': layoutStyle.height,
  'Overflow': layoutStyle.overflow
});
```

**6. Check ECharts Config**
```typescript
// After chart update
console.group('🔍 ECharts DataZoom Config');
const option = this.chart.getOption();
console.log('Full option:', option);
console.log('DataZoom array:', option.dataZoom);
console.log('Length:', option.dataZoom?.length);
if (option.dataZoom && option.dataZoom.length > 0) {
  console.log('First component:', option.dataZoom[0]);
  console.log('Start:', option.dataZoom[0].start);
  console.log('End:', option.dataZoom[0].end);
}
console.groupEnd();
```

### Quick Browser Console Test

```javascript
// Copy-paste into browser console
(() => {
  const el = document.querySelector('.zoom-overlay');
  if (!el) {
    console.error('❌ Element not found in DOM');
    return;
  }

  const style = window.getComputedStyle(el);
  const rect = el.getBoundingClientRect();

  console.log('✅ Element exists');
  console.log('Display:', style.display);
  console.log('Visibility:', style.visibility);
  console.log('Height:', el.offsetHeight + 'px');
  console.log('Position:', {
    top: rect.top,
    bottom: rect.bottom,
    inViewport: rect.top >= 0 && rect.bottom <= window.innerHeight
  });

  if (rect.bottom < 0 || rect.top > window.innerHeight) {
    console.warn('⚠️ Element is outside viewport');
  }

  if (el.offsetHeight === 0) {
    console.warn('⚠️ Element has zero height');
  }
})();
```

---

## 📚 Previous Fixes Applied

### Fix #1: Race Condition on Initial Load
**File:** `DATAZOOM_INITIALIZATION_FIX.md`

**Changes:**
1. `getZoomPx()` fallback: Returns 45px if element not rendered yet
2. `updateZoomOverlay()` retry logic: Retries if element doesn't exist
3. Increased delay: 100ms → 250ms for zoom positioning

**Status:** ✅ Implemented

---

### Fix #2: Layout Restructure
**File:** `DATAZOOM_COMPLETE_FIX.md`

**Changes:**
1. HTML: Added `echarts-main-area` wrapper
2. CSS: Changed `echarts-layout` to `flex-direction: column`
3. CSS: `zoom-overlay` as flex child with `position: relative`
4. TypeScript: Explicit `dataZoomIndex: 0` in dispatchAction

**Status:** ✅ Implemented

---

### Fix #3: Desktop/Mobile Positioning
**File:** `DATAZOOM_DESKTOP_FIX.md`, `DATAZOOM_STICKY_FIX.md`

**Changes:**
1. Removed sticky positioning (now uses flexbox)
2. Fixed mobile padding-bottom issue
3. Grid bottom reserve increased on mobile

**Status:** ✅ Implemented

---

### Fix #4: Visibility Research
**File:** `DATAZOOM_VISIBILITY_RESEARCH.md`

**Findings:**
- Mobile: `paddingBottom: 0px` causes chart to overlap zoom
- Desktop: `paddingBottom: ${zoomH}px` works correctly
- Solution: Increase grid bottom reserve or restore padding

**Status:** ✅ Analyzed (solution implemented)

---

## 🎯 Current Status

### What Should Be Working

✅ Layout properly structured (column > row > zoom)
✅ Zoom as flex child at bottom
✅ Retry logic for race conditions
✅ Fallback height estimation
✅ Explicit dataZoomIndex in dispatchAction
✅ Comprehensive error handling
✅ Bidirectional synchronization

### What to Investigate

If zoom is still not showing:

1. **Check browser console** for any errors
2. **Inspect element** to see if it exists in DOM
3. **Check computed styles** for display/visibility/height
4. **Verify setting** `showZoomControls` is not explicitly `false`
5. **Check viewport position** (might be rendered outside visible area)
6. **Verify flex layout** parent container using correct flex-direction

---

## 📊 Summary

### How DataZoom Works

1. **Setting Check:** `shouldShowDataZoom()` reads `showZoomControls` (default: true)
2. **Template Rendering:** Angular renders `zoom-overlay` div if setting is true
3. **Initialization:** After 250ms, positions handles via `updateZoomOverlay()`
4. **ECharts Config:** Two dataZoom components (slider + inside) applied to chart
5. **Synchronization:** Bidirectional sync between custom overlay and ECharts
6. **Visual Position:** Flex child at bottom of column layout

### Most Likely Causes If Not Showing

1. **Setting disabled** (`showZoomControls: false`)
2. **Element outside viewport** (height calculation issue)
3. **CSS override** (display: none somewhere)
4. **Race condition** (still not rendered after 250ms)
5. **Parent container issue** (wrong flex-direction or height: 0)

### Next Steps

1. Add comprehensive debug logging (see Debug Strategy section)
2. Use browser DevTools to inspect element
3. Check console for errors
4. Verify computed styles
5. Check if element exists but is positioned off-screen

---

**Last Updated:** 2025-11-17
**Analysis Complete** ✅
