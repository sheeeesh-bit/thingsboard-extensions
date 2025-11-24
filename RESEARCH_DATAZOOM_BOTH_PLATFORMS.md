# 🔍 Research: DataZoom Hidden on BOTH Desktop & Mobile

Investigation reveals the datazoom visibility issue affects both platforms due to a recent CSS change.

---

## 🎯 The Smoking Gun

### What I Just Added (For Width Fix)

**File:** `echarts-line-chart.component.scss`
**Line:** 870

```css
.chart-container-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  height: 100%;
  width: 100%;
  max-width: 100%;
  min-height: 0;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden; /* ← THIS IS THE PROBLEM! */
}
```

---

## 🐛 Why This Breaks Sticky Positioning

### CSS Behavior: Overflow + Sticky = Broken

**The Rule:**
> When a parent has `overflow: hidden`, sticky children get clipped and can't "stick" properly.

**Our Structure:**
```html
<div class="chart-container-wrapper">  <!-- overflow: hidden ❌ -->
  <nav class="legend-overlay">...</nav>  <!-- position: sticky (works) -->
  <div class="chart-outer">...</div>
  <div class="zoom-overlay">...</div>   <!-- position: sticky (BROKEN!) -->
</div>
```

**What happens:**
1. `zoom-overlay` has `position: sticky; bottom: 0`
2. Parent has `overflow: hidden`
3. Sticky positioning requires overflow: visible or auto on ancestors
4. With overflow: hidden, sticky element gets clipped
5. Zoom controls disappear!

---

## 📊 Why It Affects Both Platforms

### Desktop

**Before my width fix:**
- No `overflow: hidden` on chart-container-wrapper
- Zoom sticky works ✓

**After my width fix:**
- Added `overflow: hidden` to prevent width expansion
- Zoom sticky broken ❌

### Mobile

**Same issue:**
- Added `overflow: hidden` for width constraint
- Zoom sticky broken ❌
- Combined with paddingBottom: 0px makes it worse

---

## 💡 The Conflict

### Two Competing Needs

**Need #1: Prevent Width Expansion**
```css
.chart-container-wrapper {
  overflow: hidden; /* Prevents horizontal overflow */
}
```

**Need #2: Sticky Zoom Controls**
```css
.zoom-overlay {
  position: sticky;
  bottom: 0; /* Needs overflow: visible on parent! */
}
```

**Problem:** Can't have both with current structure!

---

## ✅ Solutions (NOT IMPLEMENTED - Research Only)

### Option 1: Change Overflow to Overflow-X Only ⭐ RECOMMENDED

```css
.chart-container-wrapper {
  overflow-x: hidden; /* Prevent horizontal expansion */
  overflow-y: visible; /* Allow sticky to work */
}
```

**Pros:**
- ✅ Prevents horizontal scroll (fixes width)
- ✅ Allows sticky zoom to work
- ✅ Simple one-line change
- ✅ Works on both platforms

**Cons:**
- ⚠️ Might allow vertical overflow (probably fine since chart-outer handles vertical scroll)

---

### Option 2: Move Zoom Outside chart-container-wrapper

**Restructure HTML:**
```html
<div class="chart-area">
  <div class="chart-container-wrapper">  <!-- overflow: hidden OK here -->
    <nav class="legend-overlay">...</nav>
    <div class="chart-outer">...</div>
  </div>
  <div class="zoom-overlay">...</div>  <!-- Outside, no clipping -->
</div>
```

**Pros:**
- ✅ Zoom not affected by parent overflow
- ✅ Clean separation

**Cons:**
- ❌ Requires HTML restructuring
- ❌ More complex change
- ❌ Might affect layout calculations

---

### Option 3: Use Position: Fixed for Zoom on Mobile

```css
@media (max-width: 767px) {
  .zoom-overlay {
    position: fixed; /* Not sticky */
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 150;
  }
}
```

**Pros:**
- ✅ Works on mobile regardless of parent overflow
- ✅ Always visible

**Cons:**
- ❌ Different positioning strategy desktop vs mobile
- ❌ Doesn't solve desktop issue
- ❌ Fixed position has different scroll behavior

---

### Option 4: Remove Overflow: Hidden, Use Different Width Strategy

**Instead of overflow:**
```css
.chart-container-wrapper {
  /* overflow: hidden; ← Remove this */
  max-width: 100%; /* Keep this */
}

#echartContainer {
  max-width: 100% !important; /* Stronger constraint */
  overflow-x: hidden !important; /* Hide overflow on chart itself */
}
```

**Pros:**
- ✅ Allows sticky to work
- ✅ Constraints chart width directly

**Cons:**
- ⚠️ Might not prevent all expansion scenarios

---

## 📐 Technical Deep Dive

### Why Overflow: Hidden Clips Sticky

**CSS Specification:**
> "Sticky positioning is similar to relative positioning except the offsets are automatically calculated in reference to the nearest scrolling ancestor."

> "If any ancestor has `overflow: hidden`, `overflow: scroll`, or `overflow: auto`, sticky positioning is disabled."

**Our case:**
```css
.chart-container-wrapper {
  overflow: hidden; /* Creates clipping context */
}

.zoom-overlay {
  position: sticky; /* Tries to stick */
  bottom: 0; /* Can't stick - parent clips! */
}
```

**Result:** Sticky is disabled, zoom behaves like regular positioned element

---

## 🎯 Diagnosis Summary

### The Problem (Both Platforms)

**Cause:**
```css
.chart-container-wrapper {
  overflow: hidden; /* ← Added to fix width expansion */
}
```

**Effect:**
- Clips sticky zoom-overlay
- Zoom doesn't stay at bottom
- Goes under chart content when scrolling
- Happens on desktop AND mobile

**When it happens:**
- After data loads (when scrolling is possible)
- When user scrolls chart
- Zoom element gets clipped by parent overflow
- z-index doesn't matter (it's clipped, not layered wrong)

---

## ✅ Recommended Fix

**Option 1 is best:** Change to overflow-x only

```css
.chart-container-wrapper {
  overflow-x: hidden; /* Prevent horizontal only */
  overflow-y: visible; /* Allow sticky to work */
  /* Remove: overflow: hidden */
}
```

**Why:**
- ✅ Fixes datazoom on both platforms
- ✅ Still prevents horizontal scroll
- ✅ Simple one-property change
- ✅ No HTML restructuring needed
- ✅ Minimal side effects

**Side note:** Also need to ensure `#echartContainer` has its own overflow-x constraint for belt-and-suspenders approach.

---

## 📊 Before/After (Predicted)

### Before Fix

**Both platforms:**
```
User scrolls chart
  ↓
Zoom-overlay tries to stick at bottom
  ↓
Parent has overflow: hidden
  ↓
Sticky positioning disabled/clipped
  ↓
Zoom goes under chart ❌
```

### After Fix (Option 1)

**Both platforms:**
```
User scrolls chart
  ↓
Zoom-overlay sticks at bottom
  ↓
Parent has overflow-x: hidden, overflow-y: visible
  ↓
Sticky positioning works
  ↓
Zoom stays visible ✓
```

---

**Diagnosis complete!** 🔍

**The issue:** `overflow: hidden` on `.chart-container-wrapper` (line 870) clips the sticky zoom overlay on **both** desktop and mobile.

**The fix:** Change `overflow: hidden` to `overflow-x: hidden; overflow-y: visible`

**Would you like me to implement this fix?**
