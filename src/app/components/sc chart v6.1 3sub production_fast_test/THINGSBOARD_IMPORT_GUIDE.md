# ThingsBoard Widget Import Guide

## Overview
This guide explains how to import the ECharts Line Chart widget into ThingsBoard 3.9 widget editor.

## Export Names and Configuration

### 1. **Widget Type Name**
The widget is registered as: `echarts-line-chart`

### 2. **Component Export Names**
```typescript
// Main widget component
export class: EchartsLineChartComponent

// Settings component
export class: EchartsLineChartSettingsComponent

// Data key settings component
export class: EchartsLineChartDataKeySettingsComponent
```

### 3. **Module Configuration**
In the Angular module, these components are exported as:
```typescript
// Widget component
tb-echarts-line-chart

// Settings components
tb-echarts-line-chart-settings
tb-echarts-line-chart-data-key-settings
```

## Import Process for ThingsBoard

### Option 1: Using the JavaScript File (Recommended for ThingsBoard 3.9)

1. **Open ThingsBoard Widget Editor**
   - Go to Widgets Library
   - Click "+" to create new widget
   - Select "Create new widget type"

2. **Configure Widget Descriptor**
   ```json
   {
     "type": "latest",
     "sizeX": 8,
     "sizeY": 6,
     "resources": [
       {
         "url": "https://cdn.jsdelivr.net/npm/echarts@5.2.2/dist/echarts.min.js"
       }
     ],
     "templateHtml": "<div id=\"echartContainer\" style=\"width: 100%; height: 100%;\"></div>",
     "templateCss": "/* Copy content from echarts-line-chart.component.scss */",
     "controllerScript": "/* Copy content from echarts-line-chart-widget.js */",
     "settingsSchema": "/* Copy content from settings-schema.json */",
     "dataKeySettingsSchema": "/* Copy content from data-key-settings-schema.json */"
   }
   ```

3. **HTML Tab**
   Copy the simplified HTML:
   ```html
   <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
   
   <div fxFlex fxLayout="column" style="height: 100%; width: 100%;" fxLayoutAlign="start stretch">
       <div class="tb-button-container" fxLayoutAlign="end stretch">
           <button mat-icon-button (click)="self.ctx.$scope.menuButtons('genImage')" class="tb-button" matTooltipPosition="above" matTooltip="Download Image">
               <i class="material-icons">photo_camera</i>
           </button>
           
           <button mat-icon-button (click)="self.ctx.$scope.menuButtons('exportCsv')" class="tb-button" matTooltipPosition="above" matTooltip="Export to CSV">
               <i class="material-icons">save_alt</i>
           </button>
           
           <button mat-icon-button (click)="self.ctx.$scope.menuButtons('reset')" class="tb-button" matTooltipPosition="above" matTooltip="Reset Zoom">
               <i class="material-icons">restore_page</i>
           </button>
       </div>
       
       <div fxFlex fxLayout="row" style="graph-container">
           <div id="echartContainer"></div>
       </div>
   </div>
   ```

4. **CSS Tab**
   Copy all content from `echarts-line-chart.component.scss`

5. **JavaScript Tab**
   Copy all content from `echarts-line-chart-widget.js`

6. **Settings Schema Tab**
   Copy content from `settings-schema.json`

7. **Data Key Settings Schema Tab**
   Copy content from `data-key-settings-schema.json`

### Option 2: Using Angular Components (For Custom Build)

If you're building a custom ThingsBoard UI:

1. **Import in your module:**
   ```typescript
   import { EchartsLineChartComponent } from './path-to-widget/echarts-line-chart.component';
   import { EchartsLineChartSettingsComponent } from './path-to-widget/settings/echarts-line-chart-settings.component';
   import { EchartsLineChartDataKeySettingsComponent } from './path-to-widget/data-key-settings/echarts-line-chart-data-key-settings.component';
   ```

2. **Register in widget factory:**
   ```typescript
   widgetComponentsMap.set('tb-echarts-line-chart', EchartsLineChartComponent);
   widgetSettingsComponentsMap.set('tb-echarts-line-chart-settings', EchartsLineChartSettingsComponent);
   widgetDataKeySettingsComponentsMap.set('tb-echarts-line-chart-data-key-settings', EchartsLineChartDataKeySettingsComponent);
   ```

## Widget Configuration

### Data Key Settings
When configuring data keys, you'll see these options:
- **Chart Type**: Line or Bar
- **Subplot Assignment**: Top, Middle, or Bottom
- **Number of Digits**: Decimal places for values
- **Show Options**: Average line, min/max values
- **Fill Options**: Gradient colors and opacity

### Widget Settings
Main settings include:
- **Legend Style**: Show/hide legend, legend color
- **Y-Axis Configuration**: Titles, units, auto-scale, min/max values
- **Data Points**: Show/hide, symbol size
- **Grid Layout**: Margins and positioning
- **Annotations**: Add fixed or attribute-based markers
- **Debug Output**: Enable console logging

## Important Notes

1. **CSV Export**: The widget will ALWAYS export CSV files as "Hello_Thomas.csv" regardless of widget title or configuration.

2. **Multi-Grid System**: 
   - Data series are assigned to Top/Middle/Bottom grids
   - Grids automatically adjust based on visible series
   - Legend controls grid visibility

3. **Dependencies**:
   - ECharts 5.2.2 (loaded from CDN)
   - ThingsBoard's built-in Angular Material components

4. **Compatibility**:
   - Tested with ThingsBoard 3.9
   - Uses SystemJS module format
   - Compatible with ThingsBoard's widget framework

## Testing Your Import

1. **Create Test Dashboard**
   - Add your imported widget
   - Configure at least one data source

2. **Configure Data Keys**
   - Assign each data series to a subplot (Top/Middle/Bottom)
   - Set appropriate units and decimal places

3. **Test Features**
   - Image export (camera button)
   - CSV export (should save as "Hello_Thomas.csv")
   - Zoom reset
   - Legend interaction (hiding series should hide grids)

4. **Verify Settings**
   - Check that all settings appear correctly
   - Test Y-axis auto-scale toggle
   - Add annotations if needed

## Troubleshooting

- **Widget not loading**: Check browser console for errors
- **ECharts not found**: Ensure the CDN resource is loaded
- **Buttons not working**: Verify the menuButtons function is properly bound
- **CSV export wrong filename**: Check that the saveAs override is active

## File Structure Reference
```
echarts-line-chart-widget.js     # Main JavaScript (use this for import)
echarts-line-chart.component.html # HTML template
echarts-line-chart.component.scss # Styles
settings-schema.json              # Widget settings schema
data-key-settings-schema.json     # Data key settings schema
```