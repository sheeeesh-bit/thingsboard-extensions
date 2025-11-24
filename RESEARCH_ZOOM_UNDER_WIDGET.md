# 🔍 Research: DataZoom Under Widget on Desktop

Investigation into why datazoom appears under/outside the widget on desktop with overflow-y: visible.

---

## 🎯 The Problem

**Current state:**
- Mobile: Zoom visible ✓
- Desktop: Zoom under widget, not visible ❌

**After applying:**
```css
.chart-container-wrapper {
  overflow-y: visible; /* For sticky positioning */
  max-height: 100%; /* To constrain expansion */
}
```

---

## 🔬 Why overflow-y: visible Causes Issues

### The Paradox

**Sticky positioning requires:**
- Parent without `overflow: hidden`
- Needs `overflow: visible` or `overflow: auto`

**But overflow: visible means:**
- Content can overflow parent bounds
- Sticky element can position outside visible area
- No clipping = element can go anywhere

**Result:**
- Sticky works (technically) ✓
- But positions element outside widget bounds ❌

---

## 📊 What's Happening (Desktop)

### Structure

```html
<div fxFlex fxLayout="column" style="height: 100%"> <!-- Widget root -->
  <div class="tb-button-container">...</div>  <!-- ~50px -->
  <div fxFlex class="echarts-layout">        <!-- Remaining space -->
    <div class="chart-container-wrapper">    <!-- overflow-y: visible -->
      <nav class="legend-overlay">...</nav>  <!-- Sticky top -->
      <div class="chart-outer">...</div>     <!-- Scrollable, has padding-bottom -->
      <div class="zoom-overlay">...</div>    <!-- Sticky bottom ← PROBLEM -->
    </div>
  </div>
</div>
```

### The Issue

**chart-container-wrapper:**
```css
height: 100%;        /* Of parent (echarts-layout) */
max-height: 100%;    /* Can't exceed parent */
overflow-y: visible; /* ← Allows content to overflow visually */
```

**With overflow-y: visible:**
1. Container content can visually overflow bounds
2. Sticky bottom: 0 positions at "bottom" of container
3. But "bottom" with visible overflow can be outside widget
4. Zoom positions below visible widget area
5. Appears "under" the widget

**Why max-height: 100% doesn't help:**
- max-height constrains the box model height
- But overflow-y: visible allows visual overflow
- Sticky element positions based on container's content flow
- Content flow with visible overflow extends beyond box
- Sticky follows the flow, not the box

---

## 💡 The Core Conflict

### Incompatible Requirements

**Requirement 1: Sticky Zoom**
```
Needs: overflow: visible (or auto/scroll) on parent
Can't have: overflow: hidden (clips sticky)
```

**Requirement 2: Zoom Within Widget Bounds**
```
Needs: Container constrained to viewport
Can't have: overflow: visible (allows positioning outside)
```

**Contradiction:**
- overflow: hidden → Zoom can't stick (clipped)
- overflow: visible → Zoom can stick but goes outside widget

**There's no CSS-only solution that satisfies both!**

---

## ✅ Actual Solutions

### Option 1: Revert to overflow: hidden, Accept Mobile Sticky Issue ❌

**Not viable** - we need sticky zoom to work

---

### Option 2: Change Zoom to Position: Absolute/Fixed

**Change zoom-overlay:**
```css
.zoom-overlay {
  position: absolute; /* Not sticky */
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
}
```

**Pros:**
- Works with overflow: hidden
- Always at bottom of container
- Predictable positioning

