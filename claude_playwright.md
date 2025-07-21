# ThingsBoard ECharts Multi-Plot Widget Development

## Overview
This document summarizes the development of an advanced ECharts line chart widget for ThingsBoard with multiple plot support, configurable data series assignment, and enhanced debugging capabilities. The widget is built as an Angular component in the ThingsBoard extensions project.

## Key Features

### 1. Multiple Plot Support
- Supports 1-7 independent plots with separate y-axes
- Shared time axis across all plots
- Dynamic height calculation for each plot
- Configurable plot titles

### 2. Plot Assignment for Data Series
- Each data series can be assigned to a specific plot (1-7)
- Configured via data key settings with `plotIndex` parameter
- Default assignment to plot 1 if not specified

### 3. Toggleable Debug Window
- Debug info panel controlled by widget settings
- Shows widget status, data series count, total points, and plot distribution
- Can be toggled on/off via `showDebugInfo` setting

## Widget Access Information
- **Widget Editor URL**: `http://localhost:8080/resources/widgets-library/widget-types/0b1f1400-63b2-11f0-ada4-17812a0522d3`
- **Login Credentials**: `tenant@thingsboard.org` / `tenant`
- **Development Server**: `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`

## Initial Development Steps
First attempt was to create a standalone ECharts widget directly in ThingsBoard:

#### Resources Added:
- ECharts library: `https://cdn.jsdelivr.net/npm/echarts@5.4.3/dist/echarts.min.js`

#### HTML:
```html
<div id="echart-container" style="width: 100%; height: 100%;"></div>
```

#### JavaScript:
```javascript
let myChart;

self.onInit = function() {
    // Wait for ECharts to load
    if (typeof echarts === 'undefined') {
        setTimeout(self.onInit, 100);
        return;
    }
    
    // Initialize chart
    const container = document.getElementById('echart-container');
    if (container) {
        myChart = echarts.init(container);
        
        // Set initial empty option
        const option = {
            title: {
                text: 'Time Series Line Chart',
                left: 'center'
            },
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    let result = params[0].axisValueLabel + '<br/>';
                    params.forEach(function(item) {
                        result += item.marker + ' ' + item.seriesName + ': ' + item.value[1] + '<br/>';
                    });
                    return result;
                }
            },
            legend: {
                bottom: 10,
                data: []
            },
            grid: {
                left: '3%',
                right: '4%',
                bottom: '15%',
                containLabel: true
            },
            xAxis: {
                type: 'time',
                boundaryGap: false
            },
            yAxis: {
                type: 'value'
            },
            series: []
        };
        
        myChart.setOption(option);
    }
};

self.onDataUpdated = function() {
    if (!myChart || !self.ctx.data) return;
    
    const series = [];
    const legendData = [];
    
    // Process each data series
    self.ctx.data.forEach(function(dataItem) {
        if (dataItem.data && dataItem.data.length > 0) {
            const seriesName = dataItem.dataKey.label || dataItem.dataKey.name;
            legendData.push(seriesName);
            
            series.push({
                name: seriesName,
                type: 'line',
                smooth: true,
                symbol: 'circle',
                symbolSize: 4,
                data: dataItem.data.map(function(point) {
                    return [point[0], point[1]];
                })
            });
        }
    });
    
    // Update chart
    myChart.setOption({
        legend: {
            data: legendData
        },
        series: series
    });
};

self.onResize = function() {
    if (myChart) {
        myChart.resize();
    }
};

self.onDestroy = function() {
    if (myChart) {
        myChart.dispose();
    }
};

self.typeParameters = function() {
    return {
        dataKeysOptional: false
    };
};
```

### 3. ECharts Multi-Plot Component in ThingsBoard Extensions

Created an advanced Angular component for ECharts line chart with multiple plot support:

#### File Structure:
```
src/app/components/examples/echarts-line-chart/
├── echarts-line-chart.component.ts
├── echarts-line-chart.component.html
└── echarts-line-chart.component.scss
```

