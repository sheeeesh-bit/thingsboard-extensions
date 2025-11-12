# Marker System - User Guide

The ECharts Line Chart widget now includes a comprehensive marker system that allows you to place custom markers on the chart via right-click context menu.

---

## Features

✅ **Right-Click Context Menu** - Place markers anywhere on the chart
✅ **Multi-Grid Support** - Automatically detects which subplot was clicked
✅ **Custom Names & Colors** - Name and color each marker
✅ **Local Storage** - Markers persist across sessions
✅ **Marker Management** - View, edit, and delete markers
✅ **Visual Integration** - Markers appear as vertical lines on the chart

---

## How to Use

### 1. Add a Marker

1. **Right-click** anywhere on the chart
2. Select **"Add Marker"** from the context menu
3. Enter a **name** for the marker (e.g., "Event Start", "Peak", "Alert")
4. Enter a **color** in hex format (e.g., `#ff3b30` for red)
5. The marker will appear as a **vertical line** on the chart

### 2. View Markers

1. **Right-click** on the chart
2. Select **"Manage Markers (X)"** to see all markers
3. A list shows all markers with:
   - Name
   - Plot/Grid location
   - Timestamp

### 3. Delete a Marker

Currently uses the `deleteMarker(markerId)` method (UI can be added later).

---

## Technical Details

### Marker Data Structure

```typescript
{
  id: string;           // Unique identifier
  name: string;         // User-provided name
  timestamp: number;    // X-axis position (milliseconds)
  gridIndex: number;    // Which subplot (0=Top, 1=Middle, 2=Bottom, etc.)
  color: string;        // Hex color (e.g., '#ff3b30')
  plotName: string;     // Plot name (e.g., 'Top', 'Middle', 'Bottom')
}
```

### Storage

**Location:** Browser localStorage
**Key:** `echarts-markers-{stateId}`
**Format:** JSON array of marker objects
**Persistence:** Survives page refresh, dashboard navigation

### Visualization

Markers are rendered as **ECharts markLine** series:
- **Type:** Vertical line spanning full Y-axis
- **Style:** Solid line, 2px width
- **Label:** Shows marker name at top
- **Color:** User-defined
- **Z-Index:** 100 (above data lines)

---

## Implementation Details

### Context Menu

**Trigger:** Right-click anywhere on chart
**Features:**
- Prevents default browser context menu
- Shows at click position
- Auto-detects clicked grid/plot
- Closes when clicking outside

### Grid Detection

The system automatically determines which subplot was clicked by:
1. Getting click Y-position in pixels
2. Calculating each grid's top/bottom boundaries
3. Matching click position to grid
4. Storing grid index and plot name

### Local Storage

**Save Operations:**
- After adding a marker
- After deleting a marker
- Automatic JSON serialization

**Load Operations:**
- On component initialization (`ngOnInit`)
- Automatic JSON parsing
- Error handling for corrupted data

---

## Code Locations

### Main Component
`src/app/components/widgets/echarts-line-chart/echarts-line-chart.component.ts`

**Marker Properties (Lines 140-157):**
```typescript
public markers: Array<{...}>
public contextMenuVisible: boolean
public contextMenuPosition: { x, y }
private pendingMarkerData: {...}
```

**Marker Methods (Lines 7534-7777):**
- `setupContextMenu()` - Initialize right-click handler
- `getGridIndexAtPosition(y)` - Detect clicked grid
- `addMarkerAtPosition()` - Create new marker
- `showMarkersList()` - Display marker list
- `saveMarkersToLocalStorage()` - Persist markers
- `loadMarkersFromLocalStorage()` - Restore markers
- `deleteMarker(id)` - Remove marker
- `addMarkers(options)` - Render markers in ECharts

### Template
`src/app/components/widgets/echarts-line-chart/echarts-line-chart.component.html`

**Context Menu (Lines 263-277):**
```html
<div class="context-menu" #contextMenu
     [class.visible]="contextMenuVisible">
  <div class="context-menu-item" (click)="addMarkerAtPosition()">
    Add Marker
  </div>
  <div class="context-menu-item" (click)="showMarkersList()">
    Manage Markers
  </div>
</div>
```

### Styles
`src/app/components/widgets/echarts-line-chart/echarts-line-chart.component.scss`

**Context Menu Styles (Lines 1693-1749):**
- Apple-style design
- Backdrop blur effect
- Smooth animations
- Hover states

---

## Future Enhancements

### Planned Features

1. **Material Dialog** - Replace prompt/alert with proper dialogs
2. **Marker List UI** - Dedicated panel for managing markers
3. **Drag to Move** - Reposition markers by dragging
4. **Marker Types** - Support different marker shapes (line, point, area)
5. **Color Picker** - Visual color selection instead of hex input
6. **Export/Import** - Save markers to file
7. **Shared Markers** - Save to ThingsBoard attributes for team sharing

### Enhancement Ideas

- [ ] Click marker to edit name/color
- [ ] Double-click to delete marker
- [ ] Snap to nearest data point
- [ ] Add marker notes/descriptions
- [ ] Marker categories/groups
- [ ] Show/hide all markers toggle
- [ ] Marker templates (predefined colors/names)

---

## Example Usage

### Adding Event Markers

```typescript
// User right-clicks at 14:30:00 on Top plot
// Context menu appears
// User selects "Add Marker"
// Enters name: "Event Start"
// Enters color: #ff3b30
// Marker appears as vertical red line at 14:30:00
```

### Marker List

```
Current markers (3):

1. Event Start - Top - 10/20/2025, 2:30:00 PM
2. Peak Load - Middle - 10/20/2025, 3:15:00 PM
3. Alert Triggered - Bottom - 10/20/2025, 4:00:00 PM
```

---

## Troubleshooting

### Marker Not Appearing

**Check:**
- ✓ Marker was saved (check console for `[MARKER] Added marker:`)
- ✓ Chart re-rendered after adding marker
- ✓ Marker timestamp is within visible time range
- ✓ Grid index is valid

### Markers Not Persisting

**Check:**
- ✓ localStorage is enabled in browser
- ✓ Widget ID is consistent (same state/dashboard)
- ✓ No private browsing mode

### Context Menu Not Showing

**Check:**
- ✓ Right-click on chart area (not on UI elements)
- ✓ Chart is fully initialized
- ✓ No JavaScript errors in console

---

## API Reference

### Public Methods

```typescript
// Add marker at pending position
addMarkerAtPosition(): void

// Show markers management list
showMarkersList(): void

// Delete marker by ID
deleteMarker(markerId: string): void
```

### Private Methods

```typescript
// Setup context menu event listeners
setupContextMenu(): void

// Detect grid at Y position
getGridIndexAtPosition(y: number): number

// Save markers to localStorage
saveMarkersToLocalStorage(): void

// Load markers from localStorage
loadMarkersFromLocalStorage(): void

// Add markers to ECharts options
addMarkers(options: any): void
```

---

## Console Logging

Enable debug output to see marker operations:

```typescript
// Widget settings
debugOutput: true
```

**Console Output:**
```
[MARKER] Loaded 3 markers from localStorage
[MARKER] Added marker: { id: '...', name: 'Event Start', ... }
[MARKER] Saved 4 markers to localStorage
[MARKER] Added 4 markers to chart
[MARKER] Deleted marker: marker_1234567890_abc123
```

---

**Happy Marking! 📍**