**Cons:**
- Not sticky (doesn't stay visible when scrolling)
- User needs to scroll to bottom to see it
- Less convenient

---

### Option 3: Move Zoom Outside chart-container-wrapper ⭐ BEST

**Restructure HTML:**
```html
<div class="echarts-layout">
  <div class="chart-container-wrapper">  <!-- overflow: hidden OK -->
    <nav class="legend-overlay">...</nav>
    <div class="chart-outer">...</div>
  </div>
  <div class="zoom-overlay">...</div>  <!-- Sibling, not child -->
</div>
```

**Pros:**
- Zoom not affected by chart-container overflow
- Can use overflow: hidden on chart-container
- Zoom positioned relative to echarts-layout
- Works on both platforms
- Clean separation of concerns

**Cons:**
- Requires HTML restructuring
- Need to adjust styling
- Moderate refactoring

---

### Option 4: Make zoom-overlay Sibling of chart-outer ⭐ SIMPLER

**Restructure within chart-container-wrapper:**
```html
<div class="chart-container-wrapper"> <!-- Can use overflow: hidden -->
  <div class="chart-content-area">   <!-- New wrapper -->
    <nav class="legend-overlay">...</nav>
    <div class="chart-outer">...</div>
  </div>
  <div class="zoom-overlay">...</div>  <!-- Sibling of content area -->
</div>
```

**Pros:**
- Minimal restructuring
- Zoom outside scrollable area
- Can use overflow: hidden on content area
- Position: absolute/fixed works

**Cons:**
- Still needs HTML changes
- Need new wrapper div

---

### Option 5: Accept Current State, Ensure Zoom Visible on Mobile Only

**Use position: fixed on mobile, absolute on desktop:**
```css
.zoom-overlay {
  position: sticky; /* Default desktop */
  bottom: 0;
}

@media (max-width: 767px) {
  .zoom-overlay {
    position: fixed; /* Mobile - always visible */
    bottom: 0;
    left: 0;
    right: 0;
  }
}
```

**Pros:**
- No HTML changes
- Mobile works (critical for users)
- Simple CSS change

**Cons:**
- Desktop zoom not sticky (but visible)
- Different behavior per platform

---

## 🎯 The Real Issue

### Why It's So Problematic

**The fundamental problem:**

sticky + overflow interaction is CSS design limitation:
- Sticky requires overflow: visible/auto/scroll
- But overflow: visible allows positioning outside bounds
- This is inherent to how sticky works
- Not a bug, it's the spec

**Our specific case:**
- Large chart content (desktop)
- Padding and reserves add height
- overflow-y: visible allows flow beyond widget
- Sticky positions at flow bottom, not widget bottom
- Zoom appears outside widget

---

## 📊 Desktop vs Mobile Differences

### Why Mobile Works

**Mobile:**
```
padding-bottom: 0px
grid bottom reserve: 20px
Total extra: 20px
Container height: ~Viewport height
Zoom: Positions within viewport ✓
```

### Why Desktop Fails

**Desktop:**
```
padding-bottom: 30px
grid bottom reserve: 150px (for 1-3 grids)
Total extra: 180px
Container height: Viewport + 180px (with overflow-y: visible)
Zoom: Positions at bottom of expanded container (below viewport) ❌
```

---

## ✅ Recommended Solution

**Option 5 for quick fix, Option 3 for proper fix:**

**Quick (CSS only):**
```css
@media (min-width: 768px) {
  .zoom-overlay {
    position: absolute; /* Not sticky on desktop */
    bottom: 0;
    /* User scrolls to see it, but it's there */
  }
}
```

**Proper (HTML refactor):**
- Move zoom-overlay outside chart-container-wrapper
- Make it sibling of chart-container-wrapper
- Both inside echarts-layout
- Can then use overflow: hidden safely

---

**Research complete!** 🔍

**The issue:** overflow-y: visible with max-height: 100% still allows sticky zoom to position outside widget bounds on desktop (large padding + reserves push it below).

**Why mobile works:** Less padding/reserves, stays within bounds.

**Fix options:**
1. Change zoom to position: absolute (lose sticky)
2. Move zoom in HTML structure (requires refactor)
3. Hybrid: fixed on mobile, absolute on desktop

**Which approach would you like me to implement?**