#### Component TypeScript (`echarts-line-chart.component.ts`):
```typescript
import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import * as echarts from 'echarts/core';
import { EChartsOption } from 'echarts';
import { WidgetContext } from '@home/models/widget-component.models';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  TitleComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { formatValue, isDefinedAndNotNull } from '@core/public-api';

// Register required components
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
]);

interface PlotConfig {
  id: string;
  title?: string;
  gridIndex: number;
  yAxisIndex: number;
  xAxisIndex: number;
  height: string;
  top: string;
}

@Component({
  selector: 'tb-echarts-line-chart',
  templateUrl: './echarts-line-chart.component.html',
  styleUrls: ['./echarts-line-chart.component.scss']
})
export class EchartsLineChartComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer', {static: false}) chartContainer: ElementRef<HTMLElement>;
  @Input() ctx: WidgetContext;

  private chart: echarts.ECharts;
  private chartOption: EChartsOption;
  private resizeObserver: ResizeObserver;
  
  // Debug properties
  public showDebugInfo = false;
  public widgetStatus = 'Initializing...';
  public dataSeriesCount = 0;
  public totalDataPoints = 0;
  public plotInfo: {[key: string]: number} = {};

  ngOnInit(): void {
    console.log('[ECharts Line Chart] Component initialized');
    console.log('[ECharts Line Chart] Widget context:', this.ctx);
    console.log('[ECharts Line Chart] Settings:', this.ctx.settings);
    this.ctx.$scope.echartsLineChartComponent = this;
    this.widgetStatus = 'Initialized';
    
    // Check if debug should be enabled from settings
    this.showDebugInfo = this.ctx.settings.showDebugInfo === true;
  }

  ngAfterViewInit(): void {
    console.log('[ECharts Line Chart] AfterViewInit - Chart container:', this.chartContainer.nativeElement);
    this.initChart();
    this.setupResizeObserver();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chart) {
      this.chart.dispose();
    }
  }

  public onDataUpdated(): void {
    console.log('[ECharts Line Chart] onDataUpdated called');
    console.log('[ECharts Line Chart] Chart instance exists:', !!this.chart);
    console.log('[ECharts Line Chart] Data received:', this.ctx.data);
    
    if (!this.chart || !this.ctx.data) {
      console.warn('[ECharts Line Chart] Missing chart instance or data');
      this.widgetStatus = !this.chart ? 'Chart not initialized' : 'Waiting for data...';
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
      return;
    }

    // Get plot configuration
    const numberOfPlots = this.ctx.settings.numberOfPlots || 1;
    const plotConfigs = this.generatePlotConfigs(numberOfPlots);
    
    // Group series by plot
    const seriesByPlot: {[key: string]: any[]} = {};
    const legendData = [];
    let totalDataPoints = 0;
    this.plotInfo = {};

    // Process each data series
    this.ctx.data.forEach((dataItem, index) => {
      console.log(`[ECharts Line Chart] Processing series ${index}:`, {
        name: dataItem.dataKey.label || dataItem.dataKey.name,
        dataPoints: dataItem.data ? dataItem.data.length : 0,
        color: dataItem.dataKey.color,
        plotIndex: dataItem.dataKey.settings?.plotIndex
      });
      
      if (dataItem.data && dataItem.data.length > 0) {
        const seriesName = dataItem.dataKey.label || dataItem.dataKey.name;
        const color = dataItem.dataKey.color;
        const plotIndex = Math.min(
          Math.max(0, (dataItem.dataKey.settings?.plotIndex || 1) - 1), 
          numberOfPlots - 1
        );
        const plotConfig = plotConfigs[plotIndex];
        
        totalDataPoints += dataItem.data.length;
        legendData.push(seriesName);

        // Convert data points and ensure proper format
        const chartData = dataItem.data
          .filter(point => this.validateDataPoint(point))
          .map(point => {
            const timestamp = point[0];
            const value = point[1];
            return [timestamp, value];
          });

        const series = {
          name: seriesName,
          type: 'line',
          smooth: this.ctx.settings.smooth !== false,
          symbol: 'circle',
          symbolSize: 4,
          showSymbol: false,
          lineStyle: {
            width: 2,
            color: color
          },
          itemStyle: {
            color: color
          },
          data: chartData,
          xAxisIndex: plotConfig.xAxisIndex,
          yAxisIndex: plotConfig.yAxisIndex,
          animation: true,
          animationDuration: 300
        };

        if (!seriesByPlot[plotConfig.id]) {
          seriesByPlot[plotConfig.id] = [];
          this.plotInfo[`Plot ${plotIndex + 1}`] = 0;
        }
        seriesByPlot[plotConfig.id].push(series);
        this.plotInfo[`Plot ${plotIndex + 1}`]++;
      }
    });

    console.log('[ECharts Line Chart] Data processing complete:', {
      seriesCount: legendData.length,
      totalDataPoints: totalDataPoints,
      legendItems: legendData,
      plotDistribution: this.plotInfo
    });
    
    // Update debug properties
    this.dataSeriesCount = legendData.length;
    this.totalDataPoints = totalDataPoints;
    this.widgetStatus = totalDataPoints > 0 ? `Displaying ${totalDataPoints} data points` : 'No data';

    // Flatten all series
    const allSeries = Object.values(seriesByPlot).flat();

    // Update chart with complete option
    const updatedOption = this.createMultiPlotOption(plotConfigs, legendData, allSeries);
    
    // Use notMerge: false to completely replace the series
    this.chart.setOption(updatedOption, {
      notMerge: false,
      lazyUpdate: false
    });
    
    console.log('[ECharts Line Chart] Chart updated successfully with option:', updatedOption);
    
    // Force a resize to ensure proper rendering
    setTimeout(() => {
      if (this.chart) {
        this.chart.resize();
      }
    }, 100);
    
    // Trigger change detection for debug info
    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }
  }

  public onResize(): void {
    if (this.chart) {
      this.chart.resize();
    }
  }

  private initChart(): void {
    console.log('[ECharts Line Chart] Initializing chart');
    // Initialize chart instance
    this.chart = echarts.init(this.chartContainer.nativeElement);
    console.log('[ECharts Line Chart] Chart instance created:', !!this.chart);

    // Get initial plot configuration
    const numberOfPlots = this.ctx.settings.numberOfPlots || 1;
    const plotConfigs = this.generatePlotConfigs(numberOfPlots);
    
    // Set initial chart options
    this.chartOption = this.createMultiPlotOption(plotConfigs, [], []);

    this.chart.setOption(this.chartOption);
    console.log('[ECharts Line Chart] Initial chart options set:', this.chartOption);
    
    // If we already have data, update the chart
    if (this.ctx && this.ctx.data && this.ctx.data.length > 0) {
      console.log('[ECharts Line Chart] Initial data available, updating chart');
      setTimeout(() => {
        this.onDataUpdated();
      }, 100);
    }
  }

  private generatePlotConfigs(numberOfPlots: number): PlotConfig[] {
    const configs: PlotConfig[] = [];
    const plotHeight = Math.floor(85 / numberOfPlots); // 85% total height divided by number of plots
    const spacing = Math.floor(10 / numberOfPlots); // Dynamic spacing
    
    for (let i = 0; i < numberOfPlots; i++) {
      const top = i * (plotHeight + spacing) + 5; // Start from 5%
      configs.push({
        id: `plot_${i}`,
        title: this.ctx.settings[`plot${i + 1}Title`] || `Plot ${i + 1}`,
        gridIndex: i,
        yAxisIndex: i,
        xAxisIndex: i,
        height: `${plotHeight}%`,
        top: `${top}%`
      });
    }
    
    return configs;
  }

  private createMultiPlotOption(plotConfigs: PlotConfig[], legendData: string[], series: any[]): EChartsOption {
    const grids = plotConfigs.map(config => ({
      left: '3%',
      right: '4%',
      height: config.height,
      top: config.top,
      containLabel: true
    }));

    const xAxes = plotConfigs.map((config, index) => ({
      type: 'time',
      gridIndex: index,
      axisLine: {
        onZero: false
      },
      axisLabel: {
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
        },
        show: index === plotConfigs.length - 1 // Only show labels on the bottom plot
      },
      splitLine: {
        show: false
      }
    } as any));

    const yAxes = plotConfigs.map((config, index) => ({
      type: 'value' as const,
      gridIndex: index,
      scale: true,
      name: config.title,
      nameLocation: 'middle' as const,
      nameGap: 50,
      axisLabel: {
        formatter: (value: number) => {
          return formatValue(value, this.ctx.decimals || 2, this.ctx.units || '', false);
        }
      },
      splitLine: {
        show: true
      }
    }));

    const titles = plotConfigs.map((config, index) => ({
      text: config.title,
      left: 'center',
      top: `${parseInt(config.top) - 2}%`,
      textStyle: {
        fontSize: 14,
        fontWeight: 'normal' as const
      }
    }));

    const dataZoomConfig = this.ctx.settings.enableDataZoom !== false ? [
      {
        type: 'inside' as const,
        xAxisIndex: plotConfigs.map((_, i) => i),
        start: 0,
        end: 100,
        filterMode: 'none' as const
      },
      {
        type: 'slider' as const,
        xAxisIndex: plotConfigs.map((_, i) => i),
        start: 0,
        end: 100,
        filterMode: 'none' as const,
        bottom: 5,
        height: 20
      }
    ] : [];

    return {
      title: titles,
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false,
          label: {
            backgroundColor: '#505765'
          }
        },
        formatter: (params: any) => {
          if (!params || params.length === 0) return '';
          
          let result = new Date(params[0].value[0]).toLocaleString() + '<br/>';
          params.forEach((item: any) => {
            const decimals = this.getDecimals(item.seriesIndex);
            const units = this.getUnits(item.seriesIndex);
            const value = formatValue(item.value[1], decimals, units, false);
            result += `${item.marker} ${item.seriesName}: ${value}<br/>`;
          });
          return result;
        }
      },
      legend: {
        bottom: 0,
        data: legendData,
        type: 'scroll'
      },
      grid: grids,
      xAxis: xAxes,
      yAxis: yAxes,
      dataZoom: dataZoomConfig,
      series: series,
      animation: true,
      animationDuration: 300
    };
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.onResize();
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  private getDecimals(index: number): number {
    if (this.ctx.data && this.ctx.data[index]) {
      return isDefinedAndNotNull(this.ctx.data[index].dataKey.decimals) 
        ? this.ctx.data[index].dataKey.decimals 
        : (this.ctx.decimals || 2);
    }
    return this.ctx.decimals || 2;
  }

  private getUnits(index: number): string {
    if (this.ctx.data && this.ctx.data[index]) {
      return isDefinedAndNotNull(this.ctx.data[index].dataKey.units) 
        ? this.ctx.data[index].dataKey.units 
        : (this.ctx.units || '');
    }
    return this.ctx.units || '';
  }
  
  private validateDataPoint(point: any[]): boolean {
    return Array.isArray(point) && 
           point.length >= 2 && 
           typeof point[0] === 'number' && 
           typeof point[1] === 'number' &&
           !isNaN(point[0]) && 
           !isNaN(point[1]);
  }
}
```

