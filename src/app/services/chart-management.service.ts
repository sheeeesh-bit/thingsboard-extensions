import { Injectable } from '@angular/core';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  MarkAreaComponent
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { 
  ChartDimensions, 
  SeriesData, 
  ChartGridConfig, 
  GridConfigurations,
  ChartSettings,
  ChartState,
  ChartError
} from '../interfaces/chart.interfaces';
import { WidgetContext } from '@home/models/widget-component.models';

// Register ECharts components
echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
  MarkAreaComponent,
  CanvasRenderer
]);

@Injectable({
  providedIn: 'root'
})
export class ChartManagementService {
  
  private readonly CHART_VERSION = '6.1.0';
  private readonly DEBUG = false;

  // Grid configurations for different container sizes
  private readonly gridConfigurations: GridConfigurations = {
    singleGrid: {
      small: [{ top: "8%", height: "70%", bottom: "2%" }],
      large: [{ top: "5%", height: "75%", bottom: "2%" }],
      huge: [{ top: "5%", height: "75%", bottom: "2%" }]
    },
    doubleGrid: {
      small: [
        { top: "8%", height: "30%" },
        { top: "50%", height: "30%", bottom: "2%" }
      ],
      large: [
        { top: "5%", height: "35%" },
        { top: "50%", height: "35%", bottom: "2%" }
      ],
      huge: [
        { top: "5%", height: "35%" },
        { top: "50%", height: "35%", bottom: "2%" }
      ]
    },
    tripleGrid: {
      small: [
        { top: "5%", height: "20%" },
        { top: "36%", height: "20%" },
        { top: "68%", height: "20%" }
      ],
      large: [
        { top: "3%", height: "25%" },
        { top: "35%", height: "25%" },
        { top: "68%", height: "20%", bottom: "2%" }
      ],
      huge: [
        { top: "3%", height: "25%" },
        { top: "35%", height: "25%" },
        { top: "65%", height: "20%", bottom: "10%" }
      ]
    }
  };

  /**
   * Initialize ECharts instance with proper configuration
   */
  initializeChart(container: HTMLElement, ctx: WidgetContext): echarts.ECharts {
    try {
      if (!container) {
        throw new Error('Chart container element is required');
      }

      // Apply height to container
      const dimensions = this.calculateDimensions(ctx);
      container.style.height = `${dimensions.availableHeight}px`;

      // Initialize chart
      const chart = echarts.init(container, 'light', {
        renderer: 'canvas',
        useDirtyRect: true // Performance optimization
      });

      // Set initial loading state
      chart.showLoading({
        text: 'Loading chart data...',
        color: '#1976d2',
        textColor: '#000',
        maskColor: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        showSpinner: true,
        spinnerRadius: 10,
        lineWidth: 3
      });

      this.logDebug('Chart initialized successfully', { version: this.CHART_VERSION });
      return chart;

    } catch (error) {
      const chartError: ChartError = {
        type: 'initialization',
        message: 'Failed to initialize chart',
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recovery: () => this.initializeChart(container, ctx)
      };
      throw chartError;
    }
  }

  /**
   * Calculate chart dimensions based on context
   */
  calculateDimensions(ctx: WidgetContext): ChartDimensions {
    const width = ctx.width || 800;
    const height = ctx.height || 600;
    const buttonBarHeight = 50; // Approximate height of button bar
    const availableHeight = height - buttonBarHeight;

    return {
      width,
      height,
      availableHeight: Math.max(availableHeight, 300) // Minimum height
    };
  }

  /**
   * Determine container size category
   */
  getContainerSize(dimensions: ChartDimensions): 'small' | 'large' | 'huge' {
    const { height } = dimensions;
    if (height < 1000) return 'small';
    if (height < 1200) return 'large';
    return 'huge';
  }

