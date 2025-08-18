import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  OnDestroy
} from '@angular/core';
import { DatePipe } from '@angular/common';
import * as echarts from 'echarts/core';
import { WidgetContext } from '@home/models/widget-component.models';
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
import * as XLSX from 'xlsx';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// Register required components
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

// Constants from ThingsBoard example
const AXIS_POSITION_NAMES = {
  TOP: "Top",
  MIDDLE: "Middle",
  BOTTOM: "Bottom",
  PLOT4: "Plot4",
  PLOT5: "Plot5",
  PLOT6: "Plot6",
  PLOT7: "Plot7"
};

const SIZE_NAMES = {
  SMALL: "small",
  LARGE: "large",
  HUGE: "huge",
};

// DataZoom geometry constants - fixed pixel dimensions for consistent appearance
const DATAZOOM_HEIGHT_PX = 28;      // height of the slider track in pixels
const DATAZOOM_BOTTOM_PX = 40;       // gap between slider and container bottom in pixels
const GAP_BEFORE_DATAZOOM_PX = 70;   // gap between last plot and slider in pixels

// Grid spacing constants - unified pixel-based spacing
const GAP_BETWEEN_GRIDS_PX = 70;    // consistent visual gap between stacked plots in pixels
const GAP_TOP_RESERVED_PCT = 3;     // % reserved for legend at top

// Standard 3-subplot mapping (original)
const axisPositionMapStandard = {
  Top: 0,
  Middle: 1,
  Bottom: 2
};

// Extended 7-subplot mapping (multiple devices mode)
const axisPositionMapExtended = {
  Top: 0,
  Middle: 1,
  Bottom: 2,
  Plot4: 3,
  Plot5: 4,
  Plot6: 5,
  Plot7: 6
};

