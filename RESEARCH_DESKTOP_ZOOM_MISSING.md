# 🔍 Research: Desktop Zoom Missing, Mobile Zoom Visible

Investigation into why the datazoom controls disappeared on desktop but are visible on mobile after the overflow fix.

---

## 🎯 The Situation

**After applying overflow-y: visible fix:**
- Mobile: Zoom controls visible ✓
- Desktop: Zoom controls NOT visible ❌

**This is backwards from the original issue!**

---

## 🔬 Root Cause Analysis

### The CSS Change I Made

```css
.chart-container-wrapper {
  overflow-x: hidden; /* Prevent horizontal expansion */
  overflow-y: visible; /* Allow sticky zoom to work */
}
```

**Intended effect:**
- Allow sticky positioning to work
- Prevent horizontal scroll

**Unintended effect on desktop:**
- Container can now overflow vertically
- Sticky element might position outside visible area

---

### Why Mobile Works But Desktop Doesn't

**Mobile:**
- `paddingBottom: 0px` on chart-outer
- Small bottom reserve (20px)
- Chart-container-wrapper height fits screen
- Zoom positioned at bottom of visible container
- **Works because container height is constrained**

**Desktop:**
- `paddingBottom: ${zoomH}px` (e.g., 30px) on chart-outer
- Large bottom reserve (150px for 1-3 grids)
- With `overflow-y: visible`, container can expand
- Total height might exceed viewport
- Zoom positioned at "bottom" of expanded container
- **Zoom might be below visible screen!**

---

## 📊 The Problem Scenario (Desktop)

### Without overflow-y: visible (Original)

```
chart-container-wrapper (height: 100%)
├─ legend-overlay (sticky top)
├─ chart-outer (flex: 1, paddingBottom: 30px)
│  └─ content (fits in 100% - 30px)
└─ zoom-overlay (sticky bottom: 0)
   └─ Positioned at bottom of container ✓
```

**Result:** Zoom visible at bottom of viewport

### With overflow-y: visible (My Fix)

```
chart-container-wrapper (height: 100%, overflow-y: visible)
├─ legend-overlay (sticky top)
├─ chart-outer (flex: 1, paddingBottom: 30px)
│  └─ content (wants more space)
│  └─ Extra space from padding
└─ zoom-overlay (sticky bottom: 0)
   └─ Positioned at bottom of EXPANDED container
   └─ Might be BELOW viewport ❌
```

**Result:** Zoom might be positioned below visible screen

---

## 💡 Why This Happens

### Flexbox + Overflow: Visible Interaction

**With overflow: hidden:**
- Container height: 100% (constrained)
- Content clipped if exceeds
- Zoom always at bottom of 100% height

**With overflow-y: visible:**
- Container height: 100% (but can overflow)
- Content can push container taller
- Zoom at bottom of actual (overflowed) height
- If container > viewport, zoom below fold

**Desktop has:**
- More padding (30px)
- Larger grid reserves (150px)
- Total content height might exceed viewport
- With visible overflow, container expands
- Zoom goes below screen

**Mobile has:**
- No padding (0px)
- Small reserves (20px)
- Content fits in viewport
- Container doesn't expand much
- Zoom stays visible

---

## ✅ Solutions (NOT IMPLEMENTED - Research Only)

### Option 1: Restore overflow: hidden, Fix Width Differently

**Instead of overflow for width:**
```css
.chart-container-wrapper {
  overflow: hidden; /* Keep original */
  /* Don't rely on this for width constraint */
}

/* Rely on max-width cascade instead */
.chart-outer,
#echartContainer {
  max-width: 100% !important;
  overflow-x: hidden !important;
}
```

**Pros:**
- Zoom sticky works (revert to working state)
- Width constrained at child level

**Cons:**
- Previous sticky issue returns?

---

### Option 2: Add max-height to chart-container-wrapper

```css
.chart-container-wrapper {
  overflow-x: hidden;
  overflow-y: visible;
  max-height: 100%; /* Constrain vertical expansion */
}
```

**Pros:**
- Prevents container from expanding taller than parent
- Zoom stays within bounds

**Cons:**
- Might clip content if it tries to exceed

---

### Option 3: Change Zoom to Position: Fixed

```css
.zoom-overlay {
  position: fixed; /* Not sticky */
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 150;
}
```

**Pros:**
- Always visible (fixed to viewport)
- Not affected by parent overflow

**Cons:**
- Different positioning model
- Might not align with chart margins
- Need to handle responsiveness differently

---

### Option 4: Hybrid Approach - overflow-y Based on Platform

```css
.chart-container-wrapper {
  overflow-x: hidden;
  overflow-y: hidden; /* Desktop default */
}

@media (max-width: 767px) {
  .chart-container-wrapper {
    overflow-y: visible; /* Mobile only */
  }
}
```

**Pros:**
- Desktop keeps working state
- Mobile gets fix for sticky

**Cons:**
- Different behavior per platform
- Doesn't solve underlying issue

---

## 🎯 The Real Issue

### Competing Requirements

**Need:**
1. Prevent width expansion (requires overflow-x: hidden) ✓
2. Allow sticky zoom (requires overflow-y: visible) ✓
3. Keep zoom visible in viewport (requires constrained height) ❌

**Current state:**
- ✓ Width constrained
- ✓ Sticky works
- ❌ Desktop zoom below viewport

**Missing:**
- Container height constraint with overflow-y: visible
- Either max-height or different overflow strategy needed

---

## 📊 Diagnosis: Why Different Platforms

### Mobile (Works)

```
Container: height: 100dvh
Padding: 0px
Reserve: 20px
Content fits: Yes
Zoom position: Bottom of 100dvh (visible) ✓
```

### Desktop (Broken)

```
Container: height: 100%
Padding: 30px
Reserve: 150px
Content + padding: Might exceed viewport
Zoom position: Bottom of expanded container (below screen) ❌
```

---

## ✅ Recommended Solution

**Option 2 + Safety:** Add max-height and constrain overflow better

```css
.chart-container-wrapper {
  overflow-x: hidden;
  overflow-y: visible; /* For sticky */
  max-height: 100%; /* Don't grow beyond parent */
  height: 100%;
}

.chart-outer {
  overflow-y: auto;
  overflow-x: hidden !important;
  max-height: 100%; /* Constrain scroll area */
}
```

**Why:**
- Prevents vertical expansion
- Allows sticky to work
- Zoom stays in viewport
- Works on both platforms

---

**Research complete!** 🔍

**The issue:** `overflow-y: visible` allows chart-container-wrapper to expand vertically on desktop, pushing zoom below viewport.

**Mobile works:** Because padding: 0 and small reserves keep container within bounds.

**Desktop fails:** Because padding: 30px and large reserves (150px) make container taller than viewport when overflow-y: visible.

**Fix needed:** Add `max-height: 100%` to chart-container-wrapper to prevent expansion while keeping overflow-y: visible for sticky.

**Should I implement this fix?**