  /**
   * Get grid configuration for given parameters
   */
  getGridConfiguration(
    gridCount: number, 
    containerSize: 'small' | 'large' | 'huge'
  ): ChartGridConfig[] {
    let configKey: keyof GridConfigurations;
    
    if (gridCount <= 1) {
      configKey = 'singleGrid';
    } else if (gridCount === 2) {
      configKey = 'doubleGrid';
    } else {
      configKey = 'tripleGrid';
    }

    return this.gridConfigurations[configKey][containerSize];
  }

  /**
   * Update chart with new data
   */
  updateChartData(chart: echarts.ECharts, data: SeriesData[], ctx: WidgetContext): void {
    try {
      if (!chart || chart.isDisposed()) {
        throw new Error('Chart instance is not available');
      }

      if (!data || data.length === 0) {
        chart.showLoading({ text: 'Waiting for data...' });
        return;
      }

      // Hide loading
      chart.hideLoading();

      // Calculate dimensions and grid
      const dimensions = this.calculateDimensions(ctx);
      const containerSize = this.getContainerSize(dimensions);
      const gridCount = this.calculateGridCount(data);
      const grids = this.getGridConfiguration(gridCount, containerSize);

      // Build chart options
      const options = this.buildChartOptions(data, grids, dimensions, containerSize, ctx);

      // Apply options (never use merge mode)
      chart.setOption(options);

      // Force resize after data update
      setTimeout(() => {
        if (chart && !chart.isDisposed()) {
          chart.resize();
        }
      }, 50);

      this.logDebug('Chart data updated successfully', { 
        seriesCount: data.length, 
        gridCount, 
        containerSize 
      });

    } catch (error) {
      const chartError: ChartError = {
        type: 'data',
        message: 'Failed to update chart data',
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recovery: () => this.updateChartData(chart, data, ctx)
      };
      throw chartError;
    }
  }

  /**
   * Calculate number of grids needed based on data
   */
  private calculateGridCount(data: SeriesData[]): number {
    if (!data || data.length === 0) return 1;
    
    // Count unique y-axis indices
    const yAxisIndices = new Set(data.map(series => series.yAxisIndex));
    return Math.max(1, yAxisIndices.size);
  }

