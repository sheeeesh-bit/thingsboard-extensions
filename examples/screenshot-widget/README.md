# Screenshot Widget

A custom ThingsBoard widget for capturing full-page screenshots, inspired by the [mrcoles/full-page-screen-capture-chrome-extension](https://github.com/mrcoles/full-page-screen-capture-chrome-extension). Uses the same principle of scrolling through content, capturing pieces, and stitching them together.

## Features

- **Full-Page Capture**: Automatically scrolls and captures the entire page
- **Multiple Capture Modes**: Dashboard, Widget only, or Custom element
- **Progress Tracking**: Real-time progress bar during capture
- **Image Stitching**: Combines multiple captures into a single image
- **Download Functionality**: Save screenshots with a timestamp
- **Customizable Settings**: Format, quality, scroll increment, and more
- **Debug Mode**: Optional debug information display

## Technical Implementation

The widget uses **html2canvas** library and implements the same scrolling + stitching approach as the Chrome extension:

1. **Scrolls** through the target element in configurable increments
2. **Captures** screenshots of each visible portion
3. **Stitches** all pieces together into a single image
4. **Displays** the result with download capability

## Installation

### Method 1: Development Mode

1. Start the development server:
   ```bash
   npm install
   npm start
   ```

2. In ThingsBoard, create a new widget:
   - Go to Widget Library → Add new widget type → Select "Latest" widget
   - In the Resources tab, add: `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`
   - Check "Is module"
   - In HTML template, add: `<tb-screenshot-widget [ctx]="ctx"></tb-screenshot-widget>`
   - Set the widget controller and settings directive (see widget JSON)

### Method 2: Production Mode

1. Build the project:
   ```bash
   npm run build
   ```

2. The compiled file will be at: `target/generated-resources/thingsboard-extension-widgets.js`

3. In ThingsBoard:
   - Upload the file in Widget resources
   - OR use the provided `screenshot_widget.json` to import the complete widget

### Method 3: Import Widget JSON

1. Import the widget JSON file: `examples/screenshot-widget/screenshot_widget.json`
2. Add the resource URL in the widget editor
3. Save and add to your dashboard

## Widget Configuration

### General Settings
- **Widget Title**: Customize the title displayed in the widget header
- **Show Debug Info**: Enable/disable debug information (mode, scroll increment, quality)

### Capture Settings
- **Capture Mode**:
  - `dashboard`: Captures the entire dashboard
  - `widget`: Captures only the current widget
  - `custom`: Captures a custom element (requires CSS selector)
- **Custom CSS Selector**: CSS selector for custom capture mode (e.g., `.my-class`)
- **Image Format**: PNG (best quality) or JPEG (smaller size)
- **Image Quality**: 0.1 to 1.0 (higher = better quality, larger file)

### Advanced Settings
- **Scroll Increment**: Pixels to scroll per capture for full-page screenshots (default: 1000px)

## Usage

1. **Add the widget** to your ThingsBoard dashboard
2. **Configure settings** according to your needs
3. **Click "Capture Screenshot"** to start the capture process
4. **Watch the progress bar** as the widget scrolls and captures
5. **View the result** displayed in the widget
6. **Click "Download"** to save the screenshot

## Component Details

- **Main Component**: `ScreenshotWidgetComponent`
  - Handles capture logic, scrolling, and stitching
  - Manages progress tracking and error handling
  - Implements download functionality

- **Settings Component**: `ScreenshotWidgetSettingsComponent`
  - Provides UI for all configuration options
  - Validates settings before saving

## How It Works

The widget follows the same principle as the mrcoles Chrome extension:

```typescript
1. Determine target element (dashboard/widget/custom)
2. Calculate scroll height and viewport size
3. If content fits in one screen:
   → Capture directly
4. If content requires scrolling:
   → Loop: Scroll → Wait → Capture → Store
   → Stitch all captures on a canvas
   → Export as data URL
5. Display and enable download
```

## Development

### Run Development Server
```bash
npm start
```

### Build for Production
```bash
npm run build
```

### Lint Code
```bash
npm run lint
```

## Troubleshooting

### Issue: Blank screenshots
- **Solution**: Check if the target element has proper dimensions
- Try different capture modes
- Increase scroll increment if content is very large

### Issue: Build errors
- **Solution**: Make sure html2canvas is installed: `npm install html2canvas`
- Check TypeScript version compatibility

### Issue: Widget not loading
- **Solution**: Verify the resource URL is correct
- Make sure "Is module" is checked
- Check browser console for errors

## Credits

Inspired by the [GoFullPage Chrome Extension](https://github.com/mrcoles/full-page-screen-capture-chrome-extension) by mrcoles.

## License

MIT
