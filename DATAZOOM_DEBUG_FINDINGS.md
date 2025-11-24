# 🔍 DataZoom Debug Findings

## Current Situation

**User Report:** DataZoom not showing on initial load, but appears after settings change

**My Investigation:**

### Uncommitted Changes vs HEAD

The current working directory has **uncommitted changes** that differ from the last commit (HEAD: 7b920a9).

### Key Differences Found

**1. HTML Template - *ngIf Condition**

**HEAD (Last Commit):**
```html
<div class="zoom-overlay" #zoomOverlay *ngIf="ctx.settings.showZoomControls !== false">
```

**Working Directory (Uncommitted):**
```html
<div class="zoom-overlay" #zoomOverlay *ngIf="shouldShowDataZoom()">
```

**2. HTML Template - Layout Structure**

**HEAD:** zoom-overlay is INSIDE chart-container-wrapper
**Working Directory:** zoom-overlay MOVED OUTSIDE as sibling (flex layout change)

**3. TypeScript - Added updateZoomOverlay() Call**

**Added in onDataUpdated() (line ~1394-1401):**
```typescript
if (this.shouldShowDataZoom()) {
  setTimeout(() => {
    this.updateZoomOverlay();
  }, 50);
}
```

## Questions for User

1. **Which commit was working?**
   - HEAD (7b920a9 - last commit)?
   - An earlier commit?
   - Which commit hash showed working datazoom?

2. **Which version should I compare against?**
   - Should I compare current working directory against HEAD?
   - Or against a specific earlier commit?

3. **What changed that broke it?**
   - Was it working in HEAD and broken in working directory?
   - Or was it broken in HEAD and still broken after my changes?

## Hypothesis

Based on the markdown files in the repo (DATAZOOM_*.md), it appears there have been **multiple attempts** to fix the datazoom, including:

- DATAZOOM_INITIALIZATION_FIX.md
- DATAZOOM_COMPLETE_FIX.md
- DATAZOOM_STICKY_FIX.md
- DATAZOOM_DESKTOP_FIX.md
- DATAZOOM_VISIBILITY_RESEARCH.md
- etc.

This suggests the datazoom has been problematic for a while.

## Possible Issues

### Issue 1: Template Method Call
```html
*ngIf="shouldShowDataZoom()"
```

This calls a method on every change detection cycle. Could be:
- Method not defined or returning false
- Change detection issues
- Performance problems

### Issue 2: Layout Change
Moving zoom-overlay outside chart-container-wrapper might have:
- Broken CSS positioning
- Changed flex layout behavior
- Hidden element outside viewport

### Issue 3: Timing
The new updateZoomOverlay() call in onDataUpdated() might be:
- Called too early
- Called before element rendered
- Conflicting with other zoom updates

## Next Steps

**Need from user:**
1. Confirm which commit was the last working version
2. Check browser console for JavaScript errors
3. Check if `ctx.settings.showZoomControls` is set

**My action plan:**
1. Compare specific working commit vs current
2. Identify exact breaking change
3. Apply minimal fix to restore functionality
4. Test on localhost:5000