@Component({
  selector: 'tb-echarts-line-chart',
  templateUrl: './echarts-line-chart.component.html',
  styleUrls: ['./echarts-line-chart.component.scss']
})
export class EchartsLineChartComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer', {static: false}) chartContainer: ElementRef<HTMLElement>;
  @Input() ctx: WidgetContext;
  
  // Entity sidebar model
  public entityList: Array<{
    name: string;
    color: string;
    count: number;
    visible: boolean;
  }> = [];

  private chart: echarts.ECharts;
  private resizeObserver: ResizeObserver;
  private stateChangeSubscription: any;
  private resizeDebounceTimer: any;
  // Track which grid is currently hovered for tooltip filtering
  private hoveredGridIndex: number | null = null;
  
  // Entity-based color mapping
  private entityColorMap: Record<string, string> = {};
  private nextColorIndex = 0;
  // Extended color palette for 100+ devices
  private colorPalette = [
    // ECharts default colors (20)
    '#5470c6', '#91cc75', '#fac858', '#ee6666', '#73c0de',
    '#3ba272', '#fc8452', '#9a60b4', '#ea7ccc', '#ff9f7f',
    '#ffdb5c', '#95e1d3', '#ff6b6b', '#4ecdc4', '#a8e6cf',
    '#ffd3b6', '#ffaaa5', '#ff8b94', '#dcedc1', '#ffeaa7',
    // Additional distinct colors (80 more for total of 100)
    '#2e7d32', '#1976d2', '#d32f2f', '#f57c00', '#7b1fa2',
    '#c2185b', '#0288d1', '#388e3c', '#fbc02d', '#512da8',
    '#00796b', '#5d4037', '#616161', '#455a64', '#e64a19',
    '#afb42b', '#689f38', '#00897b', '#0097a7', '#1565c0',
    '#283593', '#6a1b9a', '#8e24aa', '#ad1457', '#d81b60',
    '#00695c', '#00838f', '#0277bd', '#01579b', '#4527a0',
    '#311b92', '#880e4f', '#b71c1c', '#bf360c', '#e65100',
    '#ff6f00', '#f57f17', '#f9a825', '#827717', '#558b2f',
    '#33691e', '#2e7d32', '#1b5e20', '#004d40', '#006064',
    '#01579b', '#0d47a1', '#1a237e', '#4a148c', '#880e4f',
    '#ff1744', '#d50000', '#ff3d00', '#dd2c00', '#ff6d00',
    '#ffab00', '#ffd600', '#aeea00', '#64dd17', '#00c853',
    '#00bfa5', '#00b8d4', '#00b0ff', '#2979ff', '#3d5afe',
    '#651fff', '#6200ea', '#aa00ff', '#d500f9', '#e91e63',
    '#f50057', '#ff4081', '#ff80ab', '#ff1744', '#f44336',
    '#ff5252', '#ff5722', '#ff6e40', '#ff9800', '#ffc107',
    '#ffeb3b', '#cddc39', '#8bc34a', '#4caf50', '#009688',
    '#00bcd4', '#03a9f4', '#2196f3', '#3f51b5', '#673ab7',
    '#9c27b0', '#e91e63', '#795548', '#9e9e9e', '#607d8b',
    '#78909c', '#90a4ae', '#b0bec5', '#cfd8dc', '#eceff1'
  ];
  
  // ThingsBoard example properties
  private DEBUG = true;
  private CHART_VERSION = "1.2";
  private currentConfig: any;
  private containerHeightLimit = [1000, 1200];
  private currentSize = "small";
  private maxGrids = 0;
  private setGrids = new Set<string>();
  private currentGrids = 3;
  private currentGridNames: string[] = [];
  private resetGrid = false;
  private usedFormatter: any;
  private legendOverridesGrids = false;
  private lastDataLengths: number[] = [];
  
  // Time formatters
  private zoomTimeWithSeconds = 60 * 60 * 1000;       // 1 day
  private zoomTimeWithMinutes = 7 * 24 * 60 * 60 * 1000;  // 7 days 
  private zoomTimeWithDays = 60 * 24 * 60 * 60 * 1000;   // 60 days
  
  // Formatter configurations
  private browserLocale = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/') ? "en-GB" : navigator.language || (navigator as any).userLanguage;
  private datePipe: DatePipe;
  
  // Helper method to get the correct axis position map
  private getAxisPositionMap(): any {
    return this.ctx.settings?.multipleDevices ? axisPositionMapExtended : axisPositionMapStandard;
  }
  
  // Helper method to get max allowed grids
  private getMaxAllowedGrids(): number {
    return this.ctx.settings?.multipleDevices ? 7 : 3;
  }

  ngOnInit(): void {
    this.LOG(this.ctx);
    this.LOG(`=== CHART VERSION ${this.CHART_VERSION} INITIALIZATION START ===`);
    this.LOG('Component initialized');
    this.LOG('Widget context:', this.ctx);
    this.LOG('Widget settings:', this.ctx.settings);
    
    // Reset entity color mapping on initialization
    this.entityColorMap = {};
    this.nextColorIndex = 0;
    
    // Initialize DatePipe with user's locale
    this.datePipe = new DatePipe(this.browserLocale);
    
    // Initialize debug output first
    this.DEBUG = this.ctx.settings.debugOutput;
    
    // Log data series details
    this.LOG('=== DATA SERIES ANALYSIS ===');
    this.LOG('Total data series:', this.ctx.data?.length || 0);
    
    // Log first few series for debugging
    if (this.ctx.data && this.ctx.data.length > 0) {
      this.LOG('First 5 data series structure:');
      for (let i = 0; i < Math.min(5, this.ctx.data.length); i++) {
        this.LOG(`Series[${i}]:`, {
          dataKey: this.ctx.data[i].dataKey,
          dataLength: this.ctx.data[i].data?.length || 0,
          firstDataPoint: this.ctx.data[i].data?.[0]
        });
      }
    }
    
    // Log datasources information
    this.LOG('=== DATASOURCES INFO ===');
    this.LOG('Total datasources:', this.ctx.datasources?.length || 0);
    if (this.ctx.datasources) {
      this.ctx.datasources.forEach((ds, idx) => {
        this.LOG(`Datasource[${idx}]:`, {
          entityName: ds.entityName,
          entityType: ds.entityType,
          name: ds.name,
          dataKeysCount: ds.dataKeys?.length || 0
        });
      });
    }
    
    if (this.ctx.data && this.ctx.data.length > 0) {
      this.ctx.data.forEach((item: any, index: number) => {
        const axisAssignment = item?.dataKey?.settings?.axisAssignment;
        this.LOG(`Series[${index}]:`, {
          label: item?.dataKey?.label || 'UNDEFINED',
          axisAssignment: axisAssignment || 'NOT SET',
          hasSettings: !!item?.dataKey?.settings,
          dataKeyStructure: item?.dataKey ? Object.keys(item.dataKey) : 'NO DATAKEY',
          settingsStructure: item?.dataKey?.settings ? Object.keys(item.dataKey.settings) : 'NO SETTINGS'
        });
      });
    } else {
      this.LOG('WARNING: No data series available!');
    }
    
    // Setup menu buttons
    this.ctx.$scope.menuButtons = (buttonName: string) => {
      switch (buttonName) {
        case 'genImage':
          this.LOG("Picture Button clicked!");
          this.downloadChartImage();
          break;
        case 'reset':
          this.resetChartCompletely();
          break;
      }
    };
    
    // Override CSV export functionality
    this.overrideCsvExport();
    
    this.currentConfig = this.isContainerHeight();
    this.LOG('Container config:', this.currentSize);
    
    // Count grids by settings
    this.LOG('=== GRID CALCULATION ===');
    const axisPositionMap = this.getAxisPositionMap();
    this.LOG('axisPositionMap:', axisPositionMap);
    this.setGrids = this.countGridsBySettings(Object.keys(axisPositionMap));
    this.LOG('setGrids (unique axis assignments):', Array.from(this.setGrids));
    
    this.currentGridNames = Array.from(this.setGrids);
    this.maxGrids = this.setGrids.size;
    this.currentGrids = this.maxGrids;
    
    this.LOG('GRID RESULTS:');
    this.LOG('- currentGridNames:', this.currentGridNames);
    this.LOG('- maxGrids:', this.maxGrids);
    this.LOG('- currentGrids:', this.currentGrids);
    
    // Subscribe to ThingsBoard state changes
    this.subscribeToStateChanges();
    
    this.LOG(`=== CHART VERSION ${this.CHART_VERSION} INITIALIZATION END ===`);
  }

  ngAfterViewInit(): void {
    this.LOG('[ECharts Line Chart] AfterViewInit - Chart container:', this.chartContainer.nativeElement);
    this.LOG(`[HEIGHT DEBUG] ngAfterViewInit - ctx.height: ${this.ctx.height}, ctx.width: ${this.ctx.width}`);
    
    // Don't apply height here - let initChart handle it
    
    // Delay initialization to ensure layout is complete
    setTimeout(() => {
      this.LOG(`[HEIGHT DEBUG] After timeout - ctx.height: ${this.ctx.height}`);
      this.initChart();
      this.setupResizeObserver();
      
      // CRITICAL: Expose component to ThingsBoard's widget.js bridge
      // This allows TB to call our methods and flush pending updates
      if (this.ctx.$scope) {
        this.LOG('[ECharts Line Chart] Exposing component to ThingsBoard scope');
        this.ctx.$scope.echartsLineChartComponent = this;
        
        // If widget.js has already queued pending updates, flush them now
        if (typeof this.ctx.$scope.componentReady === 'function') {
          this.LOG('[ECharts Line Chart] Calling componentReady() to flush pending updates');
          this.ctx.$scope.componentReady();
        }
      }
    }, 100);
  }

  ngOnDestroy(): void {
    // Clean up component reference from ThingsBoard scope
    if (this.ctx.$scope && this.ctx.$scope.echartsLineChartComponent === this) {
      this.LOG('[ECharts Line Chart] Removing component from ThingsBoard scope');
      delete this.ctx.$scope.echartsLineChartComponent;
    }
    
    // Clean up resize debounce timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    
    // Clean up state subscriptions
    if (this.stateChangeSubscription) {
      this.stateChangeSubscription.unsubscribe();
    }
    
    // Clean up state check interval if it exists
    if ((this as any).stateCheckInterval) {
      clearInterval((this as any).stateCheckInterval);
    }
    
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.chart) {
      this.chart.off('legendselectchanged');
      this.chart.dispose();
    }
    // Restore original saveAs if we overrode it
    if ((window as any).saveAs && (window as any).saveAs._original) {
      (window as any).saveAs = (window as any).saveAs._original;
    }
  }

  public onDataUpdated(): void {
    this.LOG(`=== DATA UPDATE (v${this.CHART_VERSION}) ===`);
    this.LOG('Chart instance exists:', !!this.chart);
    this.LOG('Data series count:', this.ctx.data?.length || 0);
    this.LOG('Legend overrides active:', this.legendOverridesGrids);
    
    // Reset hovered grid index to avoid stale references
    this.hoveredGridIndex = null;
    
    // Clear legend override if this is fresh data from ThingsBoard
    const hasNewData = this.ctx.data?.some((series, idx) => 
      series.data?.length !== this.lastDataLengths?.[idx]
    );
    
    if (hasNewData) {
      this.LOG('New data detected, clearing legend override');
      this.legendOverridesGrids = false;
      this.lastDataLengths = this.ctx.data?.map(s => s.data?.length || 0) || [];
    }
    
    // Debug: Log detailed data structure
    if (this.ctx.data) {
      this.ctx.data.forEach((series, idx) => {
        this.LOG(`Series[${idx}]:`, {
          label: series.dataKey?.label,
          dataLength: series.data?.length || 0,
          firstDataPoint: series.data?.[0],
          axisAssignment: series.dataKey?.settings?.axisAssignment
        });
      });
    }
    
    if (!this.ctx.data || this.ctx.data.length === 0) {
      this.LOG('ERROR: No data available');
      return;
    }
    
    // Check if we have real data with actual points
    const totalDataPoints = this.ctx.data.reduce((sum, series) => 
      sum + (series.data?.length || 0), 0);
    
    if (totalDataPoints === 0) {
      this.LOG('WARNING: Data series exist but contain no data points, skipping update');
      // Keep showing loading spinner if chart is initialized
      if (this.chart && !this.chart.isDisposed()) {
        this.chart.showLoading({
          text: 'Waiting for data...',
          color: '#1976d2',
          textColor: '#000',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          fontSize: 14,
          showSpinner: true,
          spinnerRadius: 10,
          lineWidth: 2
        });
      }
      return;
    }
    
    this.LOG(`Processing ${totalDataPoints} total data points across ${this.ctx.data.length} series`);
    
    // If chart is not initialized yet, just return
    // The data will be loaded when the chart initializes in ngAfterViewInit
    if (!this.chart) {
      this.LOG('Chart not initialized yet, will load data after initialization');
      return;
    }

    this.currentConfig = this.isContainerHeight();
    
    // Only recalculate grids from data if legend is not overriding
    if (!this.legendOverridesGrids) {
      this.LOG('=== RECALCULATING GRID CONFIGURATION FROM DATA ===');
      const axisPositionMap = this.getAxisPositionMap();
      this.LOG('axisPositionMap:', axisPositionMap);
      
      const previousGridCount = this.currentGrids;
      this.setGrids = this.countGridsBySettings(Object.keys(axisPositionMap));
      this.LOG('Updated setGrids (unique axis assignments):', Array.from(this.setGrids));
      
      this.currentGridNames = Array.from(this.setGrids);
      this.maxGrids = this.setGrids.size;
      this.currentGrids = this.maxGrids;
      
      this.LOG('GRID RESULTS FROM DATA:');
      this.LOG('- currentGridNames:', this.currentGridNames);
      this.LOG('- maxGrids:', this.maxGrids);
      this.LOG('- currentGrids:', this.currentGrids);
      
      if (previousGridCount !== this.currentGrids) {
        this.LOG(`Grid count changed from ${previousGridCount} to ${this.currentGrids}`);
        this.resetGrid = true;
        // Keep DOM height in sync on data-driven grid changes
        this.applyScrollableHeight();
      }
    } else {
      this.LOG('Using legend-selected grids:', this.currentGridNames);
      this.LOG('Current grid count:', this.currentGrids);
    }
    
    const myNewOptions: any = {};
    myNewOptions.series = [];
    
    this.LOG('=== SERIES CREATION ===');
    this.LOG('Grid configuration:', {
      currentGrids: this.currentGrids,
      maxGrids: this.maxGrids,
      currentGridNames: this.currentGridNames
    });
    
    // Build dynamic axis map based on current grids
    const dynamicAxisMap = this.getDynamicAxisIndexMap();
    
    // Process each data series - create ALL series regardless of legend selection
    for (let i = 0; i < this.ctx.data.length; i++) {
      // Default to 'Top' if axisAssignment is not set
      const axisAssignment = this.ctx.data[i].dataKey?.settings?.axisAssignment || 'Top';
      
      // Use dynamic map to get grid index, default to 0 if not in active grids
      let gridIndex = dynamicAxisMap[axisAssignment];
      
      // If assignment not in current grids, use grid 0 (series will be hidden by legend selection)
      if (gridIndex === undefined) {
        this.LOG(`Series[${i}] "${this.ctx.data[i].dataKey.label}" with assignment "${axisAssignment}" not in active grids, assigning to grid 0`);
        gridIndex = 0;
      }
      
      this.LOG(`Series[${i}] "${this.ctx.data[i].dataKey.label}":`, {
        axisAssignment: axisAssignment,
        dynamicGridIndex: gridIndex,
        dataPoints: this.ctx.data[i].data?.length || 0
      });
      
      // Get entity name for color grouping
      const entityName = this.ctx.data[i].datasource?.entityName || '';
      const entityColor = this.getColorForEntity(entityName);
      
      this.LOG(`Series[${i}] "${this.ctx.data[i].dataKey.label}" entity="${entityName}" color="${entityColor}"`);
      
      const seriesElement = {
        name: this.ctx.data[i].dataKey.label,
        itemStyle: {
          normal: {
            color: entityColor,  // Use entity-based color instead of series-specific color
          }
        },
        lineStyle: {
          color: entityColor,  // Also set line color to entity color
          width: (axisAssignment === 'Middle') 
            ? this.currentConfig.seriesElement.lineStyle.widthMiddle 
            : this.currentConfig.seriesElement.lineStyle.width
        },
        type: 'line',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        data: this.ctx.data[i].data,
        symbol: (this.ctx.settings.showDataPoints) ? 'circle' : 'none',
        symbolSize: (this.ctx.settings.symbolSize_data || 5) * 2.5, // Increase size by 2.5x to match original
        smooth: this.ctx.settings.smooth
      };
      myNewOptions.series.push(seriesElement);
    }
    
    this.setTimeFormatter();
    myNewOptions.xAxis = this.currentXAxisArray();
    myNewOptions.yAxis = this.currentYAxisArray();
    myNewOptions.grid = this.currentGridArray();
    myNewOptions.dataZoom = this.getDataZoomConfig(); // Update datazoom based on current grid config
    
    // Update legend configuration with preserved state
    const legendState = this.getLegendState();
    
    myNewOptions.legend = {
      show: true,
      type: 'scroll',
      data: legendState.data,
      selected: legendState.selected,
      selectedMode: true,
      icon: 'none',  // No icons, text only
      itemWidth: 0,   // No icon width
      itemHeight: 0,  // No icon height
      itemGap: this.currentConfig.option.legend.itemGap,
      textStyle: {
        color: this.ctx.settings.legendcolortext || '#000000',
        fontWeight: this.currentConfig.option.legend.textStyle.fontWeight,
        fontSize: this.currentConfig.option.legend.textStyle.fontSize
      },
      tooltip: {
        show: true,
        backgroundColor: 'rgba(50, 50, 50, 0.8)',
        textStyle: { color: '#fff' },
        borderColor: '#fff',
        borderWidth: 1,
        formatter: (p: any) => `Click "${p.name}" to hide or show data.`
      }
    };
    
    this.LOG("myNewOptions:", myNewOptions);
    
    // Apply options without notMerge to preserve tooltip state
    const needsFullReset = this.resetGrid || this.legendOverridesGrids;
    
    if (needsFullReset) {
      this.LOG('Applying full reset with replaceMerge only (no notMerge)');
      // Replace structural parts while preserving tooltip and other settings
      this.chart.setOption(myNewOptions, {
        replaceMerge: ['grid', 'xAxis', 'yAxis', 'series', 'dataZoom']
      });
      this.resetGrid = false;
    } else {
      // Normal update for data changes only
      this.chart.setOption(myNewOptions);
    }
    
    // Hide the loading spinner after data is rendered
    this.chart.hideLoading();
    
    // Refresh entity list for sidebar
    setTimeout(() => this.refreshEntityList(), 100);
    
    // Force resize after grid changes
    if (needsFullReset) {
      setTimeout(() => {
        if (this.chart && !this.chart.isDisposed()) {
          this.chart.resize();
        }
      }, 100);
    }
  }

  public onResize(): void {
    this.LOG("ONRESIZE!!!");
    this.LOG(`[HEIGHT DEBUG] onResize triggered - ctx.height: ${this.ctx.height}, ctx.width: ${this.ctx.width}`);
    
    // Debounce resize to prevent thrashing
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    
    this.resizeDebounceTimer = setTimeout(() => {
      // Apply correct scroll height based on current active grids
      this.applyScrollableHeight();
      
      if (this.chart) {
        this.LOG(`[HEIGHT DEBUG] Calling chart.resize()`);
        this.chart.resize();
      }
      
      const oldSize = this.currentSize;
      this.currentConfig = this.isContainerHeight();
      
      if (oldSize !== this.currentSize) {
        this.LOG(`[HEIGHT DEBUG] Size changed from ${oldSize} to ${this.currentSize} - updating chart`);
      }
      
      this.onDataUpdated();
    }, 50); // 50ms debounce
  }

  /**
   * Helper method to apply correct scroll height based on current active grids
   * Mathematical model: 
   * - For <=3 grids: container = available height (fits exactly)
   * - For >3 grids: container = available height * scale factor for scrolling
   * 
   * Key insight: ECharts % calculations are relative to container height.
   * So for N grids to display properly with scroll:
   * - Container height must scale proportionally to grid count
   * - We use 3 grids as baseline (fits in 100% height)
   * - For N>3: height = availableHeight * (N/3) to maintain same grid size
   */
  private applyScrollableHeight(): void {
    const container = this.chartContainer.nativeElement;
    const containerElement = container.querySelector('#echartContainer') as HTMLElement;
    
    if (!containerElement || !this.ctx.height) {
      return;
    }
    
    const buttonBarHeight = 50; // Button container takes about 50px
    const availableHeight = this.ctx.height - buttonBarHeight;
    
    containerElement.style.width = '100%';
    
    if (this.currentGrids > 3) {
      // Scale container height proportionally to grid count
      // This ensures each grid maintains consistent size
      const scaleFactor = this.currentGrids / 3;
      const scrollHeight = Math.ceil(availableHeight * scaleFactor);
      
      container.style.overflowY = 'auto'; 
      container.style.maxHeight = `${availableHeight}px`;
      container.style.height = `${availableHeight}px`;
      containerElement.style.height = `${scrollHeight}px`;
      
      this.LOG(`[HEIGHT DEBUG] Scrollable: ${this.currentGrids} grids, viewport: ${availableHeight}px, container: ${scrollHeight}px`);
    } else {
      // Container fills available height exactly
      container.style.overflowY = 'hidden';
      container.style.maxHeight = '';
      container.style.height = '';
      containerElement.style.height = `${availableHeight}px`;
      
      this.LOG(`[HEIGHT DEBUG] Normal: ${this.currentGrids} grids, container: ${availableHeight}px`);
    }
  }

  // Convert px to % based on the current inner chart height
  private pxToPct(px: number): number {
    const el = this.chartContainer?.nativeElement?.querySelector('#echartContainer') as HTMLElement;
    const h = el?.clientHeight || this.ctx.height || 0;
    return h ? (px / h) * 100 : 0;
  }

  // Get the gap between grids as a percentage, converted from pixels
  private getGapPct(): number {
    return this.pxToPct(GAP_BETWEEN_GRIDS_PX);
  }

  // Helper to check if tooltip should only show hovered grid
  private onlyShowHoveredGrid(): boolean {
    return !!this.ctx.settings?.tooltipOnlyHoveredGrid; // default off
  }
  
  // Helper to get consistent color for an entity
  private getColorForEntity(entityName: string): string {
    if (!entityName) {
      // Fallback for series without entity name
      entityName = '_unknown_' + this.nextColorIndex;
    }
    
    if (!this.entityColorMap[entityName]) {
      // Assign next color from palette
      this.entityColorMap[entityName] = this.colorPalette[this.nextColorIndex % this.colorPalette.length];
      this.nextColorIndex++;
    }
    
    return this.entityColorMap[entityName];
  }
  
  // Refresh entity list for sidebar
  public refreshEntityList(): void {
    if (!this.ctx?.data || !this.chart) {
      this.entityList = [];
      return;
    }
    
    // Group series by entity
    const entityGroups: Record<string, { series: string[], color: string }> = {};
    
    for (let i = 0; i < this.ctx.data.length; i++) {
      const entityName = this.ctx.data[i].datasource?.entityName || 'Unknown';
      const seriesName = this.ctx.data[i].dataKey.label;
      
      if (!entityGroups[entityName]) {
        entityGroups[entityName] = {
          series: [],
          color: this.getColorForEntity(entityName)
        };
      }
      entityGroups[entityName].series.push(seriesName);
    }
    
    // Get current legend selection state
    const opt: any = this.chart.getOption();
    const selected = opt?.legend?.[0]?.selected || {};
    
    // Build entity list
    this.entityList = Object.keys(entityGroups).map(entityName => {
      const group = entityGroups[entityName];
      // Entity is visible if any of its series are visible
      const visible = group.series.some(seriesName => selected[seriesName] !== false);
      
      return {
        name: entityName,
        color: group.color,
        count: group.series.length,
        visible: visible
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    this.ctx.detectChanges();
  }
  
  // Toggle visibility for all series of an entity
  public toggleEntityVisibility(entityName: string): void {
    if (!this.ctx?.data || !this.chart) return;
    
    // Find all series for this entity
    const seriesNames: string[] = [];
    for (let i = 0; i < this.ctx.data.length; i++) {
      const currentEntityName = this.ctx.data[i].datasource?.entityName || 'Unknown';
      if (currentEntityName === entityName) {
        seriesNames.push(this.ctx.data[i].dataKey.label);
      }
    }
    
    if (seriesNames.length === 0) return;
    
    // Get current visibility state
    const opt: any = this.chart.getOption();
    const selected = opt?.legend?.[0]?.selected || {};
    
    // Check if any series is visible
    const anyVisible = seriesNames.some(name => selected[name] !== false);
    
    // Toggle all series for this entity
    const action = anyVisible ? 'legendUnSelect' : 'legendSelect';
    seriesNames.forEach(name => {
      this.chart.dispatchAction({
        type: action,
        name: name
      });
    });
    
    // Refresh entity list to update visibility states
    setTimeout(() => this.refreshEntityList(), 50);
  }

  private initChart(): void {
    this.LOG('[ECharts Line Chart] Initializing chart');
    
    const container = this.chartContainer.nativeElement;
    const containerElement = container.querySelector('#echartContainer') as HTMLElement;
    
    if (!containerElement) {
      this.LOG('[ECharts Line Chart] echartContainer element not found!');
      return;
    }
    
    // Set height for chart container to account for button bar
    if (this.ctx.height) {
      containerElement.style.width = '100%';
      
      // Apply correct scroll height based on current active grids
      this.applyScrollableHeight();
    }
    
    this.chart = echarts.init(containerElement);
    this.LOG('[ECharts Line Chart] Chart instance created:', !!this.chart);
    
    // Show loading spinner immediately
    this.chart.showLoading({
      text: 'Loading...',
      color: '#1976d2',  // ThingsBoard primary blue
      textColor: '#000',
      maskColor: 'rgba(255, 255, 255, 0.8)',
      zlevel: 0,
      fontSize: 14,
      showSpinner: true,
      spinnerRadius: 10,
      lineWidth: 2
    });
    
    this.setTimeFormatter();
    this.initChartAndGrid();
    
    // Don't call onDataUpdated immediately - wait for real data to arrive
    // The data will come through ThingsBoard's data subscription
    if (!this.ctx.data || this.ctx.data.length === 0) {
      this.LOG('[ECharts Line Chart] No data available yet, waiting for data subscription');
    } else {
      this.LOG('[ECharts Line Chart] Data already available:', this.ctx.data.length, 'series');
      // Only update if we have real data with actual points
      const hasRealData = this.ctx.data.some(series => series.data && series.data.length > 0);
      if (hasRealData) {
        this.LOG('[ECharts Line Chart] Real data detected, updating chart');
        this.onDataUpdated();
      } else {
        this.LOG('[ECharts Line Chart] Data series exist but are empty, waiting for real data');
      }
    }
  }

  private initChartAndGrid(): void {
    this.LOG(`=== INIT CHART AND GRID (v${this.CHART_VERSION}) ===`);
    this.LOG('Current grid configuration:', {
      currentGrids: this.currentGrids,
      maxGrids: this.maxGrids,
      currentGridNames: this.currentGridNames
    });
    
    const option = this.getInitConfig();
    
    this.LOG('Building axis arrays...');
    option.xAxis = this.currentXAxisArray();
    this.LOG('xAxis configuration:', option.xAxis);
    
    option.yAxis = this.currentYAxisArray();
    this.LOG('yAxis configuration:', option.yAxis);
    
    option.grid = this.currentGridArray();
    this.LOG('grid configuration:', option.grid);
    
    this.LOG('Setting chart option with grid config...');
    this.chart.setOption(option);
    
    // Register legend selection event listener
    this.chart.on('legendselectchanged', (event: any) => {
      this.onLegendSelectChanged(event);
    });
    
    // Initial refresh of entity list
    setTimeout(() => this.refreshEntityList(), 100);
    
    this.LOG('=== INIT CHART AND GRID COMPLETE ===');
  }

  private onLegendSelectChanged(event: any): void {
    // Reset hovered grid index to avoid stale references
    this.hoveredGridIndex = null;
    
    const selected = event.selected;
    const selectedKeys = Object.keys(selected).filter(key => selected[key]);
    
    // Refresh entity list when legend selection changes
    setTimeout(() => this.refreshEntityList(), 50);
    
    this.LOG("Legend selection changed:", selected);
    this.LOG("Active series:", selectedKeys);
    
    // Ensure at least one entry is selected
    if (selectedKeys.length === 0) {
      const lastSelected = event.name;
      const updatedSelected = { ...selected, [lastSelected]: true };
      
      // Just update the selection state, don't rebuild
      this.chart.setOption({
        legend: {
          selected: updatedSelected
        }
      });
      return;
    }
    
    // Persist the selection state (legend items stay visible but grayed out)
    this.chart.setOption({
      legend: {
        selected: selected
      }
    });
    
    // Check if we need to update grids based on active selection
    if (!this.checkDataGridByName(selectedKeys).has(AXIS_POSITION_NAMES['TOP'])) {
      // Must have at least Top grid, revert selection
      const updatedSelected = { ...selected, [event.name]: true };
      
      this.chart.setOption({
        legend: {
          selected: updatedSelected
        }
      });
      return;
    }
    
    // Set flag to indicate legend is overriding grid calculation
    this.legendOverridesGrids = true;
    
    const oldGridNr = this.currentGrids;
    this.setDataGridByNames(selectedKeys);
    
    if (oldGridNr != this.currentGrids) {
      this.LOG("Grid count changed from", oldGridNr, "to", this.currentGrids);
      this.resetGrid = true;
      
      // Immediately recalculate container height with new grid count
      this.applyScrollableHeight();
      
      // Trigger update to rebuild grids with notMerge
      this.onDataUpdated();
    }
  }

  private subscribeToStateChanges(): void {
    this.LOG('[ECharts Line Chart] Setting up state change detection');
    
    // Method 1: Subscribe to dashboard state controller changes
    if (this.ctx.stateController) {
      this.LOG('[State Detection] StateController found, subscribing to state changes');
      
      try {
        // Subscribe to state change events using the correct method
        this.stateChangeSubscription = this.ctx.stateController.stateChanged().subscribe(() => {
          this.LOG('[State Detection] Dashboard state changed, refreshing chart');
          this.handleStateChange();
        });
      } catch (error) {
        this.LOG('[State Detection] Error subscribing to state changes:', error);
      }
    }
    
    // Method 2: Store initial state and check periodically for changes
    // This is a fallback method when other APIs aren't available
    let lastStateId: string | null = null;
    if (this.ctx.stateController) {
      try {
        const currentState = this.ctx.stateController.getStateId();
        lastStateId = currentState;
        
        // Check periodically for state changes
        const stateCheckInterval = setInterval(() => {
          if (!this.ctx || !this.ctx.stateController) {
            clearInterval(stateCheckInterval);
            return;
          }
          
          const newStateId = this.ctx.stateController.getStateId();
          if (newStateId !== lastStateId) {
            this.LOG('[State Detection] State ID changed from', lastStateId, 'to', newStateId);
            lastStateId = newStateId;
            this.handleStateChange();
          }
        }, 1000); // Check every second
        
        // Store interval ID for cleanup
        (this as any).stateCheckInterval = stateCheckInterval;
      } catch (error) {
        this.LOG('[State Detection] Error setting up state polling:', error);
      }
    }
    
    // Method 3: Subscribe to widget lifecycle events if $scope.$on is available
    if (this.ctx.$scope && this.ctx.$scope.$on) {
      this.LOG('[State Detection] Checking for scope event listeners');
      
      try {
        // Only set up listeners if $on is actually a function
        if (typeof this.ctx.$scope.$on === 'function') {
          // Watch for data source changes
          this.ctx.$scope.$on('widgetConfigUpdated', () => {
            this.LOG('[State Detection] Widget config updated, refreshing chart');
            this.handleStateChange();
          });
          
          // Listen for dashboard state updates
          this.ctx.$scope.$on('dashboardPageChanged', () => {
            this.LOG('[State Detection] Dashboard page changed, refreshing chart');
            setTimeout(() => this.handleStateChange(), 300);
          });
          
          // Listen for mobile/desktop view changes
          this.ctx.$scope.$on('mobileModeChanged', () => {
            this.LOG('[State Detection] Mobile mode changed, refreshing chart');
            setTimeout(() => this.handleStateChange(), 300);
          });
        }
      } catch (error) {
        this.LOG('[State Detection] Error setting up scope listeners:', error);
      }
    }
  }
  
  private handleStateChange(): void {
    this.LOG('[State Change Handler] Processing state change');
    
    // Only refresh if chart is initialized
    if (!this.chart) {
      this.LOG('[State Change Handler] Chart not initialized, skipping refresh');
      return;
    }
    
    // Use setTimeout to ensure DOM is ready after state change
    setTimeout(() => {
      this.LOG('[State Change Handler] Refreshing chart after state change');
      
      // Force resize to recalculate dimensions
      if (this.chart) {
        this.chart.resize();
      }
      
      // Update data if available
      if (this.ctx.data && this.ctx.data.length > 0) {
        this.onDataUpdated();
      } else {
        this.LOG('[State Change Handler] No data available, showing loading');
        this.chart.showLoading({
          text: 'Loading...',
          color: '#1976d2',
          textColor: '#000',
          maskColor: 'rgba(255, 255, 255, 0.8)',
          fontSize: 14,
          showSpinner: true,
          spinnerRadius: 10,
          lineWidth: 2
        });
      }
      
      // Trigger Angular change detection
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
    }, 200);
  }
  
  private setupResizeObserver(): void {
    this.LOG('[HEIGHT DEBUG] Setting up ResizeObserver');
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.LOG(`[HEIGHT DEBUG] ResizeObserver triggered - contentRect: width=${width}, height=${height}`);
        if (width > 0 && height > 0) {
          this.LOG('[ECharts Line Chart] Container resized:', { width, height });
          this.LOG(`[HEIGHT DEBUG] Before resize - ctx.height: ${this.ctx.height}`);
          this.onResize();
          this.LOG(`[HEIGHT DEBUG] After resize - ctx.height: ${this.ctx.height}`);
        }
      }
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
    this.LOG('[HEIGHT DEBUG] ResizeObserver attached to chart container');
  }

  /**
   * Fetch the sensor's "label" attribute from SERVER_SCOPE
   */
  /**
   * Fetch both label and deviceName attributes for export filename
   * Returns format: "label[deviceName]" or appropriate fallback
   */
  private getExportMetadata(): Observable<string> {
    if (!this.ctx.datasources || this.ctx.datasources.length === 0) {
      this.LOG('No datasources available, using default label');
      return of('sensor[unknown]');
    }
    
    // Get the first datasource entity
    const datasource = this.ctx.datasources[0];
    if (!datasource || !datasource.entity) {
      this.LOG('No entity in datasource, using default label');
      return of('sensor[unknown]');
    }
    
    const entity = {
      entityType: datasource.entityType,
      id: datasource.entityId
    };
    
    this.LOG('Fetching label and deviceName for entity:', entity);
    
    // Check if attributeService is available
    if (!this.ctx.attributeService) {
      this.LOG('AttributeService not available, using entity name');
      const entityName = datasource.entityName || 'sensor';
      return of(`${entityName}[unknown]`);
    }
    
    return this.ctx.attributeService
      .getEntityAttributes(entity, 'SERVER_SCOPE' as any, ['label', 'deviceName'])
      .pipe(
        map(attrs => {
          // Find label and deviceName attributes
          const labelAttr = attrs.find((a: any) => a.key === 'label');
          const deviceNameAttr = attrs.find((a: any) => a.key === 'deviceName');
          
          // Extract values with fallbacks
          const label = labelAttr ? String(labelAttr.value) : (datasource.entityName || 'sensor');
          const deviceName = deviceNameAttr ? String(deviceNameAttr.value) : (datasource.name || 'unknown');
          
          this.LOG('Retrieved label:', label, 'deviceName:', deviceName);
          
          // Format as "label[deviceName]" and sanitize for filename
          const combined = `${label}[${deviceName}]`;
          return combined.replace(/[^a-zA-Z0-9-_[\]]/g, '_'); // Sanitize but keep brackets
        }),
        catchError(error => {
          this.LOG('Error fetching attributes:', error);
          const entityName = datasource.entityName || 'sensor';
          return of(`${entityName}[unknown]`);
        })
      );
  }
  
  // Keep the old method for backward compatibility, redirecting to new one
  private getSensorLabel(): Observable<string> {
    return this.getExportMetadata();
  }

  /**
   * Format timestamp to local "YYYY-MM-DD HH:mm:ss" format
   * Matches ThingsBoard's CSV export format exactly
   */
  private formatLocalTimestamp(ms: number): string {
    const d = new Date(ms);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` +
           ` ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  /**
   * Format number with fixed decimal places (avoids scientific notation)
   * Safely handles any input type (string, undefined, null, etc.)
   * Removes unnecessary trailing zeros after the decimal point
   */
  private formatNum(value: any, decimals?: number): string {
    // Convert to number; if it's NaN or not finite, return empty string
    const num = Number(value);
    if (!isFinite(num)) {
      return '';
    }
    // Ensure decimals is a valid number, default to 2
    const decimalPlaces = Math.max(0, Math.floor(Number(decimals) || 2));
    
    // Format with fixed decimals first
    let formatted = num.toFixed(decimalPlaces);
    
    // Remove trailing zeros after decimal point
    // Only if there's a decimal point in the string
    if (formatted.includes('.')) {
      // Remove trailing zeros, and remove decimal point if all decimals were zeros
      formatted = formatted.replace(/(\.\d*?)0+$/, '$1'); // Remove trailing zeros
      formatted = formatted.replace(/\.$/, ''); // Remove decimal point if no decimals left
    }
    
    return formatted;
  }

  /**
   * Format timestamp using the user's timezone settings
   * Matches ThingsBoard's history display format
   */
  private formatTimestamp(timestamp: number): string {
    // Use formatLocalTimestamp for consistency
    return this.formatLocalTimestamp(timestamp);
  }

  /**
   * Build a filename: "label[deviceName]_YYYY-MM-DD_HH-mm-ss-SSS.<ext>"
   * Example: "Temperature_Sensor[Device_01]_2025-01-08_14-30-45-123.csv"
   */
  private makeFilename(ext: string): Observable<string> {
    return this.getSensorLabel().pipe(
      map(labelWithDevice => {
        // Use local time for filename to match export content
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        const ms = String(now.getMilliseconds()).padStart(3, '0');
        
        // Format: label[deviceName]_YYYY-MM-DD_HH-mm-ss-SSS.ext
        const ts = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${ms}`;
        const filename = `${labelWithDevice}_${ts}.${ext}`;
        this.LOG('Generated filename:', filename);
        return filename;
      })
    );
  }

  /**
   * Download helper that uses the dynamic filename
   */
  private downloadFileWithDynamicName(blob: Blob, ext: string): void {
    this.makeFilename(ext).subscribe(filename => {
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        this.LOG(`Downloaded file: ${filename}`);
      }
    });
  }

  private downloadChartImage(): void {
    const img = new Image();
    img.src = this.chart.getDataURL({
      type: 'png',
      pixelRatio: 7,
      backgroundColor: '#fff'
    });

    // Use dynamic filename for image
    this.makeFilename('png').subscribe(filename => {
      const link = document.createElement('a');
      link.href = img.src;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      this.LOG(`Downloaded chart image: ${filename}`);
    });
  }

  private exportDataToCsv(): void {
    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Chart Widget] No data available for CSV export');
      return;
    }
    
    this.LOG('[Chart Widget] Exporting data to CSV with ThingsBoard format');
    
    // Build dynamic headers based on actual data keys
    const headers = ['Timestamp'];
    const dataKeyOrder: string[] = [];
    
    // Collect all unique data keys in the order they appear
    this.ctx.data.forEach((series) => {
      const seriesName = series.dataKey.label || series.dataKey.name;
      if (!dataKeyOrder.includes(seriesName)) {
        dataKeyOrder.push(seriesName);
        headers.push(seriesName);
      }
    });
    
    // Use semicolon separator to match ThingsBoard format
    let csvContent = headers.join(';') + '\n';
    
    // Group points by timestamp
    const timestampMap = new Map<number, Record<string, number>>();
    
    this.ctx.data.forEach((series) => {
      if (series.data) {
        series.data.forEach((point) => {
          const timestamp = point[0];
          const value = point[1];
          
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, {});
          }
          
          const seriesName = series.dataKey.label || series.dataKey.name;
          timestampMap.get(timestamp)![seriesName] = value;
        });
      }
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
    
    // Build rows with proper formatting
    sortedTimestamps.forEach((timestamp) => {
      const dataPoint = timestampMap.get(timestamp)!;
      const parts: string[] = [
        this.formatLocalTimestamp(timestamp)
      ];
      
      // Add values in the same order as headers
      dataKeyOrder.forEach((key) => {
        const value = dataPoint[key];
        const series = this.ctx.data.find(s => 
          (s.dataKey.label || s.dataKey.name) === key
        );
        // Use exportDecimals setting for all exports (default 6 to match ThingsBoard)
        const decimals = this.ctx.settings?.exportDecimals ?? series?.dataKey?.decimals ?? this.ctx.decimals ?? 6;
        parts.push(this.formatNum(value, decimals));
      });
      
      csvContent += parts.join(';') + '\n';
    });
    
    // Create blob and download with dynamic filename
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    this.downloadFileWithDynamicName(blob, 'csv');
    
    this.LOG('[Chart Widget] CSV export completed with ThingsBoard format');
  }

  public exportData(format: 'csv' | 'xls' | 'xlsx'): void {
    this.LOG(`[Chart Widget] Exporting data in ${format.toUpperCase()} format`);
    
    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Chart Widget] No data available for export');
      return;
    }
    
    // Build dynamic headers based on actual data keys
    const headers = ['Timestamp'];
    const dataKeyOrder: string[] = [];
    
    // Collect all unique data keys in the order they appear
    this.ctx.data.forEach((series) => {
      const seriesName = series.dataKey.label || series.dataKey.name;
      if (!dataKeyOrder.includes(seriesName)) {
        dataKeyOrder.push(seriesName);
        headers.push(seriesName);
      }
    });
    
    // Group points by timestamp
    const timestampMap = new Map<number, Record<string, number>>();
    
    this.ctx.data.forEach((series) => {
      if (series.data) {
        series.data.forEach((point) => {
          const timestamp = point[0];
          const value = point[1];
          
          if (!timestampMap.has(timestamp)) {
            timestampMap.set(timestamp, {});
          }
          
          const seriesName = series.dataKey.label || series.dataKey.name;
          timestampMap.get(timestamp)![seriesName] = value;
        });
      }
    });
    
    // Sort timestamps
    const sortedTimestamps = Array.from(timestampMap.keys()).sort((a, b) => a - b);
    
    // Create data rows with consistent formatting
    const dataRows: any[] = [];
    sortedTimestamps.forEach((timestamp) => {
      const dataPoint = timestampMap.get(timestamp)!;
      const row: any[] = [this.formatLocalTimestamp(timestamp)];
      
      // Add values in the same order as headers
      dataKeyOrder.forEach((key) => {
        const value = dataPoint[key];
        const series = this.ctx.data.find(s => 
          (s.dataKey.label || s.dataKey.name) === key
        );
        // Use exportDecimals setting for all export formats (default 6 to match ThingsBoard)
        const decimals = this.ctx.settings?.exportDecimals ?? series?.dataKey?.decimals ?? this.ctx.decimals ?? 6;
        row.push(this.formatNum(value, decimals));
      });
      
      dataRows.push(row);
    });
    
    if (format === 'csv') {
      // Export as CSV with semicolon separator (ThingsBoard format)
      let csvContent = headers.join(';') + '\n';
      dataRows.forEach(row => {
        csvContent += row.join(';') + '\n';
      });
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      this.downloadFileWithDynamicName(blob, 'csv');
      
    } else if (format === 'xls') {
      // Export as HTML table with Excel markup (ThingsBoard style)
      const sheetName = 'ChartData'; // Use generic name for sheet
      
      let htmlContent = '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
                       'xmlns:x="urn:schemas-microsoft-com:office:excel" ' +
                       'xmlns="http://www.w3.org/TR/REC-html40">\n';
      htmlContent += '<meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8"/>\n';
      htmlContent += '<head><!--[if gte mso 9]><xml>\n';
      htmlContent += '<x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>';
      htmlContent += `<x:Name>${sheetName}</x:Name>`;
      htmlContent += '<x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>';
      htmlContent += '</x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>';
      htmlContent += '</xml><![endif]--></head>\n';
      htmlContent += '<body><table>';
      
      // Add headers
      htmlContent += '<tr>';
      headers.forEach(header => {
        htmlContent += `<td><b>${header}</b></td>`;
      });
      htmlContent += '</tr>';
      
      // Add data rows
      dataRows.forEach(row => {
        htmlContent += '<tr>\n';
        row.forEach((cell: any) => {
          htmlContent += `                <td>${cell}</td>`;
        });
        htmlContent += '\n            </tr>';
      });
      
      htmlContent += '</table></body></html>';
      
      const blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });
      this.downloadFileWithDynamicName(blob, 'xls');
      
    } else if (format === 'xlsx') {
      // Export as modern Excel with binary format matching ThingsBoard
      // Create numeric data for XLSX with proper decimal precision
      const xlsxDataRows: any[] = [];
      sortedTimestamps.forEach((timestamp) => {
        const dataPoint = timestampMap.get(timestamp)!;
        const row: any[] = [this.formatLocalTimestamp(timestamp)];
        
        // Add numeric values with proper decimal precision for XLSX
        dataKeyOrder.forEach((key) => {
          const value = dataPoint[key];
          const series = this.ctx.data.find(s => 
            (s.dataKey.label || s.dataKey.name) === key
          );
          // Use exportDecimals setting for XLSX too
          const decimals = this.ctx.settings?.exportDecimals ?? series?.dataKey?.decimals ?? this.ctx.decimals ?? 6;
          
          // Convert to number and round to specified decimals
          const numValue = Number(value);
          if (isFinite(numValue)) {
            // Round to specified decimals and store as number
            // parseFloat removes trailing zeros from toFixed
            const roundedValue = parseFloat(numValue.toFixed(decimals));
            row.push(roundedValue);
          } else {
            row.push(''); // Empty cell for non-numeric values
          }
        });
        
        xlsxDataRows.push(row);
      });
      
      const worksheet_data = [headers, ...xlsxDataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
      
      // Apply header styling (bold, background color)
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "E0E0E0" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
      
      // Apply General number format to data cells (no fixed decimals)
      // This allows Excel to display numbers without trailing zeros
      for (let row = 1; row <= xlsxDataRows.length; row++) {
        for (let col = 1; col < headers.length; col++) { // Skip timestamp column
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
            // Use General format to let Excel handle trailing zeros
            worksheet[cellRef].t = 'n'; // Set type to number
            // Don't set .z format - let Excel use General format which removes trailing zeros
          }
        }
      }
      
      // Calculate dynamic column widths based on content (matching ThingsBoard)
      const columnWidths = headers.map((header, index) => {
        // Find max width for this column
        let maxWidth = header.length;
        xlsxDataRows.forEach(row => {
          const cellValue = row[index];
          if (cellValue !== undefined && cellValue !== null) {
            const strLength = cellValue.toString().length;
            if (strLength > maxWidth) {
              maxWidth = strLength;
            }
          }
        });
        // Add some padding and set min/max bounds like ThingsBoard
        return { wch: Math.min(Math.max(maxWidth + 2, 10), 50) };
      });
      worksheet['!cols'] = columnWidths;
      
      // Add autofilter to the data range
      worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1:A1' };
      
      // Get widget name from context for sheet name (like ThingsBoard)
      let sheetName = 'Chart Data'; // Default fallback
      if (this.ctx && this.ctx.widgetTitle) {
        // Clean sheet name to be Excel-compatible (max 31 chars, no special chars)
        sheetName = this.ctx.widgetTitle
          .replace(/[/\\?*[\]]/g, '_') // Replace invalid chars
          .substring(0, 31); // Excel sheet name limit
      } else if (this.ctx && this.ctx.widgetConfig && this.ctx.widgetConfig.title) {
        sheetName = this.ctx.widgetConfig.title
          .replace(/[/\\?*[\]]/g, '_')
          .substring(0, 31);
      }
      
      // Create workbook with ThingsBoard-style metadata
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      
      // Set workbook properties to match ThingsBoard
      workbook.Props = {
        Title: sheetName,
        Subject: 'ThingsBoard Chart Data Export',
        Author: 'ThingsBoard',
        Manager: 'ThingsBoard Platform',
        Company: 'ThingsBoard',
        Category: 'IoT Data',
        Keywords: 'ThingsBoard, IoT, Time Series',
        Comments: `Exported from ${sheetName} widget`,
        CreatedDate: new Date(),
        ModifiedDate: new Date(),
        Application: 'ThingsBoard Platform',
        AppVersion: '3.0'
      };
      
      // Add workbook view settings
      if (!workbook.Workbook) workbook.Workbook = {};
      if (!workbook.Workbook.Views) workbook.Workbook.Views = [];
      workbook.Workbook.Views[0] = {
        RTL: false
      };
      
      // Write workbook with optimized settings matching ThingsBoard
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        bookSST: true, // Use shared strings table like ThingsBoard
        compression: true, // Enable compression
        Props: workbook.Props,
        cellDates: false, // Keep dates as strings like ThingsBoard
        cellStyles: true // Include cell styles
      });
      
      const blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      this.downloadFileWithDynamicName(blob, 'xlsx');
    }
    
    this.LOG(`[Chart Widget] Export initiated for format: ${format}`);
  }
  

  private overrideCsvExport(): void {
    // Monitor for dynamic saveAs calls
    const checkInterval = setInterval(() => {
      if ((window as any).saveAs && !(window as any).saveAs._customOverride) {
        const originalSaveAs = (window as any).saveAs;
        
        (window as any).saveAs = function(blob: Blob, filename: string) {
          if (filename && (filename.endsWith('.csv') || filename.toLowerCase().includes('export'))) {
            console.log('[Chart Widget] Persistent saveAs override triggered');
            return originalSaveAs.call(this, blob, 'Hello_Thomas.csv');
          }
          return originalSaveAs.call(this, blob, filename);
        };
        
        (window as any).saveAs._customOverride = true;
        (window as any).saveAs._original = originalSaveAs;
      }
    }, 500);
    
    // Clean up interval on widget destroy
    const originalDestroy = this.ngOnDestroy.bind(this);
    this.ngOnDestroy = () => {
      clearInterval(checkInterval);
      if ((window as any).saveAs && (window as any).saveAs._original) {
        (window as any).saveAs = (window as any).saveAs._original;
      }
      originalDestroy();
    };
  }

  private resetChartCompletely(keepGrids = false): void {
    this.chart.clear();
    
    // Show loading during reset
    this.chart.showLoading({
      text: 'Resetting...',
      color: '#1976d2',
      textColor: '#000',
      maskColor: 'rgba(255, 255, 255, 0.8)',
      fontSize: 14,
      showSpinner: true,
      spinnerRadius: 10,
      lineWidth: 2
    });
    
    if (!keepGrids) {
      this.currentGrids = this.maxGrids;
    }
    this.initChartAndGrid();
    this.onDataUpdated();
  }

  private resetZoom(): void {
    this.chart.dispatchAction({
      type: 'dataZoom',
      start: 0,
      end: 100
    });
  }

  // Helper methods from ThingsBoard example
  public menuButtons(buttonName: string): void {
    switch (buttonName) {
      case 'genImage':
        this.LOG("Picture Button clicked!!!!");
        this.downloadChartImage();
        break;
      case 'reset':
        this.resetChartCompletely();
        break;
      case 'exportCsv':
        this.LOG("CSV Export Button clicked!!!!");
        this.exportDataToCsv();
        break;
    }
  }

  private isContainerHeight(): any {
    this.LOG(`[HEIGHT DEBUG] ctx.height: ${this.ctx.height}, limits: [${this.containerHeightLimit[0]}, ${this.containerHeightLimit[1]}]`);
    
    if ((this.ctx.height >= this.containerHeightLimit[0]) && 
        (this.ctx.height < this.containerHeightLimit[1])) {
      this.LOG("isContainerHeight:", "LARGE!!!");
      this.LOG(`[HEIGHT DEBUG] Selected LARGE config (height ${this.ctx.height} is between ${this.containerHeightLimit[0]} and ${this.containerHeightLimit[1]})`);
      this.currentSize = SIZE_NAMES.LARGE;
      return this.ifLargeContainerConfig();
    } else if (this.ctx.height >= this.containerHeightLimit[1]) {
      this.LOG("isContainerHeight:", "HUGE!!!");
      this.LOG(`[HEIGHT DEBUG] Selected HUGE config (height ${this.ctx.height} >= ${this.containerHeightLimit[1]})`);
      this.currentSize = SIZE_NAMES.HUGE;
      return this.ifHugeContainerConfig();
    }
    this.LOG("isContainerHeight:", "Small!!!");
    this.LOG(`[HEIGHT DEBUG] Selected SMALL config (height ${this.ctx.height} < ${this.containerHeightLimit[0]})`);
    this.currentSize = SIZE_NAMES.SMALL;
    return this.ifSmallContainerConfig();
  }

  private currentGridArray(): any[] {
    this.LOG('currentGridArray called with currentGrids:', this.currentGrids, 'currentSize:', this.currentSize);
    let gridArray = [];
    
    // Use unified calculation for all grid counts to ensure consistent spacing
    if (this.currentGrids > 3) {
      // For scrollable layouts, use the existing calculation
      gridArray = this.calculateScrollableGrids(this.currentGrids);
    } else {
      // For 1-3 grids, use the same unified spacing calculation
      const grids = [];
      const leftMargin = this.currentSize === 'small' ? '12%' : '10%';
      const rightMargin = '1%';
      
      // Use consistent top reserve
      const topReserved = GAP_TOP_RESERVED_PCT;
      
      // Convert total pixel reserve to percentage
      const totalBottomPixels = DATAZOOM_HEIGHT_PX + DATAZOOM_BOTTOM_PX + GAP_BEFORE_DATAZOOM_PX;
      const bottomReservedPct = this.pxToPct(totalBottomPixels);
      
      // Get unified gap between grids
      const gapPct = this.getGapPct();
      
      // Calculate available height
      const availableHeight = 100 - topReserved - bottomReservedPct;
      
      // Calculate gaps and grid height
      const totalGaps = this.currentGrids > 1 ? gapPct * (this.currentGrids - 1) : 0;
      const gridHeight = (availableHeight - totalGaps) / this.currentGrids;
      
      // Build grids with consistent spacing
      for (let i = 0; i < this.currentGrids; i++) {
        const topPosition = topReserved + i * (gridHeight + gapPct);
        grids.push({
          id: i === 0 ? 'main' : `sub${i}`,
          top: `${topPosition}%`,
          left: leftMargin,
          right: rightMargin,
          height: `${gridHeight}%`
        });
      }
      
      gridArray = grids;
    }
    
    this.LOG('Grid array configuration:', gridArray);
    return gridArray;
  }
  
  private calculateScrollableGrids(numGrids: number): any[] {
    const grids = [];
    const leftMargin = this.currentSize === 'small' ? '12%' : '10%';
    const rightMargin = '1%';
    
    // Reserve space for legend at top
    const topReserved = GAP_TOP_RESERVED_PCT; // Use constant for legend space
    
    // Convert pixel reserves to percentages for consistent math
    const totalBottomPixels = DATAZOOM_HEIGHT_PX + DATAZOOM_BOTTOM_PX + GAP_BEFORE_DATAZOOM_PX;
    const bottomReserved = this.pxToPct(totalBottomPixels);
    
    // Get gap between grids as percentage from pixels
    const gapPct = this.getGapPct();
    
    // Total vertical budget for plots + their gaps
    const availableHeight = 100 - topReserved - bottomReserved;
    
    // Calculate total gaps between plots
    const gapsBetweenPlots = numGrids > 1 ? gapPct * (numGrids - 1) : 0;
    
    // Height each plot can use
    const gridHeight = (availableHeight - gapsBetweenPlots) / numGrids;
    
    for (let i = 0; i < numGrids; i++) {
      // Accumulate top by adding plot heights and the inter-plot gaps only
      const topPosition = topReserved + i * (gridHeight + gapPct);
      const grid: any = {
        id: i === 0 ? 'main' : `sub${i}`,
        top: `${topPosition}%`,
        left: leftMargin,
        right: rightMargin,
        height: `${gridHeight}%`
      };
      
      grids.push(grid);
    }
    
    this.LOG('Calculated scrollable grids:', grids);
    return grids;
  }

  private currentXAxisArray(): any[] {
    const myXAxisArray = [];
    
    // Common formatter function that can be reused for all axes
    const createAxisFormatter = (isFirstGrid: boolean) => {
      return (value: any, index: any) => {
        // Only apply special first label formatting for the first grid
        const useFirstLabelFormat = isFirstGrid && index === 0;
        
        switch (this.usedFormatter.id) {
          case 'months':
          case 'days':
            return useFirstLabelFormat
              ? this.firstLabelFormatterWithDays().format(value).replace(",", ",\n") 
              : this.usedFormatter.formatter.format(value).replace(",", ",\n");
          case 'minutes':
            return useFirstLabelFormat
              ? this.firstLabelFormatterWithMinutes().format(value).replace(",", ",\n") 
              : this.usedFormatter.formatter.format(value).replace(",", ",\n");
          case 'seconds':
            return useFirstLabelFormat
              ? this.firstLabelFormatterWithSeconds().format(value).replace(",", ",\n") 
              : this.usedFormatter.formatter.format(value).replace(",", ",\n");
        }
      };
    };
    
    // First x-axis (for grid 0)
    myXAxisArray.push({
      type: 'time',
      gridIndex: 0,
      splitLine: {
        show: true,
        lineStyle: {
          width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
        }
      },
      axisLine: { onZero: false },
      position: 'bottom',
      axisLabel: {
        show: true,
        fontSize: this.currentConfig.option.xAxis.axisLabel.fontSize,
        fontWeight: this.currentConfig.option.xAxis.axisLabel.fontWeight,
        hideOverlap: true,
        interval: 'auto',
        formatter: createAxisFormatter(true), // First grid gets special first label
        rotate: this.currentConfig.option.xAxis.rotate,
        align: 'right',
        margin: this.currentConfig.option.xAxis.margin,
        showMinLabel: true,
        showMaxLabel: true
      },
      min: this.ctx.timeWindow.minTime,
      max: this.ctx.timeWindow.maxTime,
    });
    
    // Add X axes for additional grids - now WITH visible labels
    for (let i = 1; i < this.currentGrids; i++) {
      myXAxisArray.push({
        type: 'time',
        gridIndex: i,
        show: true,
        splitLine: {
          show: true,
          lineStyle: {
            width: this.currentConfig.option.xAxis.splitLine?.lineStyle?.width || this.currentConfig.option.yAxis.splitLine.lineStyle.width,
            color: '#e0e0e0',
            type: 'solid'
          }
        },
        axisLine: { 
          onZero: false,
          show: true,
          lineStyle: {
            color: '#999'
          }
        },
        axisTick: { 
          show: true,
          alignWithLabel: true 
        },
        position: 'bottom', // Always position at bottom for all grids
        axisLabel: {
          show: true, // NOW SHOWING LABELS ON ALL GRIDS
          fontSize: this.currentConfig.option.xAxis.axisLabel.fontSize,
          fontWeight: this.currentConfig.option.xAxis.axisLabel.fontWeight,
          hideOverlap: true,
          interval: 'auto', // Auto interval to prevent overcrowding
          formatter: createAxisFormatter(false), // Other grids don't get special first label
          rotate: this.currentConfig.option.xAxis.rotate,
          align: 'right',
          margin: this.currentConfig.option.xAxis.margin,
          showMinLabel: true,
          showMaxLabel: true
        },
        min: this.ctx.timeWindow.minTime,
        max: this.ctx.timeWindow.maxTime,
      });
    }
    return myXAxisArray;
  }

  private currentYAxisArray(): any[] {
    const myYAxisArray = [];
    const tempUnits = this.getGridUnitsByData();
    this.LOG("currentXAxisArray getGridUnitsByData:", tempUnits);
    
    myYAxisArray.push({
      type: 'value',
      scale: true,
      splitNumber: this.currentConfig.option.yAxis.splitNumber,
      name: this.ctx.settings.yAxisLeftTitle || '',
      axisLabel: {
        formatter: '{value} ' + (tempUnits[0] || ""),
        color: this.ctx.settings.legendcolortext,
        fontSize: this.currentConfig.option.yAxis.axisLabel.fontSize,
        fontWeight: this.currentConfig.option.yAxis.axisLabel.fontWeight,
        showMinLabel: true,
        showMaxLabel: true
      },
      splitLine: {
        show: true,
        lineStyle: {
          width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
        }
      },
      gridIndex: 0,
    });
    
    // Add Y axes for all grids
    for (let i = 1; i < this.currentGrids; i++) {
      myYAxisArray.push({
        type: 'value',
        show: true,
        scale: true,
        splitNumber: this.currentConfig.option.yAxis.splitNumber,
        alignTicks: true,
        name: i === 1 ? (this.ctx.settings.yAxisRightTitle || '') : '',
        axisLabel: {
          formatter: '{value} ' + (tempUnits[i] || ''),
          fontSize: this.currentConfig.option.yAxis.axisLabel.fontSize,
          fontWeight: this.currentConfig.option.yAxis.axisLabel.fontWeight,
          show: true,
          showMaxLabel: true,
        },
        splitLine: {
          show: true,
          lineStyle: {
            width: this.currentConfig.option.yAxis.splitLine.lineStyle.width
          }
        },
        gridIndex: i
      });
    }
    return myYAxisArray;
  }

  private checkDataGridByName(selectedKeys: string[]): Set<string> {
    const matchedValues = selectedKeys.map(key => {
      const foundObject = this.ctx.data.find(obj => obj.dataKey.label === key);
      // Default to 'Top' if no assignment is set
      return foundObject ? (foundObject.dataKey.settings?.axisAssignment || 'Top') : null;
    });
    this.LOG("matchedValues:", matchedValues);
    
    const axisPositionMap = this.getAxisPositionMap();
    const uniqueMatches = new Set(matchedValues.filter(item => item && Object.prototype.hasOwnProperty.call(axisPositionMap, item)));
    this.LOG("uniqueMatches:", uniqueMatches, ", len:", uniqueMatches.size);
    return uniqueMatches;
  }

  private setDataGridByNames(selectedKeys: string[]): void {
    this.LOG('setDataGridByNames called with:', selectedKeys);
    
    // Get unique axis assignments from selected series
    const selectedGrids = this.checkDataGridByName(selectedKeys);
    
    // Update current grid configuration
    this.currentGridNames = Array.from(selectedGrids);
    this.currentGrids = selectedGrids.size;
    
    this.LOG('Updated grid configuration from legend:');
    this.LOG('- currentGridNames:', this.currentGridNames);
    this.LOG('- currentGrids:', this.currentGrids);
  }

  private countGridsBySettings(selectedKeys: string[]): Set<string> {
    this.LOG('countGridsBySettings called with keys:', selectedKeys);
    
    const axisPositionMap = this.getAxisPositionMap();
    
    // Collect all unique axisAssignment values from the data
    const axisAssignments = this.ctx.data
      .map((item, index) => {
        // Default to 'Top' if no assignment is set
        const assignment = item.dataKey?.settings?.axisAssignment || 'Top';
        this.LOG(`  - Data[${index}] axisAssignment:`, assignment, 
                 'Valid:', Object.prototype.hasOwnProperty.call(axisPositionMap, assignment));
        return assignment;
      })
      .filter(assignment => Object.prototype.hasOwnProperty.call(axisPositionMap, assignment));
    
    this.LOG('Filtered valid assignments:', axisAssignments);
    const uniqueAssignments = new Set(axisAssignments);
    this.LOG('Unique assignments:', Array.from(uniqueAssignments));
    
    return uniqueAssignments;
  }
  
  private getDynamicAxisIndexMap(): Record<string, number> {
    // If no grids are set, fall back to standard map
    if (!this.currentGridNames || this.currentGridNames.length === 0) {
      return this.getAxisPositionMap();
    }
    
    // Build dynamic map based on currently active grids
    const dynamicMap: Record<string, number> = {};
    this.currentGridNames.forEach((gridName, index) => {
      dynamicMap[gridName] = index;
    });
    
    this.LOG('Dynamic axis index map:', dynamicMap);
    return dynamicMap;
  }
  
  private getLegendState(): { data: string[]; selected: Record<string, boolean> } {
    // Get all series labels from data
    const data = (this.ctx.data || [])
      .map(s => s?.dataKey?.label)
      .filter(Boolean);
    
    // Try to preserve existing legend selection state
    let selected: Record<string, boolean> = {};
    try {
      const opt: any = this.chart?.getOption?.();
      if (opt?.legend && opt.legend[0]?.selected) {
        selected = { ...opt.legend[0].selected };
      }
    } catch (e) {
      this.LOG('Could not retrieve existing legend state:', e);
    }
    
    // Default new series to ON if not in existing selection
    for (const name of data) {
      if (!(name in selected)) {
        selected[name] = true;
      }
    }
    
    this.LOG('Legend state:', { data, selected });
    return { data, selected };
  }

  private getGridUnitsByData(): string[] {
    if (this.currentGridNames && (this.currentGridNames.length > 0)) {
      return this.currentGridNames.map(key => {
        return this.getDataUnitForGrid(key);
      }) || [];
    }
    return ["", "", ""];
  }

  private getDataUnitForGrid(gridName: string): string {
    const found = this.ctx.data.find(item => 
      item.dataKey?.settings?.axisAssignment === gridName
    );
    return found?.dataKey?.units || "";
  }

  private setTimeFormatter(): void {
    try {
      if (!this.ctx.data || !this.ctx.data[0] || !this.ctx.data[0].data || this.ctx.data[0].data.length === 0) {
        this.usedFormatter = this.zoomFormatterWithMinutes();
        return;
      }
      
      const myData = this.ctx.data[0].data;
      const minTime = myData[0][0];
      const maxTime = myData[myData.length - 1][0];
      const totalTimeSpan = maxTime - minTime;
      
      if (totalTimeSpan <= this.zoomTimeWithSeconds) {
        this.usedFormatter = this.zoomFormatterWithSeconds();
      } else if (totalTimeSpan <= this.zoomTimeWithMinutes) {
        this.usedFormatter = this.zoomFormatterWithMinutes();
      } else if (totalTimeSpan <= this.zoomTimeWithDays) {
        this.usedFormatter = this.zoomFormatterWithDays();
      } else {
        this.usedFormatter = this.zoomFormatterWithMonths();
      }
    } catch {
      this.usedFormatter = this.zoomFormatterWithMinutes();
    }
  }

  private getInitConfig(): any {
    // Get legend state to preserve selection
    const legendState = this.getLegendState();
    
    return {
      legend: {
        show: true,
        type: 'scroll',
        data: legendState.data,
        selected: legendState.selected,
        selectedMode: true,
        icon: 'none',  // No icons, text only
        itemWidth: 0,   // No icon width
        itemHeight: 0,  // No icon height
        itemGap: this.currentConfig.option.legend.itemGap,
        textStyle: {
          color: this.ctx.settings.legendcolortext || '#000000',
          fontWeight: this.currentConfig.option.legend.textStyle.fontWeight,
          fontSize: this.currentConfig.option.legend.textStyle.fontSize
        },
        tooltip: {
          show: true,
          backgroundColor: 'rgba(50, 50, 50, 0.8)',
          textStyle: { color: '#fff' },
          borderColor: '#fff',
          borderWidth: 1,
          formatter: (p: any) => `Click "${p.name}" to hide or show data.`
        }
      },
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        confine: true,
        axisPointer: {
          type: 'cross',
          snap: true,
          link: [{
            xAxisIndex: 'all'
          }]
        },
        // Track which grid the mouse is over
        position: (point: number[]) => {
          // Detect which grid contains the mouse position
          if (this.chart) {
            for (let i = 0; i < this.currentGrids; i++) {
              if (this.chart.containPixel({ gridIndex: i }, point)) {
                this.hoveredGridIndex = i;
                break;
              }
            }
          }
          // Return null to use default positioning
          return null;
        },
        formatter: (params: any[]) => {
          if (!params?.length) return '';

          // Filter to hovered grid if option enabled
          let list = params;
          if (this.onlyShowHoveredGrid() && this.hoveredGridIndex !== null) {
            const filtered = params.filter(
              p => (p.axisIndex ?? p.axis?.axisIndex ?? 0) === this.hoveredGridIndex
            );
            
            // Check if we should show all series based on threshold
            const threshold = this.ctx.settings?.tooltipShowAllIfSeriesCountLTE || 0;
            if (threshold > 0) {
              // Count TOTAL visible series across ALL grids
              const opt: any = this.chart?.getOption?.();
              const selected = opt?.legend?.[0]?.selected || {};
              
              // Count total visible series across all grids
              const totalVisibleSeries = params.filter(p => selected[p.seriesName] !== false).length;
              
              // If total visible series <= threshold, show all series from all grids
              if (totalVisibleSeries <= threshold) {
                list = params;
              } else {
                // Otherwise use filtered list (fallback to all if empty)
                list = filtered.length > 0 ? filtered : params;
              }
            } else {
              // No threshold - use normal behavior
              list = filtered.length > 0 ? filtered : params;
            }
          }

          // Get timestamp - always show header even if no items
          const ts = list[0]?.value?.[0];
          const tsStr = this.firstLabelFormatterWithSeconds().format(ts);

          // Respect legend selection
          const opt: any = this.chart?.getOption?.();
          const selected = opt?.legend?.[0]?.selected || {};
          const visible = list.filter(p => selected[p.seriesName] !== false);

          // Sort and cap (user setting or default 10)
          const MAX_ITEMS = this.ctx.settings?.tooltipMaxItems ?? 10;
          visible.sort((a, b) => Math.abs(b.value[1]) - Math.abs(a.value[1]));
          const items = visible.slice(0, MAX_ITEMS);
          const hiddenCount = Math.max(visible.length - items.length, 0);

          // Get unit for the current grid
          const gridIdx = this.hoveredGridIndex ?? 
            (items[0]?.axisIndex ?? items[0]?.axis?.axisIndex ?? 0);
          const unit = (this.getGridUnitsByData()[gridIdx] || '').trim();

          // Always return at least the header to keep crosshair visible
          let html = `<div style="min-width:190px">
            <div style="margin-bottom:4px;font-weight:600">${tsStr}</div>`;

          if (items.length > 0) {
            html += `<table style="border-collapse:collapse;font-size:12px;width:100%">`;
            
            const decimals = this.ctx.decimals ?? 2;
            for (const it of items) {
              const val = Number(it.value[1]);
              html += `<tr>
                <td style="padding:2px 6px 2px 0;white-space:nowrap">${it.marker} ${it.seriesName}</td>
                <td style="padding:2px 0;text-align:right">${isFinite(val) ? val.toFixed(decimals) : ''}${unit ? ' ' + unit : ''}</td>
              </tr>`;
            }
            if (hiddenCount > 0) {
              html += `<tr><td colspan="2" style="padding-top:4px;opacity:.7">+ ${hiddenCount} more…</td></tr>`;
            }
            html += `</table>`;
          }
          
          html += `</div>`;
          return html;
        }
      },
      axisPointer: {
        link: [{
          xAxisIndex: 'all'
        }]
      },
      dataZoom: this.getDataZoomConfig()
    };
  }

  private getDataZoomConfig(): any[] {
    // DataZoom using fixed pixel dimensions for consistent appearance
    return [
      {
        show: true,
        xAxisIndex: 'all',
        type: 'slider',
        bottom: DATAZOOM_BOTTOM_PX,         // Fixed pixel gap from bottom
        height: DATAZOOM_HEIGHT_PX,         // Fixed pixel height
        handleSize: '70%',                  // Slimmer handles help visual fit
        moveHandleSize: 5,
        start: 0,
        end: 100
      },
      {
        type: 'inside',
        xAxisIndex: 'all',
        start: 0,
        end: 100
      }
    ];
  }

  // Utility methods
  private LOG(...args: any[]): void {
    if (this.DEBUG) {
      console.log("[sc chart v6.1 3sub production]", ...args);
    }
  }

  private LOGE(...args: any[]): void {
    if (this.DEBUG) {
      console.error("[sc chart v6.1 3sub production] ERROR:", ...args);
    }
  }

  // Configuration objects
  private gridConfig(): any {
    return {
      "singleGrid": {
        "small": [{
          "id": "main",
          "top": "8%",
          "left": "12%",
          "right": "1%",
          "height": "70%",
          "bottom": "2%"
        }],
        "large": [{
          "id": "main",
          "top": "5%",
          "left": "12%",
          "right": "1%",
          "height": "75%",
          "bottom": "2%"
        }],
        "huge": [{
          "id": "main",
          "top": "5%",
          "left": "10%",
          "right": "1%",
          "height": "75%",
          "bottom": "2%"
        }]
      },
      "doubleGrid": {
        "small": [
          {
            "id": "main",
            "top": "8%",
            "left": "12%",
            "right": "1%",
            "height": "30%"
          },
          {
            "id": "sub",
            "top": "50%",
            "left": "12%",
            "right": "1%",
            "bottom": "2%",
            "height": "30%"
          }
        ],
        "large": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "35%"
          },
          {
            "id": "sub",
            "top": "50%",
            "left": "10%",
            "right": "1%",
            "bottom": "2%",
            "height": "35%"
          }
        ],
        "huge": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "35%"
          },
          {
            "id": "sub",
            "top": "50%",
            "left": "10%",
            "right": "1%",
            "bottom": "2%",
            "height": "35%"
          }
        ]
      },
      "tripleGrid": {
        "small": [
          {
            "id": "main",
            "top": "5%",
            "left": "12%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub",
            "top": "36%",
            "left": "12%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub2",
            "top": "68%",
            "left": "12%",
            "right": "1%",
            "height": "20%"
          }
        ],
        "large": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub",
            "top": "36%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub2",
            "top": "68%",
            "left": "10%",
            "right": "1%",
            "bottom": "2%",
            "height": "20%"
          }
        ],
        "huge": [
          {
            "id": "main",
            "top": "5%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub",
            "top": "35%",
            "left": "10%",
            "right": "1%",
            "height": "20%"
          },
          {
            "id": "sub2",
            "top": "65%",
            "left": "10%",
            "right": "1%",
            "bottom": "10%",
            "height": "20%"
          }
        ]
      },
      "quadGrid": {
        "small": [
          { "id": "main", "top": "3%", "left": "12%", "right": "1%", "height": "15%" },
          { "id": "sub1", "top": "25%", "left": "12%", "right": "1%", "height": "15%" },
          { "id": "sub2", "top": "47%", "left": "12%", "right": "1%", "height": "15%" },
          { "id": "sub3", "top": "69%", "left": "12%", "right": "1%", "height": "15%" }
        ],
        "large": [
          { "id": "main", "top": "3%", "left": "10%", "right": "1%", "height": "17%" },
          { "id": "sub1", "top": "25%", "left": "10%", "right": "1%", "height": "17%" },
          { "id": "sub2", "top": "47%", "left": "10%", "right": "1%", "height": "17%" },
          { "id": "sub3", "top": "69%", "left": "10%", "right": "1%", "bottom": "2%", "height": "17%" }
        ],
        "huge": [
          { "id": "main", "top": "3%", "left": "10%", "right": "1%", "height": "18%" },
          { "id": "sub1", "top": "24%", "left": "10%", "right": "1%", "height": "18%" },
          { "id": "sub2", "top": "45%", "left": "10%", "right": "1%", "height": "18%" },
          { "id": "sub3", "top": "66%", "left": "10%", "right": "1%", "bottom": "10%", "height": "18%" }
        ]
      },
      "quintGrid": {
        "small": [
          { "id": "main", "top": "2%", "left": "12%", "right": "1%", "height": "12%" },
          { "id": "sub1", "top": "19%", "left": "12%", "right": "1%", "height": "12%" },
          { "id": "sub2", "top": "36%", "left": "12%", "right": "1%", "height": "12%" },
          { "id": "sub3", "top": "53%", "left": "12%", "right": "1%", "height": "12%" },
          { "id": "sub4", "top": "70%", "left": "12%", "right": "1%", "height": "12%" }
        ],
        "large": [
          { "id": "main", "top": "2%", "left": "10%", "right": "1%", "height": "14%" },
          { "id": "sub1", "top": "19%", "left": "10%", "right": "1%", "height": "14%" },
          { "id": "sub2", "top": "36%", "left": "10%", "right": "1%", "height": "14%" },
          { "id": "sub3", "top": "53%", "left": "10%", "right": "1%", "height": "14%" },
          { "id": "sub4", "top": "70%", "left": "10%", "right": "1%", "bottom": "2%", "height": "14%" }
        ],
        "huge": [
          { "id": "main", "top": "2%", "left": "10%", "right": "1%", "height": "15%" },
          { "id": "sub1", "top": "19%", "left": "10%", "right": "1%", "height": "15%" },
          { "id": "sub2", "top": "36%", "left": "10%", "right": "1%", "height": "15%" },
          { "id": "sub3", "top": "53%", "left": "10%", "right": "1%", "height": "15%" },
          { "id": "sub4", "top": "70%", "left": "10%", "right": "1%", "bottom": "10%", "height": "15%" }
        ]
      },
      "hexGrid": {
        "small": [
          { "id": "main", "top": "2%", "left": "12%", "right": "1%", "height": "10%" },
          { "id": "sub1", "top": "16%", "left": "12%", "right": "1%", "height": "10%" },
          { "id": "sub2", "top": "30%", "left": "12%", "right": "1%", "height": "10%" },
          { "id": "sub3", "top": "44%", "left": "12%", "right": "1%", "height": "10%" },
          { "id": "sub4", "top": "58%", "left": "12%", "right": "1%", "height": "10%" },
          { "id": "sub5", "top": "72%", "left": "12%", "right": "1%", "height": "10%" }
        ],
        "large": [
          { "id": "main", "top": "2%", "left": "10%", "right": "1%", "height": "12%" },
          { "id": "sub1", "top": "16%", "left": "10%", "right": "1%", "height": "12%" },
          { "id": "sub2", "top": "30%", "left": "10%", "right": "1%", "height": "12%" },
          { "id": "sub3", "top": "44%", "left": "10%", "right": "1%", "height": "12%" },
          { "id": "sub4", "top": "58%", "left": "10%", "right": "1%", "height": "12%" },
          { "id": "sub5", "top": "72%", "left": "10%", "right": "1%", "bottom": "2%", "height": "12%" }
        ],
        "huge": [
          { "id": "main", "top": "2%", "left": "10%", "right": "1%", "height": "13%" },
          { "id": "sub1", "top": "16%", "left": "10%", "right": "1%", "height": "13%" },
          { "id": "sub2", "top": "30%", "left": "10%", "right": "1%", "height": "13%" },
          { "id": "sub3", "top": "44%", "left": "10%", "right": "1%", "height": "13%" },
          { "id": "sub4", "top": "58%", "left": "10%", "right": "1%", "height": "13%" },
          { "id": "sub5", "top": "72%", "left": "10%", "right": "1%", "bottom": "10%", "height": "13%" }
        ]
      },
      "septGrid": {
        "small": [
          { "id": "main", "top": "2%", "left": "12%", "right": "1%", "height": "9%" },
          { "id": "sub1", "top": "14%", "left": "12%", "right": "1%", "height": "9%" },
          { "id": "sub2", "top": "26%", "left": "12%", "right": "1%", "height": "9%" },
          { "id": "sub3", "top": "38%", "left": "12%", "right": "1%", "height": "9%" },
          { "id": "sub4", "top": "50%", "left": "12%", "right": "1%", "height": "9%" },
          { "id": "sub5", "top": "62%", "left": "12%", "right": "1%", "height": "9%" },
          { "id": "sub6", "top": "74%", "left": "12%", "right": "1%", "height": "9%" }
        ],
        "large": [
          { "id": "main", "top": "2%", "left": "10%", "right": "1%", "height": "10%" },
          { "id": "sub1", "top": "14%", "left": "10%", "right": "1%", "height": "10%" },
          { "id": "sub2", "top": "26%", "left": "10%", "right": "1%", "height": "10%" },
          { "id": "sub3", "top": "38%", "left": "10%", "right": "1%", "height": "10%" },
          { "id": "sub4", "top": "50%", "left": "10%", "right": "1%", "height": "10%" },
          { "id": "sub5", "top": "62%", "left": "10%", "right": "1%", "height": "10%" },
          { "id": "sub6", "top": "74%", "left": "10%", "right": "1%", "bottom": "2%", "height": "10%" }
        ],
        "huge": [
          { "id": "main", "top": "2%", "left": "10%", "right": "1%", "height": "11%" },
          { "id": "sub1", "top": "14%", "left": "10%", "right": "1%", "height": "11%" },
          { "id": "sub2", "top": "26%", "left": "10%", "right": "1%", "height": "11%" },
          { "id": "sub3", "top": "38%", "left": "10%", "right": "1%", "height": "11%" },
          { "id": "sub4", "top": "50%", "left": "10%", "right": "1%", "height": "11%" },
          { "id": "sub5", "top": "62%", "left": "10%", "right": "1%", "height": "11%" },
          { "id": "sub6", "top": "74%", "left": "10%", "right": "1%", "bottom": "10%", "height": "11%" }
        ]
      }
    };
  }

  // Formatter configurations
  private zoomFormatterWithMonths(): any {
    return {
      id: 'months',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        year: '2-digit',
        month: '2-digit'
      })
    };
  }

  private zoomFormatterWithDays(): any {
    return {
      id: 'days',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit'
      })
    };
  }

  private zoomFormatterWithMinutes(): any {
    return {
      id: 'minutes',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        hour: '2-digit',
        minute: '2-digit',
        month: '2-digit',
        day: '2-digit',
      })
    };
  }

  private zoomFormatterWithSeconds(): any {
    return {
      id: 'seconds',
      formatter: new Intl.DateTimeFormat(this.browserLocale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      })
    };
  }

  private firstLabelFormatterWithDays(): any {
    return new Intl.DateTimeFormat(this.browserLocale, {
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  private firstLabelFormatterWithMinutes(): any {
    return new Intl.DateTimeFormat(this.browserLocale, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  private firstLabelFormatterWithSeconds(): any {
    return new Intl.DateTimeFormat(this.browserLocale, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short',
      year: '2-digit',
    });
  }

  private ifSmallContainerConfig(): any {
    return {
      "seriesElement": {
        "lineStyle": {
          "width": 4,
          "widthMiddle": 3
        },
        "markline": {
          "lineStyle": {
            "width": 2
          }
        }
      },
      "option": {
        "legend": {
          "textStyle": {
            "fontWeight": "bold",
            "fontSize": 14
          },
          "itemWidth": 40,
          "itemHeight": 12,
          "itemGap": 20,
        },
        "xAxis": {
          "splitLine": {
            "lineStyle": {
              "width": 2
            }
          },
          "axisLabel": {
            "fontSize": 14,
            "fontWeight": "normal"
          },
          "rotate": 40,
          "margin": 15
        },
        "yAxis": {
          "splitNumber": 3,
          "splitLine": {
            "lineStyle": {
              "width": 2
            }
          },
          "axisLabel": {
            "fontSize": 14,
            "fontWeight": "normal"
          }
        }
      }
    };
  }

  private ifLargeContainerConfig(): any {
    return {
      "seriesElement": {
        "lineStyle": {
          "width": 5,
          "widthMiddle": 4
        },
        "markline": {
          "lineStyle": {
            "width": 3
          }
        }
      },
      "option": {
        "legend": {
          "textStyle": {
            "fontWeight": "bold",
            "fontSize": 20
          },
          "itemWidth": 60,
          "itemHeight": 15,
          "itemGap": 20,
        },
        "xAxis": {
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 16,
            "fontWeight": 550
          },
          "rotate": 40,
          "margin": 20
        },
        "yAxis": {
          "splitNumber": 3,
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 16,
            "fontWeight": 550
          }
        }
      }
    };
  }

  private ifHugeContainerConfig(): any {
    return {
      "seriesElement": {
        "lineStyle": {
          "width": 5,
          "widthMiddle": 4
        },
        "markline": {
          "lineStyle": {
            "width": 3
          }
        }
      },
      "option": {
        "legend": {
          "textStyle": {
            "fontWeight": "bold",
            "fontSize": 24
          },
          "itemWidth": 70,
          "itemHeight": 20,
          "itemGap": 30,
        },
        "xAxis": {
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 18,
            "fontWeight": 550
          },
          "rotate": 40,
          "margin": 20
        },
        "yAxis": {
          "splitNumber": 4,
          "splitLine": {
            "lineStyle": {
              "width": 3
            }
          },
          "axisLabel": {
            "fontSize": 18,
            "fontWeight": 550
          }
        }
      }
    };
  }
}