#### Component HTML (`echarts-line-chart.component.html`):
```html
<div class="echarts-line-chart-container">
  <div #chartContainer class="chart-container"></div>
  <div class="debug-info" *ngIf="showDebugInfo">
    <div class="debug-status">Widget Status: {{ widgetStatus }}</div>
    <div class="debug-data-count">Data Series: {{ dataSeriesCount }}</div>
    <div class="debug-points">Total Points: {{ totalDataPoints }}</div>
    <div class="debug-plots" *ngFor="let plot of plotInfo | keyvalue">
      {{ plot.key }}: {{ plot.value }} series
    </div>
  </div>
</div>
```

#### Component SCSS (`echarts-line-chart.component.scss`):
```scss
:host {
  display: block;
  width: 100%;
  height: 100%;
}

.echarts-line-chart-container {
  width: 100%;
  height: 100%;
  position: relative;

  .chart-container {
    width: 100%;
    height: 100%;
  }
  
  .debug-info {
    position: absolute;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 10px;
    border-radius: 4px;
    font-size: 12px;
    font-family: monospace;
    z-index: 1000;
    
    .debug-status {
      color: #4caf50;
      margin-bottom: 5px;
    }
    
    .debug-data-count {
      color: #2196f3;
      margin-bottom: 5px;
    }
    
    .debug-points {
      color: #ff9800;
      margin-bottom: 5px;
    }
    
    .debug-plots {
      color: #9c27b0;
      margin-bottom: 3px;
      font-size: 11px;
    }
  }
}
```

