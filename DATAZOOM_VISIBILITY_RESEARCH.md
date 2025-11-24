# 🔍 Research: DataZoom Going Under Chart

Investigation into why the zoom controls sometimes become invisible by going under the chart content.

---

## 🎯 The Problem

**User Experience:**
- DataZoom controls visible initially ✓
- After scrolling or data loading
- DataZoom goes under the chart ❌
- Controls become invisible/inaccessible

---

## 🔬 Root Cause Analysis

### HTML Structure

```html
<div class="chart-container-wrapper">
  <nav class="legend-overlay">...</nav>        <!-- Sticky top -->

  <div class="chart-outer">                    <!-- Scrollable -->
    <div id="echartContainer">                 <!-- Chart canvas -->
      <!-- Chart plots here -->
    </div>
  </div>

  <div class="zoom-overlay">...</div>          <!-- Sticky bottom -->
</div>
```

**Key relationships:**
- `chart-outer` and `zoom-overlay` are **siblings**
- Both inside `chart-container-wrapper`
- `zoom-overlay` has `position: sticky; bottom: 0;`

---

### CSS Positioning

**Zoom Overlay (Line 1009-1025):**
```css
.zoom-overlay {
  position: sticky;    /* Sticks to bottom */
  bottom: 0;           /* At bottom of parent */
  z-index: 100;        /* Above chart */
  flex-shrink: 0;      /* Maintains size */
}
```

**Chart Outer (chart-outer):**
```css
.chart-outer {
  position: relative;
  overflow-y: auto;    /* Scrollable */
  flex: 1;             /* Fills available space */
}
```

---

### The Critical Issue: Padding-Bottom

**TypeScript - applyScrollableHeight() (Line 1486):**
```typescript
// Remove bottom padding on mobile completely
outer.style.paddingBottom = this.isMobileDevice ? '0px' : `${zoomH}px`;
```

**What this does:**

**Desktop:**
```
chart-outer:
  paddingBottom: 30px (zoomH)

Effect: 30px gap between chart content and zoom overlay
Result: Chart content stops before zoom ✓
```

**Mobile:**
```
chart-outer:
  paddingBottom: 0px

Effect: NO gap between chart content and zoom overlay
Result: Chart content can extend right to bottom ❌
```

---

## 🐛 Why Zoom Goes Under Chart

### The Sequence

**1. Initial State:**
```
┌──────────────────┐
│ Legend (sticky)  │
├──────────────────┤
│                  │
│ Chart Content    │
│                  │
├──────────────────┤ ← paddingBottom: 0px (NO GAP)
│ Zoom (sticky)    │ ← z-index: 100
└──────────────────┘
```

**2. User Scrolls Down:**
```
┌──────────────────┐
│ Legend (sticky)  │ ← Stays at top
├──────────────────┤
│                  │
│ Chart scrolls... │
│                  │
│ More content...  │
│                  │ ← Content extends to bottom
├══════════════════┤ ← NO PADDING!
│ Zoom (sticky)    │ ← Overlaps with content above!
└──────────────────┘
```

**Result:** Chart content and zoom controls occupy same space at bottom!

---

### Why Z-Index Doesn't Help

**Current z-index:**
```
zoom-overlay: z-index: 100
chart content: z-index: 1 (default)
```

**Expected:**
- Zoom should be ABOVE chart (higher z-index) ✓

**Problem:**
- Even with z-index, zoom is COVERING the chart content
- Chart content is BEHIND zoom (as intended)
- But user can't see bottom of chart because zoom covers it
- Not a z-index problem - it's a **spacing problem**

---

## 📊 Comparison: Desktop vs Mobile

### Desktop (Works Correctly)

```typescript
outer.style.paddingBottom = `${zoomH}px`; // e.g., 30px
```

**Layout:**
```
Chart content area
  ↓
  ↓ (scrollable)
  ↓
Last plot data
┌─ ─ ─ ─ ─ ─ ─ ─ ─ ┐ ← 30px padding (SPACE!)
│                   │
├═══════════════════┤
│ Zoom Controls     │ ← Sticky at bottom
└───────────────────┘
```

**Result:** Chart content stops 30px before zoom (visible gap)

### Mobile (Problem)

```typescript
outer.style.paddingBottom = '0px'; // NO PADDING
```

**Layout:**
```
Chart content area
  ↓
  ↓ (scrollable)
  ↓
Last plot data ───────┐ ← NO PADDING!
                      │
═══════════════════════ ← Zoom COVERS this area
Zoom Controls (sticky)
```

