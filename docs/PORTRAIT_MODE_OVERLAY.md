# 📱 Portrait Mode Overlay - Landscape Optimization

The widget now includes an intelligent portrait mode overlay that guides mobile users to view the chart in landscape mode for the best experience.

---

## ✨ Features

✅ **Auto-Detection** - Automatically detects portrait orientation on mobile
✅ **Fullscreen Button** - Enter fullscreen with one tap
✅ **Landscape Lock** - Attempts to lock orientation to landscape
✅ **Dismissible** - User can continue in portrait if desired
✅ **Apple Design** - Beautiful frosted glass overlay
✅ **Animated Icon** - Rotating phone icon for visual cue
✅ **Smart Display** - Only shows on mobile in portrait mode

---

## 🎯 When It Appears

### Conditions (ALL must be true):

1. ✅ **Mobile Device** - Screen width < 768px
2. ✅ **Portrait Mode** - Height > Width
3. ✅ **Not Dismissed** - User hasn't clicked "Continue Anyway"
4. ✅ **Fullscreen Available** - Browser supports Fullscreen API

### When It Doesn't Appear:

- ❌ Desktop or tablet (width ≥768px)
- ❌ Already in landscape mode
- ❌ User dismissed it
- ❌ Fullscreen API not available

---

## 🚀 User Workflow

### Option 1: Enter Fullscreen (Recommended)

```
User opens widget in portrait mode
  ↓
Overlay appears with message
  ↓
User taps "View Fullscreen" button
  ↓
Device enters fullscreen mode
  ↓
Screen locks to landscape (if supported)
  ↓
Chart fills entire screen in landscape
  ↓
Overlay dismissed automatically
  ↓
Perfect chart viewing experience!
```

### Option 2: Continue in Portrait

```
User opens widget in portrait mode
  ↓
Overlay appears
  ↓
User taps "Continue Anyway"
  ↓
Overlay dismisses
  ↓
Chart visible in portrait (works but cramped)
```

### Option 3: Rotate Device

```
User opens widget in portrait
  ↓
Overlay appears
  ↓
User rotates device to landscape
  ↓
Overlay automatically disappears
  ↓
Chart visible in landscape
```

---

## 📱 Visual Design

### Overlay Layout

```
┌─────────────────────────────────┐
│                                 │
│    ┌─────────────────────┐     │
│    │   🔄 (rotating)     │     │
│    │  [Gradient Icon]    │     │
│    └─────────────────────┘     │
│                                 │
│   Better View in Landscape      │
│                                 │
│   This chart is optimized for   │
│   landscape viewing. Rotate     │
│   your device or enter          │
│   fullscreen mode.              │
│                                 │
│   ┌─────────────────────────┐  │
│   │ 🖼️ View Fullscreen     │  │
│   └─────────────────────────┘  │
│                                 │
│   ┌─────────────────────────┐  │
│   │   Continue Anyway       │  │
│   └─────────────────────────┘  │
│                                 │
└─────────────────────────────────┘
```

### Design Elements

**Background:**
- Frosted glass effect (98% white opacity)
- Backdrop blur (20px)
- Smooth fade-in animation

**Icon:**
- 80x80px gradient box
- Purple gradient (667eea → 764ba2)
- Rotating phone icon (screen_rotation)
- Subtle rotation animation (±15° every 2s)

