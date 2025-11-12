# Marker Management Dialog - User Guide

A dedicated Material Dialog for managing chart markers with search, selection, and bulk delete capabilities.

---

## ✨ Features

✅ **Search Functionality** - Filter markers by name, plot, or timestamp
✅ **Individual Delete** - Delete markers one at a time
✅ **Multi-Select Delete** - Select multiple markers and delete at once
✅ **Clear All** - Remove all markers with one click
✅ **Real-time Search** - Instant filtering as you type
✅ **Apple Design** - Beautiful, modern UI matching widget style
✅ **Responsive** - Works on mobile and desktop

---

## 🚀 How to Access

### Method 1: Toolbar Button
- Click the **📍 location_on** button in the top toolbar
- Badge shows current marker count

### Method 2: Context Menu
- Right-click anywhere on chart
- Select **"Manage Markers (X)"**

### Method 3: Programmatically
```typescript
this.showMarkersList();
```

---

## 📋 Dialog Features

### Header Section
- **Icon:** Location pin with gradient background
- **Title:** "Manage Markers"
- **Subtitle:** Total marker count
- **Close button:** X button (top-right)

### Search Bar
- **Placeholder:** "Search markers by name, plot, or time..."
- **Real-time filtering:** Updates as you type
- **Clear button:** X appears when text is entered
- **Searches:** Name, plot name, timestamp

### Markers List
- **Scrollable:** Supports any number of markers
- **Color indicator:** Vertical bar shows marker color
- **Marker info:**
  - Name (large text)
  - Plot badge (e.g., "Top", "Middle")
  - Timestamp (formatted local time)
- **Actions:**
  - Select checkbox (for bulk delete)
  - Delete button (individual delete)

### Footer Actions
- **Clear All** - Delete all markers (confirmation required)
- **Delete Selected (X)** - Delete selected markers (only shown when items selected)
- **Close** - Close dialog without changes

---

## 🎯 Usage Examples

### Search for Markers

**Example 1: Search by name**
```
Search: "peak"
Results: "Peak Load", "Peak Event"
```

**Example 2: Search by plot**
```
Search: "middle"
Results: All markers on Middle plot
```

**Example 3: Search by time**
```
Search: "14:30"
Results: Markers at 2:30 PM
```

### Delete Single Marker

1. Find marker in list
2. Click **🗑️ delete** button on the right
3. Confirm deletion
4. Marker removed from chart

### Delete Multiple Markers

1. Click **○ select** button on markers you want to delete
2. Selected markers show red border
3. Click **"Delete Selected (X)"** at bottom
4. Confirm deletion
5. All selected markers removed

### Clear All Markers

1. Click **"Clear All"** button at bottom left
2. Confirm deletion
3. All markers removed from chart

---

## 🎨 Visual Design

