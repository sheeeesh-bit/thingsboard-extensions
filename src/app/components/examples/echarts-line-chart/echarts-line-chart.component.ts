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
  
  // UI state properties
  public showStatsPanel = false;
  public showMinMaxLines = false;
  public showAlarmVisualization = true;
  
  // Statistics values
  public currentValue: string;
  public minValue: string;
  public maxValue: string;
  public avgValue: string;
  public stdDevValue: string;
  
  // Store current data for statistics calculation
  private currentData: any[] = [];
  
  // Settings shortcut
  public get settings() {
    return this.ctx?.settings || {};
  }
  
  // Check if any toolbar buttons should be visible
  public hasVisibleButtons(): boolean {
    const s = this.settings;
    return s?.enableImageExport !== false || 
           s?.enableDataZoom || 
           s?.showInlineStats !== false || 
           s?.showMinMaxLines !== false || 
           s?.showAlarmViolationAreas !== false || 
           s?.showAlarmThresholdLines !== false;
  }

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
    // Delay initialization to ensure layout is complete
    setTimeout(() => {
      this.initChart();
      this.setupResizeObserver();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chart) {
      this.chart.dispose();
    }
  }
  
  // Handle toolbar button clicks
  public menuButtons(action: string): void {
    console.log('[ECharts Line Chart] Menu button clicked:', action);
    
    switch (action) {
      case 'genImage':
        this.exportChartImage();
        break;
      case 'reset':
        this.resetZoom();
        break;
      case 'toggleInlineStats':
        this.showStatsPanel = !this.showStatsPanel;
        if (this.showStatsPanel) {
          this.calculateStatistics();
        }
        break;
      case 'showMinMax':
        this.showMinMaxLines = !this.showMinMaxLines;
        this.updateMinMaxLines();
        break;
      case 'toggleAlarmStatus':
        this.showAlarmVisualization = !this.showAlarmVisualization;
        this.updateAlarmVisualization();
        break;
    }
    
    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
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
        plotIndex: dataItem.dataKey.settings?.plotIndex,
        firstDataPoint: dataItem.data && dataItem.data.length > 0 ? dataItem.data[0] : null,
        lastDataPoint: dataItem.data && dataItem.data.length > 0 ? dataItem.data[dataItem.data.length - 1] : null
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
    
    // Calculate statistics if panel is visible
    if (this.showStatsPanel) {
      this.calculateStatistics();
    }
    
    // Store current data for future calculations
    this.currentData = this.ctx.data;
    
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
    
    // Get container dimensions
    const container = this.chartContainer.nativeElement;
    const width = container.offsetWidth;
    const height = container.offsetHeight;
    console.log('[ECharts Line Chart] Container dimensions:', { width, height });
    
    // Initialize chart instance
    this.chart = echarts.init(container);
    console.log('[ECharts Line Chart] Chart instance created:', !!this.chart);
    
    // Force initial resize
    this.chart.resize();

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

    const titles = plotConfigs.map((config) => ({
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
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          console.log('[ECharts Line Chart] Container resized:', { width, height });
          this.onResize();
        }
      }
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
  
  // Export chart as image
  private exportChartImage(): void {
    if (!this.chart) {
      console.warn('[ECharts Line Chart] No chart instance available for export');
      return;
    }
    
    const format = this.settings.exportSettings?.format || 'png';
    const backgroundColor = this.settings.exportSettings?.backgroundColor || '#ffffff';
    
    // Get base64 image data
    const url = this.chart.getDataURL({
      type: format,
      pixelRatio: 2,
      backgroundColor: backgroundColor,
      excludeComponents: ['toolbox']
    });
    
    // Create download link
    const link = document.createElement('a');
    link.download = `chart-${new Date().getTime()}.${format}`;
    link.href = url;
    link.click();
  }
  
  // Reset zoom to show all data
  private resetZoom(): void {
    if (!this.chart) {
      return;
    }
    
    // Reset all data zoom components
    this.chart.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100
    });
  }
  
  // Calculate statistics for displayed data
  private calculateStatistics(): void {
    if (!this.ctx.data || this.ctx.data.length === 0) {
      return;
    }
    
    // For now, calculate stats for the first data series
    // TODO: Add series selector for multi-series stats
    const firstSeries = this.ctx.data[0];
    if (!firstSeries.data || firstSeries.data.length === 0) {
      return;
    }
    
    const values = firstSeries.data.map(point => point[1]);
    const decimals = this.getDecimals(0);
    const units = this.getUnits(0);
    
    // Current value (last point)
    this.currentValue = formatValue(values[values.length - 1], decimals, units, false);
    
    // Min/Max
    const min = Math.min(...values);
    const max = Math.max(...values);
    this.minValue = formatValue(min, decimals, units, false);
    this.maxValue = formatValue(max, decimals, units, false);
    
    // Average
    const sum = values.reduce((acc, val) => acc + val, 0);
    const avg = sum / values.length;
    this.avgValue = formatValue(avg, decimals, units, false);
    
    // Standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - avg, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / values.length;
    const stdDev = Math.sqrt(avgSquaredDiff);
    this.stdDevValue = formatValue(stdDev, decimals, units, false);
  }
  
  // Update min/max lines on chart
  private updateMinMaxLines(): void {
    if (!this.chart || !this.ctx.data) {
      return;
    }
    
    // TODO: Implement min/max lines using markLine
    console.log('[ECharts Line Chart] Min/Max lines feature to be implemented');
  }
  
  // Update alarm visualization
  private updateAlarmVisualization(): void {
    if (!this.chart) {
      return;
    }
    
    // TODO: Implement alarm visualization using markArea and markLine
    console.log('[ECharts Line Chart] Alarm visualization feature to be implemented');
  }
}