# ThingsBoard Widget Import Guide

## How to Build and Host the Widget

This widget is designed to be built as a SystemJS bundle and hosted, just like other ThingsBoard extension widgets.

### 1. Build the Widget

```bash
# Install dependencies
npm install

# Run development server
npm run dev
# Widget will be available at: http://localhost:5000/static/widgets/thingsboard-extension-widgets.js

# Or build for production
npm run build
# Built file will be at: target/generated-resources/thingsboard-extension-widgets.js
```

### 2. Import into ThingsBoard

Once you have the widget running with `npm run dev` or built the production file:

1. **In ThingsBoard Widget Library:**
   - Go to **Widgets Library**
   - Create or select a widget bundle
   - Click **"+"** → **"Create new widget type"**

2. **Configure the Widget Type:**
   - **Type:** Latest values or Time series
   - **Title:** ECharts Multi-Plot Line Chart
   - **HTML:** Use Angular directive
     ```html
     <tb-echarts-line-chart 
         [ctx]="ctx">
     </tb-echarts-line-chart>
     ```

3. **Resources Tab:**
   Add your hosted widget URL:
   ```json
   [
     {
       "url": "https://your-domain.com/static/widgets/thingsboard-extension-widgets.js",
       "isModule": true
     }
   ]
   ```
   
   Or for local development:
   ```json
   [
     {
       "url": "http://localhost:5000/static/widgets/thingsboard-extension-widgets.js",
       "isModule": true
     }
   ]
   ```

4. **Advanced Settings:**
   - **Settings component:** `tb-echarts-line-chart-settings`
   - **Data key settings component:** `tb-echarts-line-chart-data-key-settings`

### 3. Widget Configuration

#### Data Key Settings
Each data key will have these options:
- **Chart Type**: Line or Bar
- **Subplot Assignment**: Top, Middle, or Bottom (determines which grid)
- **Number of Digits**: Decimal places
- **Show Options**: Average line, min/max values
- **Fill Options**: Gradient colors and opacity
- **Grid Layout**: Positioning settings

#### Widget Settings
Main settings include:
- **Legend Style**: Show/hide, color
- **Y-Axis Configuration**: Titles, units, auto-scale, min/max
- **Data Points**: Show/hide, symbol size
- **Pan and Zoom**: Enable/disable
- **Grid Layout**: Margins and positioning
- **Annotations**: Fixed or attribute-based markers
- **Debug Output**: Console logging

### 4. Key Features

1. **Multi-Grid System**:
   - Data series assigned to Top/Middle/Bottom grids
   - Grids dynamically adjust based on visible series
   - Legend controls grid visibility

2. **CSV Export Override**:
   - ALL CSV exports will use filename "Hello_Thomas.csv"
   - This override is persistent and monitors all export methods

3. **Container Size Responsive**:
   - Small: < 1000px height
   - Large: 1000-1200px height
   - Huge: > 1200px height
   - Different styling for each size

4. **Toolbar Buttons**:
   - Image Export (camera icon)
   - CSV Export (save_alt icon) → Always saves as "Hello_Thomas.csv"
   - Reset Zoom (restore_page icon)

### 5. Testing Your Widget

1. **Add to Dashboard**:
   - Create a test dashboard
   - Add your widget
   - Configure data sources

2. **Configure Data Keys**:
   - Select telemetry keys
   - Set `axisAssignment` for each key:
     - "Top" → Grid 0
     - "Middle" → Grid 1
     - "Bottom" → Grid 2

3. **Test Features**:
   - ✅ CSV export → Should download as "Hello_Thomas.csv"
   - ✅ Image export → Downloads chart as PNG
   - ✅ Zoom/Pan → If enabled in settings
   - ✅ Legend interaction → Hide/show series and grids
   - ✅ Responsive sizing → Resize widget to test

### 6. Module Structure

The widget is properly exported through the Angular module system:

```typescript
// Component class names
export class EchartsLineChartComponent
export class EchartsLineChartSettingsComponent
export class EchartsLineChartDataKeySettingsComponent

// Component selectors (used in templates)
tb-echarts-line-chart
tb-echarts-line-chart-settings
tb-echarts-line-chart-data-key-settings
```

These are automatically registered when the SystemJS bundle is loaded.

### 7. Troubleshooting

**Widget not loading:**
- Check browser console for errors
- Verify the widget bundle URL is accessible
- Check CORS settings if hosting on different domain

**Settings not appearing:**
- Ensure component names match exactly
- Check that settings schemas are valid JSON

**CSV not exporting as "Hello_Thomas.csv":**
- Check console for "Persistent saveAs override triggered" message
- Verify the widget has loaded completely

**Grids not showing correctly:**
- Ensure data keys have proper `axisAssignment` values
- Check that data is being received (enable debug output)

### 8. Development Tips

- Use `npm run dev` for live development
- The widget hot-reloads when you make changes
- Enable debug output in settings to see console logs
- Test with different container sizes to verify responsive behavior