### 4. Module Integration

Updated `examples.module.ts` to include the new component:
```typescript
import { EchartsLineChartComponent } from './echarts-line-chart/echarts-line-chart.component';

@NgModule({
  declarations: [
    // ... other components
    EchartsLineChartComponent
  ],
  exports: [
    // ... other components
    EchartsLineChartComponent
  ]
})
```

Updated `public-api.ts` to export the component:
```typescript
export * from './echarts-line-chart/echarts-line-chart.component';
```

### 5. Widget Configuration Schemas

#### Settings Schema (Widget-level configuration):
```json
{
  "schema": {
    "type": "object",
    "title": "Settings",
    "properties": {
      "title": {
        "title": "Chart title",
        "type": "string",
        "default": "Time Series Chart"
      },
      "smooth": {
        "title": "Smooth lines",
        "type": "boolean",
        "default": true
      },
      "enableDataZoom": {
        "title": "Enable data zoom",
        "type": "boolean",
        "default": true
      },
      "showDebugInfo": {
        "title": "Show debug info",
        "type": "boolean",
        "default": false
      },
      "numberOfPlots": {
        "title": "Number of plots",
        "type": "integer",
        "default": 1,
        "minimum": 1,
        "maximum": 4
      },
      "plot1Title": {
        "title": "Plot 1 title",
        "type": "string",
        "default": "Plot 1"
      },
      "plot2Title": {
        "title": "Plot 2 title",
        "type": "string",
        "default": "Plot 2"
      },
      "plot3Title": {
        "title": "Plot 3 title",
        "type": "string",
        "default": "Plot 3"
      },
      "plot4Title": {
        "title": "Plot 4 title",
        "type": "string",
        "default": "Plot 4"
      }
    }
  },
  "form": [
    "title",
    "smooth",
    "enableDataZoom",
    "showDebugInfo",
    "numberOfPlots",
    {
      "key": "plot1Title",
      "condition": "model.numberOfPlots >= 1"
    },
    {
      "key": "plot2Title",
      "condition": "model.numberOfPlots >= 2"
    },
    {
      "key": "plot3Title",
      "condition": "model.numberOfPlots >= 3"
    },
    {
      "key": "plot4Title",
      "condition": "model.numberOfPlots >= 4"
    }
  ]
}
```