### Color Scheme
- **Background:** White with gradient header
- **Accent:** Apple blue (#007aff)
- **Danger:** Apple red (#ff3b30)
- **Text:** Dark gray (#1d1d1f)
- **Secondary:** Light gray (#86868b)

### Animations
- **Slide-in:** Markers animate in from top
- **Hover effects:** Smooth background changes
- **Scale effects:** Buttons scale on click
- **Smooth transitions:** All state changes animated

### Components
- **Header:** Gradient background with icon
- **Search:** Rounded pill with blur effect
- **Marker items:** Rounded cards with hover lift
- **Buttons:** Apple-style with shadows

---

## 📁 Implementation Files

### Dialog Component
**Location:** `src/app/components/widgets/echarts-line-chart/marker-dialog/`

**Files Created:**
1. `marker-management-dialog.component.ts` (130 lines)
   - Search logic
   - Selection handling
   - Delete operations
   - Dialog result handling

2. `marker-management-dialog.component.html` (105 lines)
   - Header with icon
   - Search input
   - Scrollable marker list
   - Footer actions

3. `marker-management-dialog.component.scss` (300+ lines)
   - Apple-style design
   - Responsive layout
   - Animations
   - Custom scrollbar

### Integration Points

**Main Component Updates:**
- Import dialog component
- Open dialog with markers data
- Handle dialog result
- Delete markers on confirmation

**Module Registration:**
- Added to `widgets.module.ts` declarations
- MatDialogModule already imported

**Toolbar Integration:**
- New button with location_on icon
- Badge shows marker count
- Opens dialog on click

---

## 🔧 Technical Details

### Dialog Data Interface

```typescript
interface MarkerDialogData {
  markers: MarkerData[];
}

interface MarkerData {
  id: string;
  name: string;
  timestamp: number;
  gridIndex: number;
  color: string;
  plotName: string;
}
```

### Dialog Result

```typescript
{
  action: 'delete' | 'deleteAll';
  markerIds?: string[];  // For delete action
}
```

### Component Methods

**Public Methods:**
- `filterMarkers()` - Filter by search text
- `formatTimestamp(timestamp)` - Format for display
- `toggleMarkerForDeletion(id)` - Toggle selection
- `isMarkedForDeletion(id)` - Check if selected
- `deleteSelectedMarkers()` - Delete all selected
- `deleteMarker(id)` - Delete single marker
- `clearAllMarkers()` - Delete all markers
- `close()` - Close without changes

---

## 🎮 User Interactions

### Search Workflow
```
1. User opens dialog
2. Types in search box: "peak"
3. List filters in real-time
4. Shows only matching markers
5. Clear button (X) appears
6. Click X to reset search
```

### Delete Workflow (Single)
```
1. User finds marker
2. Clicks delete button (🗑️)
3. Confirms deletion
4. Dialog closes
5. Marker removed from chart
6. Chart re-renders
```

### Delete Workflow (Multiple)
```
1. User clicks select (○) on marker 1
2. Marker shows red border
3. Clicks select on marker 2
4. Footer shows "Delete Selected (2)"
5. Clicks "Delete Selected"
6. Confirms deletion
7. Dialog closes
8. Both markers removed
9. Chart re-renders
```

---

## 📊 Features Comparison

### Before (Alert)
❌ Plain text list
❌ No search
❌ No individual delete
❌ Hard to read
❌ Basic functionality

### After (Material Dialog)
✅ Beautiful UI
✅ Real-time search
✅ Individual & bulk delete
✅ Easy to navigate
✅ Professional appearance
✅ Responsive design
✅ Keyboard accessible

---

## 🔮 Future Enhancements

Potential improvements:

- [ ] Edit marker (click to edit name/color)
- [ ] Sort markers (by time, name, plot)
- [ ] Filter by plot (dropdown)
- [ ] Marker preview on hover
- [ ] Jump to marker on chart
- [ ] Export markers to JSON
- [ ] Import markers from JSON
- [ ] Share markers between users
- [ ] Marker templates/presets

---

## 🐛 Troubleshooting

### Dialog Not Opening

**Check:**
- ✓ MatDialogModule imported in widgets.module.ts
- ✓ MarkerManagementDialogComponent declared in module
- ✓ No console errors
- ✓ Dialog service injected in constructor

### Search Not Working

**Check:**
- ✓ FormsModule imported (for [(ngModel)])
- ✓ searchText property bound correctly
- ✓ filterMarkers() called on input event

### Markers Not Deleting

**Check:**
- ✓ Dialog result returned correctly
- ✓ deleteMarker() method called
- ✓ onDataUpdated() called after delete
- ✓ localStorage updated

---

## 💻 Code Examples

### Opening Dialog

```typescript
public showMarkersList(): void {
  const dialogRef = this.dialog.open(MarkerManagementDialogComponent, {
    width: '600px',
    data: { markers: this.markers }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result?.action === 'delete') {
      result.markerIds.forEach(id => this.deleteMarker(id));
    }
  });
}
```

### Handling Dialog Result

```typescript
// Delete multiple markers
if (result.action === 'delete' && result.markerIds) {
  result.markerIds.forEach((id: string) => this.deleteMarker(id));
}

// Clear all markers
if (result.action === 'deleteAll') {
  this.markers = [];
  this.saveMarkersToLocalStorage();
  this.onDataUpdated();
}
```

---

## 📱 Responsive Design

### Desktop (> 600px)
- Width: 600px
- Two-column footer
- Full search bar

### Mobile (≤ 600px)
- Width: 100vw
- Stacked footer buttons
- Compact search
- No border radius

---

## ♿ Accessibility

✅ **Keyboard Navigation** - Tab through all controls
✅ **Screen Reader** - ARIA labels on actions
✅ **Focus Indicators** - Visible focus states
✅ **Tooltips** - Hover help text
✅ **Contrast** - WCAG AA compliant colors

---

**Enjoy the enhanced marker management! 📍**