  /**
   * Build complete chart options
   */
  private buildChartOptions(
    data: SeriesData[], 
    grids: ChartGridConfig[], 
    dimensions: ChartDimensions,
    containerSize: 'small' | 'large' | 'huge',
    ctx: WidgetContext
  ): echarts.EChartsCoreOption {
    
    const settings = ctx.settings as ChartSettings;
    
    return {
      grid: grids,
      xAxis: this.buildXAxisConfig(grids.length),
      yAxis: this.buildYAxisConfig(grids.length, containerSize),
      series: data.map(series => ({
        ...series,
        type: 'line',
        smooth: false,
        connectNulls: false,
        sampling: data.length > 1000 ? 'lttb' : undefined // Performance optimization
      })),
      dataZoom: [{
        type: 'inside',
        xAxisIndex: Array.from({ length: grids.length }, (_, i) => i),
        zoomOnMouseWheel: 'ctrl',
        moveOnMouseMove: 'ctrl',
        moveOnMouseWheel: true
      }, {
        type: 'slider',
        xAxisIndex: Array.from({ length: grids.length }, (_, i) => i),
        top: '92%',
        height: 20,
        show: settings.showZoomControls !== false
      }],
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false // Performance optimization
        },
        formatter: this.createTooltipFormatter(),
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: '#ccc',
        borderWidth: 1,
        textStyle: {
          color: '#333',
          fontSize: this.getFontSize(containerSize, 'tooltip')
        }
      },
      animation: data.length < 5000, // Disable animation for large datasets
      animationDuration: data.length < 1000 ? 1000 : 500,
      animationEasing: 'cubicOut'
    };
  }

  /**
   * Build X-axis configuration
   */
  private buildXAxisConfig(gridCount: number): unknown[] {
    return Array.from({ length: gridCount }, (_, index) => ({
      type: 'time',
      gridIndex: index,
      axisLabel: {
        fontSize: 12,
        color: '#666'
      },
      axisLine: {
        lineStyle: { color: '#ddd' }
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#f5f5f5' }
      }
    }));
  }

  /**
   * Build Y-axis configuration
   */
  private buildYAxisConfig(
    gridCount: number, 
    containerSize: 'small' | 'large' | 'huge'
  ): unknown[] {
    const fontSize = this.getFontSize(containerSize, 'axis');
    
    return Array.from({ length: gridCount }, (_, index) => ({
      type: 'value',
      gridIndex: index,
      axisLabel: {
        fontSize,
        color: '#666',
        formatter: (value: number) => this.formatAxisValue(value)
      },
      axisLine: {
        lineStyle: { color: '#ddd' }
      },
      splitLine: {
        show: true,
        lineStyle: { color: '#f5f5f5' }
      }
    }));
  }

  /**
   * Get appropriate font size for container size
   */
  private getFontSize(
    containerSize: 'small' | 'large' | 'huge', 
    element: 'axis' | 'legend' | 'tooltip'
  ): number {
    const sizeMap = {
      small: { axis: 14, legend: 14, tooltip: 12 },
      large: { axis: 16, legend: 20, tooltip: 14 },
      huge: { axis: 18, legend: 24, tooltip: 16 }
    };
    return sizeMap[containerSize][element];
  }

  /**
   * Create tooltip formatter function
   */
  private createTooltipFormatter(): (params: unknown[]) => string {
    return (params: unknown[]): string => {
      if (!Array.isArray(params) || params.length === 0) {
        return '';
      }

      const timestamp = (params[0] as { value: [number, number] }).value[0];
      const date = new Date(timestamp);
      
      let tooltip = `<div style="margin-bottom: 5px; font-weight: bold;">
        ${date.toLocaleString()}
      </div>`;

      params.forEach((param: unknown) => {
        const p = param as {
          seriesName: string;
          value: [number, number];
          color: string;
          marker: string;
        };
        
        tooltip += `<div style="margin: 2px 0;">
          ${p.marker} ${p.seriesName}: <strong>${this.formatTooltipValue(p.value[1])}</strong>
        </div>`;
      });

      return tooltip;
    };
  }

  /**
   * Format axis values for display
   */
  private formatAxisValue(value: number): string {
    if (Math.abs(value) >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    }
    if (Math.abs(value) >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toFixed(2);
  }

  /**
   * Format tooltip values for display
   */
  private formatTooltipValue(value: number): string {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return Number(value.toFixed(6)).toString(); // Remove trailing zeros
  }

  /**
   * Resize chart to fit container
   */
  resizeChart(chart: echarts.ECharts): void {
    try {
      if (chart && !chart.isDisposed()) {
        chart.resize();
        this.logDebug('Chart resized successfully');
      }
    } catch (error) {
      this.logDebug('Failed to resize chart:', error);
    }
  }

  /**
   * Reset chart zoom to show all data
   */
  resetZoom(chart: echarts.ECharts): void {
    try {
      if (chart && !chart.isDisposed()) {
        chart.dispatchAction({
          type: 'dataZoom',
          start: 0,
          end: 100
        });
        this.logDebug('Chart zoom reset successfully');
      }
    } catch (error) {
      this.logDebug('Failed to reset chart zoom:', error);
    }
  }

  /**
   * Properly dispose of chart instance
   */
  disposeChart(chart: echarts.ECharts): void {
    try {
      if (chart && !chart.isDisposed()) {
        chart.dispose();
        this.logDebug('Chart disposed successfully');
      }
    } catch (error) {
      this.logDebug('Failed to dispose chart:', error);
    }
  }

  /**
   * Debug logging utility
   */
  private logDebug(message: string, data?: unknown): void {
    if (this.DEBUG) {
      console.log(`[ChartManagementService] ${message}`, data || '');
    }
  }
}