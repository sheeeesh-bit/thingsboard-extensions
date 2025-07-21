# ECharts Multi-Plot Line Chart Widget

An advanced ECharts line chart widget for ThingsBoard with multiple plot support, configurable data series assignment, and enhanced debugging capabilities.

## Features

- **Multiple Plot Support**: 1-7 independent plots with separate y-axes
- **Plot Assignment**: Each data series can be assigned to a specific plot via data key settings
- **Dynamic Layout**: Automatic height calculation and spacing for plots
- **Time Series Support**: Optimized for displaying time-based data
- **Smooth Lines**: Optional smooth line rendering
- **Interactive Tooltips**: Shows formatted values with units and decimals
- **Legend**: Scrollable legend for all series across plots
- **Data Zoom**: Optional zoom controls that work across all plots simultaneously
- **Debug Panel**: Toggleable debug info showing widget status and plot distribution
- **Customizable Titles**: Each plot can have its own title

## Installation

1. Start the development server:
```bash
npm start
```

2. In ThingsBoard Widget Editor:
   - Go to Widget Library → Create new widget type
   - **Resources Tab**:
     - Add URL: `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`
     - Check "Is module" checkbox
   
3. Import the widget configuration:
   - Use the JSON file: `examples/echarts-line-chart/echarts_line_chart.json`
   - Or manually configure as shown below

## Widget Configuration

### HTML Template
```html
<tb-echarts-line-chart [ctx]="ctx"></tb-echarts-line-chart>
```

### JavaScript
```javascript
self.onInit = function() {
    // Initialize the component reference
    self.ctx.$scope.echartsLineChartComponent = {};
};

self.onDataUpdated = function() {
    // Call the component's onDataUpdated method
    if (self.ctx.$scope.echartsLineChartComponent && self.ctx.$scope.echartsLineChartComponent.onDataUpdated) {
        self.ctx.$scope.echartsLineChartComponent.onDataUpdated();
    }
};

self.onResize = function() {
    // Call the component's onResize method
    if (self.ctx.$scope.echartsLineChartComponent && self.ctx.$scope.echartsLineChartComponent.onResize) {
        self.ctx.$scope.echartsLineChartComponent.onResize();
    }
};

self.onDestroy = function() {
    // Clean up
    if (self.ctx.$scope.echartsLineChartComponent && self.ctx.$scope.echartsLineChartComponent.ngOnDestroy) {
        self.ctx.$scope.echartsLineChartComponent.ngOnDestroy();
    }
};

self.typeParameters = function() {
    return {
        dataKeysOptional: false
    };
};
```

## Settings

### Widget Settings

The widget settings are accessible through the settings editor:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `title` | string | "Time Series Chart" | Main chart title |
| `smooth` | boolean | true | Enable smooth line rendering |
| `enableDataZoom` | boolean | true | Enable zoom controls |
| `showDebugInfo` | boolean | false | Show debug panel |
| `numberOfPlots` | integer | 1 | Number of plots (1-7) |
| `plot1Title` | string | "Plot 1" | Title for plot 1 |
| `plot2Title` | string | "Plot 2" | Title for plot 2 |
| `plot3Title` | string | "Plot 3" | Title for plot 3 |
| `plot4Title` | string | "Plot 4" | Title for plot 4 |
| `plot5Title` | string | "Plot 5" | Title for plot 5 |
| `plot6Title` | string | "Plot 6" | Title for plot 6 |
| `plot7Title` | string | "Plot 7" | Title for plot 7 |

### Data Key Settings

Each data series can be configured with:

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `plotIndex` | integer | 1 | Which plot to display this series in (1-7) |

## Usage Example

1. **Single Plot Configuration**:
   - Set `numberOfPlots` to 1
   - All data series will appear on the same plot

2. **Multi-Plot Configuration**:
   - Set `numberOfPlots` to desired number (e.g., 3)
   - Configure plot titles for each plot
   - In data keys, set `plotIndex` for each series to assign them to specific plots

3. **Debug Mode**:
   - Enable `showDebugInfo` to see:
     - Widget status
     - Number of data series
     - Total data points
     - Plot distribution

## Development

### Building for Production
```bash
npm run build
```

The production widget will be available in `target/generated-resources/`.

### Component Structure
- Main component: `src/app/components/examples/echarts-line-chart/`
- Settings component: `.../echarts-line-chart/settings/`
- Data key settings: `.../echarts-line-chart/data-key-settings/`

## Troubleshooting

### Common Issues

1. **"Failed to load widget resource"**: 
   - Ensure the development server is running (`npm start`)
   - Check that the resource URL is correct

2. **No data displayed**: 
   - Check console logs for data reception
   - Verify data source configuration

3. **Chart not rendering**: 
   - Check browser console for errors
   - Ensure ECharts library is loaded

### Debug Tips
- Enable `showDebugInfo` in widget settings
- Check browser developer console for detailed logs
- Each operation logs to console with `[ECharts Line Chart]` prefix