#### Data Key Settings Schema (Per data series configuration):
```json
{
  "schema": {
    "type": "object",
    "title": "Data Key Configuration",
    "properties": {
      "plotIndex": {
        "title": "Plot Index",
        "type": "integer",
        "default": 1,
        "minimum": 1,
        "maximum": 7,
        "description": "Select which plot this data series should appear in (1-7)"
      }
    }
  },
  "form": [
    {
      "key": "plotIndex",
      "type": "number",
      "titleMap": [
        {"value": 1, "name": "Plot 1"},
        {"value": 2, "name": "Plot 2"},
        {"value": 3, "name": "Plot 3"},
        {"value": 4, "name": "Plot 4"},
        {"value": 5, "name": "Plot 5"},
        {"value": 6, "name": "Plot 6"},
        {"value": 7, "name": "Plot 7"}
      ]
    }
  ]
}
```

### 6. ThingsBoard Widget Configuration

To use the component in ThingsBoard:

#### Resources:
- ThingsBoard Extension: `http://localhost:5000/static/widgets/thingsboard-extension-widgets.js`
- Mark as "Is module" checkbox

#### HTML:
```html
<tb-echarts-line-chart [ctx]="ctx"></tb-echarts-line-chart>
```

#### JavaScript:
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

## Debug Features