**Result:** Chart content extends right to zoom (no gap, overlap!)

---

## 🔍 Why Padding Was Removed

**Intention (from my mobile optimization):**
- Maximize vertical space on mobile
- Remove wasted padding
- Make plots larger

**Side effect:**
- Removed ALL bottom padding (set to 0px)
- No space reserved for zoom overlay
- Chart content can now go under zoom
- Zoom becomes invisible when scrolled

---

## 💡 The Solution (NOT IMPLEMENTED - Research Only)

### Option 1: Restore Minimal Padding on Mobile

```typescript
outer.style.paddingBottom = this.isMobileDevice ?
  `${Math.max(zoomH - 20, 10)}px` :  // Minimal padding (e.g., 10-20px)
  `${zoomH}px`;
```

**Effect:**
- Small gap between chart and zoom
- Zoom always visible
- Slight space trade-off

---

### Option 2: Increase Zoom Z-Index and Add Semi-Transparent Background

```css
.zoom-overlay {
  z-index: 150; /* Higher */
  background: rgba(255, 255, 255, 0.98); /* More opaque */
  backdrop-filter: blur(20px); /* Stronger blur */
}
```

**Effect:**
- Zoom more clearly visible above chart
- Blurred background separates it visually
- Chart content still underneath but blurred

---

### Option 3: Make Zoom Position: Fixed on Mobile

```css
@media (max-width: 767px) {
  .zoom-overlay {
    position: fixed; /* Instead of sticky */
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 150;
  }
}
```

**Effect:**
- Zoom fixed to screen bottom (not container)
- Always visible regardless of scroll
- Independent of chart-outer padding

---

### Option 4: Add Bottom Margin to Chart Content (ECharts Grid)

**In TypeScript getBottomReservePct():**
```typescript
if (this.isMobileDevice) {
  return this.pxToPct(40); // Increase from 20px to 40px
}
```

**Effect:**
- Chart grid has more bottom reserve
- Chart plots stop higher
- Natural gap before zoom
- No layout changes to containers

---

## 📐 Current State

### What's Set Now

**Padding:**
```typescript
outer.style.paddingBottom = this.isMobileDevice ? '0px' : `${zoomH}px`;
// Mobile: 0px (NO SPACE)
// Desktop: ~30px (SPACE)
```

**Grid Bottom Reserve:**
```typescript
if (this.isMobileDevice) {
  return this.pxToPct(20); // 20px reserve
}
// Very small reserve in grid
```

**Combined:**
- Outer padding: 0px
- Grid bottom: 20px (~3%)
- Total gap: Only 20px between chart data and zoom
- Not enough separation!

---

## 🎯 Recommended Solution

**Option 4 is best:** Increase grid bottom reserve on mobile

**Why:**
- Doesn't add container padding (keeps layout clean)
- Creates natural gap within chart
- Zoom stays sticky as designed
- Simple one-line fix
- No side effects

**Change needed:**
```typescript
// Line ~1585
if (this.isMobileDevice) {
  return this.pxToPct(20); // Change to 40 or 50
}
```

**Effect:**
- Chart plots have 40-50px bottom margin
- Zoom overlay has clear space above it
- Chart content never goes under zoom
- Visual separation

---

## 📊 Summary

### The Issue

**Cause:**
1. Mobile: `paddingBottom = 0px` (for max space)
2. Grid bottom reserve: Only 20px (~3%)
3. Total gap: ~20px between chart and zoom
4. When scrolling: Chart content can overlap zoom area
5. Zoom covers chart (z-index works but creates visual problem)

**Why it happens "sometimes":**
- Depends on data amount
- Depends on scroll position
- Depends on plot count
- More data = more overlap

### The Fix Needed

**Increase bottom reserve in grid configuration:**
```typescript
getBottomReservePct() {
  if (this.isMobileDevice) {
    return this.pxToPct(40); // Or 50px
  }
  // Desktop unchanged
}
```

**Result:**
- ✅ Chart plots stop earlier
- ✅ Natural gap before zoom
- ✅ Zoom always visible
- ✅ No overlap
- ✅ Clean layout maintained

---

**Diagnosis complete - solution identified but not implemented per your request!** 🔍

The issue is insufficient bottom spacing on mobile (0px padding + 20px grid reserve = zoom gets covered by chart content when scrolling).