**Typography:**
- Title: 22px, bold, dark (#1d1d1f)
- Description: 15px, regular, gray (#86868b)
- Buttons: 16px (primary), 14px (secondary)

**Buttons:**
- **Primary:** Blue (#007aff), raised, with shadow
- **Secondary:** Gray text, flat, subtle hover
- Both: Rounded corners, full-width
- Touch-friendly: 14px vertical padding

---

## 🔧 Technical Implementation

### Properties Added

```typescript
// Device detection
public isPortraitMode = false;           // Height > Width
public showPortraitOverlay = false;      // Calculated condition
public portraitOverlayDismissed = false; // User dismissed flag
private orientationListener: any;        // Event listener
```

### Methods Added

**1. Portrait Detection:**
```typescript
private detectDevice(): void {
  this.isPortraitMode = window.innerHeight > window.innerWidth;

  this.showPortraitOverlay = this.isMobileDevice &&
                              this.isPortraitMode &&
                              !this.portraitOverlayDismissed &&
                              this.isFullscreenAvailable();
}
```

**2. Fullscreen Check:**
```typescript
private isFullscreenAvailable(): boolean {
  const doc = document as any;
  return !!(doc.fullscreenEnabled ||
            doc.webkitFullscreenEnabled ||
            doc.mozFullScreenEnabled ||
            doc.msFullscreenEnabled);
}
```

**3. Enter Fullscreen:**
```typescript
public enterFullscreenLandscape(): void {
  const elem = document.documentElement;

  elem.requestFullscreen?.() ||
  elem.webkitRequestFullscreen?.() ||
  elem.mozRequestFullScreen?.() ||
  elem.msRequestFullscreen?.();

  // Lock to landscape
  screen.orientation?.lock('landscape');

  // Dismiss overlay
  this.portraitOverlayDismissed = true;
  this.showPortraitOverlay = false;

  // Resize chart
  setTimeout(() => this.chart?.resize(), 300);
}
```

**4. Lock Orientation:**
```typescript
private lockOrientationLandscape(): void {
  const screen = window.screen as any;

  if (screen.orientation?.lock) {
    screen.orientation.lock('landscape')
      .then(() => console.log('Locked to landscape'))
      .catch(err => console.warn('Cannot lock orientation:', err));
  }
}
```

**5. Dismiss Overlay:**
```typescript
public dismissPortraitOverlay(): void {
  this.portraitOverlayDismissed = true;
  this.showPortraitOverlay = false;
}
```

---

## 📐 Responsive Behavior

### Mobile Portrait (<768px, Height > Width)

**Shows:**
- ✅ Frosted glass overlay
- ✅ Rotating icon
- ✅ Explanatory message
- ✅ "View Fullscreen" button (blue)
- ✅ "Continue Anyway" button (gray)

**Z-Index:** 2000 (above everything)

### Mobile Landscape (<768px, Width > Height)

**Shows:**
- ✅ Normal chart (no overlay)
- ✅ Full functionality

### Tablet/Desktop (≥768px)

**Shows:**
- ✅ Normal chart (no overlay)
- ✅ Orientation doesn't matter

---

## 🎨 CSS Styling

### Overlay Container

```scss
.portrait-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  background: rgba(255, 255, 255, 0.98);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Icon Animation

```scss
.rotate-icon {
  animation: rotateIcon 2s ease-in-out infinite;
}

@keyframes rotateIcon {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-15deg); }
  75% { transform: rotate(15deg); }
}
```

### Content Animation

```scss
.portrait-content {
  animation: slideUpFadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes slideUpFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

---

## 🌐 Browser Compatibility

### Fullscreen API Support

| Browser | Support | Notes |
|---------|---------|-------|
| iOS Safari 16+ | ✅ Yes | Requires user gesture |
| iOS Chrome | ✅ Yes | Requires user gesture |
| Android Chrome | ✅ Yes | Full support |
| Android Firefox | ✅ Yes | Full support |
| Samsung Internet | ✅ Yes | Full support |

### Screen Orientation API Support

| Browser | Lock Support | Notes |
|---------|--------------|-------|
| iOS Safari | ❌ No | Fullscreen works, no lock |
| iOS Chrome | ❌ No | Fullscreen works, no lock |
| Android Chrome | ✅ Yes | Full support |
| Android Firefox | ✅ Yes | Full support |
| Samsung Internet | ✅ Yes | Full support |

**Graceful Degradation:**
- If orientation lock fails → Fullscreen still works
- User can manually rotate device
- Chart still functional in portrait if dismissed

---

## 🎮 User Experience

### iOS Behavior

**Portrait:**
```
1. Overlay appears
2. User taps "View Fullscreen"
3. iOS fullscreen mode activates
4. Overlay disappears
5. User must manually rotate to landscape
6. Chart fills screen
```

**Why no orientation lock?**
- iOS Safari doesn't support `screen.orientation.lock()`
- This is a Safari limitation, not a bug
- Users can still enjoy fullscreen and manually rotate

### Android Behavior

**Portrait:**
```
1. Overlay appears
2. User taps "View Fullscreen"
3. Fullscreen activates
4. Screen auto-rotates to landscape
5. Overlay disappears
6. Chart fills screen in landscape
```

**Full Support:**
- Android Chrome supports orientation lock
- Automatic rotation to landscape
- Best possible experience

---

## 🎯 Use Cases

### Scenario 1: Mobile User on Phone

```
User on iPhone in portrait mode
  ↓
Opens ThingsBoard dashboard
  ↓
Widget shows: "Better View in Landscape"
  ↓
User taps "View Fullscreen"
  ↓
Phone enters fullscreen
  ↓
User rotates phone to landscape
  ↓
Chart fills entire screen
  ↓
Perfect viewing experience!
```

### Scenario 2: User Prefers Portrait

```
User on Android phone in portrait
  ↓
Overlay appears
  ↓
User taps "Continue Anyway"
  ↓
Overlay dismissed (won't show again)
  ↓
Chart visible in portrait mode
  ↓
User continues using chart
```

### Scenario 3: Tablet User

```
User on iPad (768px+ width)
  ↓
No overlay shown (tablet size)
  ↓
Chart works in any orientation
  ↓
Full functionality available
```

---

## 💡 Implementation Details

### Detection Logic

```typescript
// Portrait detection
this.isPortraitMode = height > width;

// Show overlay if:
this.showPortraitOverlay =
  this.isMobileDevice &&           // Mobile only
  this.isPortraitMode &&           // Portrait only
  !this.portraitOverlayDismissed && // Not dismissed
  this.isFullscreenAvailable();    // Fullscreen works
```

### Fullscreen Request

```typescript
// Try all vendor prefixes
const promise = elem.requestFullscreen?.() ||
                elem.webkitRequestFullscreen?.() ||
                elem.mozRequestFullScreen?.() ||
                elem.msRequestFullscreen?.();

promise.then(() => {
  // Success - lock orientation
  screen.orientation?.lock('landscape');

  // Resize chart
  chart.resize();
});
```

### Orientation Lock

```typescript
// Try to lock to landscape
screen.orientation?.lock('landscape')
  .then(() => console.log('Locked to landscape'))
  .catch(err => console.warn('Cannot lock:', err));
```

**Fallback:**
- If lock fails, user can manually rotate
- Fullscreen still provides better experience
- No error shown to user

---

## 🎨 Visual States

### Initial State (Portrait)

**Appearance:**
- Frosted white overlay (98% opacity)
- Backdrop blur effect
- Centered content card
- Animated rotating icon
- Two action buttons

**Visibility:** Immediately on load (if conditions met)

### After "View Fullscreen"

**Sequence:**
1. Fullscreen API called
2. Orientation lock attempted
3. Overlay fades out
4. Chart resizes
5. Full-screen landscape view

**Duration:** ~300ms transition

### After "Continue Anyway"

**Sequence:**
1. Overlay fades out
2. Chart visible in portrait
3. Overlay won't show again (session)

**Duration:** Immediate

### After Rotation to Landscape

**Sequence:**
1. Orientation change detected
2. Overlay automatically hides
3. Chart adjusts to landscape
4. Normal functionality

---

## 🔧 Code Locations

### TypeScript (`echarts-line-chart.component.ts`)

**Properties (Lines 145-149):**
```typescript
public isPortraitMode = false;
public showPortraitOverlay = false;
public portraitOverlayDismissed = false;
private orientationListener: any;
```

**Detection (Lines 7591, 7598-7601):**
```typescript
this.isPortraitMode = height > width;
this.showPortraitOverlay = this.isMobileDevice &&
                            this.isPortraitMode &&
                            !this.portraitOverlayDismissed &&
                            this.isFullscreenAvailable();
```

**Methods (Lines 7643-7718):**
- `isFullscreenAvailable()` - Check browser support
- `enterFullscreenLandscape()` - Enter fullscreen + lock
- `lockOrientationLandscape()` - Lock to landscape
- `dismissPortraitOverlay()` - Dismiss without fullscreen

**Cleanup (Lines 971-973):**
```typescript
if (this.orientationListener) {
  window.removeEventListener('orientationchange', this.orientationListener);
}
```

### HTML (`echarts-line-chart.component.html`)

**Overlay (Lines 251-269):**
```html
<div class="portrait-overlay" *ngIf="showPortraitOverlay">
  <div class="portrait-content">
    <div class="rotate-icon">
      <i class="material-icons">screen_rotation</i>
    </div>
    <h3>Better View in Landscape</h3>
    <p>This chart is optimized for landscape viewing...</p>
    <div class="portrait-actions">
      <button (click)="enterFullscreenLandscape()">
        View Fullscreen
      </button>
      <button (click)="dismissPortraitOverlay()">
        Continue Anyway
      </button>
    </div>
  </div>
</div>
```

### SCSS (`echarts-line-chart.component.scss`)

**Styles (Lines 2108-2241):**
- Overlay container (134 lines)
- Icon with gradient
- Button styles
- Animations (rotate, slide-up, fade-in)

---

## 🧪 Testing Guide

### Test on Chrome DevTools

**1. Enable Device Mode:**
```
F12 → Toggle Device Mode (Ctrl+Shift+M)
Select: iPhone 14 Pro
Orientation: Portrait
```

**2. Open Widget:**
- Overlay should appear immediately
- Icon should rotate gently
- Both buttons visible

**3. Test "View Fullscreen":**
- Click button
- Browser enters fullscreen
- Overlay disappears
- Chart fills screen

**4. Exit Fullscreen:**
- Press Escape
- Fullscreen exits
- Overlay reappears (if still portrait)

**5. Test "Continue Anyway":**
- Click button
- Overlay disappears
- Chart visible in portrait
- Overlay doesn't reappear

**6. Test Rotation:**
- Rotate to landscape
- Overlay disappears
- Chart adjusts
- Rotate back to portrait
- Overlay reappears (if not dismissed)

### Test on Real Device

**iOS (iPhone):**
```
1. Open widget in Safari (portrait)
2. Overlay should show
3. Tap "View Fullscreen"
4. Fullscreen activates
5. Manually rotate to landscape
6. Perfect view!
```

**Android (Phone):**
```
1. Open widget in Chrome (portrait)
2. Overlay should show
3. Tap "View Fullscreen"
4. Fullscreen activates
5. Screen auto-rotates to landscape
6. Perfect view!
```

---

## ⚙️ Configuration

### Enable/Disable Portrait Overlay

**Currently:** Always enabled on mobile portrait

**Future Setting (if needed):**
```typescript
// In widget settings
showPortraitOverlay?: boolean;  // Default: true

// Usage
if (this.ctx.settings.showPortraitOverlay !== false) {
  // Show overlay logic
}
```

### Customization Options

**Potential Settings:**
- Message text
- Icon choice
- Auto-enter fullscreen (no button)
- Delay before showing (e.g., 2s)
- Remember dismissal permanently (localStorage)

---

## 🎯 Benefits

### For Users

✅ **Better Experience** - Chart designed for landscape
✅ **Clear Guidance** - Knows what to do
✅ **One-Tap Solution** - Easy fullscreen access
✅ **Flexibility** - Can dismiss if needed
✅ **Native Feel** - iOS/Android-style interactions

### For Charts

✅ **More Space** - Horizontal layout = more data visible
✅ **Better Readability** - Labels not cramped
✅ **Proper Aspect Ratio** - Time-series data is horizontal
✅ **Less Scrolling** - All plots visible at once

---

## 📊 Statistics

### Code Added

**TypeScript:**
- Portrait detection: ~10 lines
- Fullscreen logic: ~35 lines
- Orientation lock: ~15 lines
- Dismiss logic: ~5 lines
- **Total:** ~65 lines

**HTML:**
- Overlay component: ~18 lines

**SCSS:**
- Overlay styles: ~134 lines
- Animations: ~20 lines
- **Total:** ~154 lines

**Grand Total:** ~237 lines

---

## 🔮 Future Enhancements

### Potential Improvements

1. **Auto-fullscreen** - Enter automatically after 3s
2. **Swipe-down** - Exit fullscreen with gesture
3. **Remember Choice** - Save dismissal to localStorage
4. **Custom Message** - Configurable text
5. **Animation Options** - Different icon animations
6. **Tablet Support** - Optional for small tablets
7. **Video Tutorial** - Show rotating device animation

---

## 🐛 Troubleshooting

### Overlay Not Showing

**Check:**
- ✓ Device width < 768px
- ✓ Portrait mode (height > width)
- ✓ Not previously dismissed
- ✓ Fullscreen API available in browser

**Debug:**
```typescript
console.log('isMobileDevice:', this.isMobileDevice);
console.log('isPortraitMode:', this.isPortraitMode);
console.log('portraitOverlayDismissed:', this.portraitOverlayDismissed);
console.log('isFullscreenAvailable:', this.isFullscreenAvailable());
```

### Fullscreen Not Working

**Possible Causes:**
- Browser doesn't support Fullscreen API
- User denied permission
- Browser security policy (HTTPS required)

**Solution:**
- Test on HTTPS site
- Check browser console for errors
- Fallback: User can manually rotate

### Orientation Not Locking (iOS)

**Expected Behavior:**
- iOS Safari doesn't support `screen.orientation.lock()`
- This is normal and expected
- Fullscreen still works
- User rotates manually

---

## 💡 Best Practices

### User Guidance

**Do:**
- ✅ Show clear instructions
- ✅ Provide easy one-tap solution
- ✅ Allow user to dismiss
- ✅ Respect user choice

**Don't:**
- ❌ Force fullscreen automatically
- ❌ Block chart access
- ❌ Show on tablets
- ❌ Show repeatedly after dismissal

### Performance

**Optimizations:**
- Conditional rendering (only when needed)
- Hardware-accelerated animations
- Efficient detection (cached values)
- Debounced orientation changes

---

## 📱 User Feedback

### Expected User Reactions

**First Time:**
```
"Oh, I should rotate my phone!"
"Let me try fullscreen"
*Taps button*
"Wow, this looks much better!"
```

**Repeat Users:**
```
*Rotates device before opening*
OR
*Dismisses overlay once, doesn't see it again*
```

---

## 🎯 Success Metrics

### Measurable Outcomes

**Engagement:**
- % of mobile users who enter fullscreen
- % of users who rotate to landscape
- % of users who dismiss overlay

**Experience:**
- Better readability in landscape
- More data visible at once
- Less scrolling required
- Higher user satisfaction

---

## ✅ Checklist

### Implementation Checklist

- [x] Portrait detection
- [x] Overlay HTML component
- [x] Fullscreen API integration
- [x] Orientation lock attempt
- [x] Dismiss functionality
- [x] Apple-style design
- [x] Animations (icon, fade-in)
- [x] Responsive sizing
- [x] Browser compatibility
- [x] Event cleanup
- [x] Debug logging
- [x] Documentation

---

## 🎉 Summary

### What Was Built

✅ **Portrait Detection** - Auto-detects mobile portrait mode
✅ **Smart Overlay** - Shows helpful message and actions
✅ **Fullscreen Button** - One-tap fullscreen with landscape lock
✅ **Dismiss Option** - User can continue in portrait
✅ **Auto-Hide** - Disappears when rotated to landscape
✅ **Beautiful UI** - Apple-style frosted glass design
✅ **Animations** - Rotating icon, smooth transitions

### Code Stats

- **TypeScript:** ~65 lines
- **HTML:** ~18 lines
- **SCSS:** ~154 lines
- **Total:** ~237 lines

### User Impact

**Before:**
- Users stuck in cramped portrait view
- No guidance on better viewing
- Sub-optimal chart experience

**After:**
- Clear guidance to landscape view
- One-tap fullscreen solution
- Optimal chart viewing
- Flexibility to dismiss

---

**The widget now intelligently guides mobile users to the best viewing experience!** 📱↔️

Perfect for mobile dashboards where charts need horizontal space!