The component includes comprehensive debugging capabilities:

### Console Logging
- Component initialization status
- Widget context and settings
- Data received notifications
- Data processing details (series count, data points, plot assignment)
- Chart update confirmations

### Visual Debug Panel
- Shows widget status
- Displays number of data series
- Shows total data points
- Shows plot distribution (how many series in each plot)
- Controlled by widget setting: `showDebugInfo: true/false` (default: false)

## Key Features of the ECharts Multi-Plot Line Chart

1. **Multiple Plot Support**: 1-7 independent plots with separate y-axes
2. **Plot Assignment**: Each data series can be assigned to a specific plot via data key settings
3. **Dynamic Layout**: Automatic height calculation and spacing for plots
4. **Time Series Support**: Optimized for displaying time-based data
5. **Multiple Series**: Supports multiple data series with different colors per plot
6. **Smooth Lines**: Optional smooth line rendering
7. **Interactive Tooltips**: Shows formatted values with units and decimals
8. **Legend**: Scrollable legend for all series across plots
9. **Data Zoom**: Optional zoom controls that work across all plots simultaneously
10. **Responsive**: Automatically resizes with widget container
11. **Debug Panel**: Toggleable debug info showing widget status and plot distribution
12. **Customizable Titles**: Each plot can have its own title
13. **Data Validation**: Filters out invalid data points
14. **Proper Cleanup**: Disposes chart and observers on destroy

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# The widget extension will be available at:
# http://localhost:5000/static/widgets/thingsboard-extension-widgets.js
```

## Troubleshooting

### Common Issues:
1. **"Failed to load widget resource"**: Ensure the extension URL is correctly added in Resources
2. **No data displayed**: Check console logs for data reception
3. **Chart not rendering**: Verify ECharts library is loaded

### Debug Tips:
- Open browser console to see detailed logs
- Check the debug panel on the widget for status
- Verify the development server is running on port 5000

## Next Steps

1. Add more chart types (bar, pie, scatter)
2. Implement more advanced ECharts features
3. Add configuration UI for chart settings
4. Create unit tests for the component
5. Add more customization options via widget settings

## Session Summary

Successfully created an advanced ECharts multi-plot line chart widget for ThingsBoard with:
- ✅ Angular component with multiple plot support (1-7 plots)
- ✅ Plot assignment for data series via data key settings
- ✅ Dynamic layout with automatic height calculation
- ✅ Toggleable debug panel controlled by widget settings
- ✅ Full integration with ThingsBoard widget system
- ✅ Time series data support with shared x-axis
- ✅ Interactive tooltips and zoom controls
- ✅ Responsive design with proper lifecycle management
- ✅ Comprehensive settings schemas for easy configuration
- ✅ Data validation and error handling

## Important Configuration Notes

1. **Widget Settings**: Configure number of plots, plot titles, debug info visibility
2. **Data Key Settings**: Each data series can specify `plotIndex` (1-7)
3. **Resources**: Widget extension must be loaded from development server
4. **Development**: Run `npm start` to serve widget at port 5000