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
import { MatDialog } from '@angular/material/dialog';
import { EchartsSettingsDialogComponent } from './settings-dialog/echarts-settings-dialog.component';
// Removed heavy performance utilities that were causing unresponsiveness

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

// Layout constants are defined inline in getGridConfig() where they're used
// to maintain clarity about the specific layout calculations

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

  // Simple performance tracking
  private totalDataPoints = 0;

  @ViewChild('chartContainer', {static: false}) chartContainer: ElementRef<HTMLElement>;
  @ViewChild('legendOverlay', { static: false }) legendOverlay: ElementRef<HTMLDivElement>;
  @ViewChild('zoomOverlay', { static: false }) zoomOverlay: ElementRef<HTMLDivElement>;
  @Input() ctx: WidgetContext;
  
  // External zoom state (percents)
  public zoomStart = 0;
  public zoomEnd = 100;
  
  // Loading and data state flags
  public hasNoVisibleData = false;
  private isInitialLoad = true;  // Track if this is the first data load
  private hasReceivedData = false;  // Track if we've ever received data
  
  // Entity sidebar model
  public entityList: Array<{
    name: string;
    color: string;
    count: number;
    dataPoints: number;
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
  
  // Custom legend overlay state
  public legendItems: Array<{
    label: string;
    color: string;
    selected: boolean;
    plotNumber: number;
  }> = [];
  public lastPulsedLabel: string | null = null;
  
  // Pagination state
  public legendCurrentPage = 0;
  public legendItemsPerPage = 8; // Will be calculated dynamically
  public legendPageItems: Array<{
    label: string;
    color: string;
    selected: boolean;
    plotNumber: number;
  }> = [];
  public legendTotalPages = 1;
  public legendHasMorePages = false;
  public legendNeedsPagination = false; // Show pagination only when needed
  private paginationCalculationTimer: any = null;
  private maxItemsWithoutPagination = 0; // Track max items that have fit
  
  // DOM refs for measuring
  @ViewChild('legendViewport', { static: false }) legendViewport: ElementRef;
  @ViewChild('legendTrack', { static: false }) legendTrack: ElementRef;
  
  // ThingsBoard example properties
  private DEBUG = true;
  private CHART_VERSION = "1.2";
  private currentConfig: any;
  private containerHeightLimit = [1000, 1200];
  private currentSize = "small";
  private maxGrids = 0;
  private setGrids = new Set<string>();
  
  // Color schemes
  private colorSchemes = {
    default: ['#007aff', '#ff9500', '#34c759', '#5856d6', '#ff3b30', '#af52de', '#ff6482', '#32ade6', '#ffcc00', '#5ac8fa'],
    dark: ['#1e3a8a', '#7c2d12', '#14532d', '#581c87', '#7f1d1d', '#701a75', '#831843', '#164e63', '#713f12', '#1e40af'],
    vibrant: ['#ff006e', '#fb5607', '#ffbe0b', '#8338ec', '#3a86ff', '#06ffa5', '#ff4365', '#00f5ff', '#ffd60a', '#7209b7'],
    pastel: ['#ffd6ff', '#e7c6ff', '#c8b6ff', '#b8c0ff', '#bbd0ff', '#a8dadc', '#f1faee', '#ffdab9', '#ffb5a7', '#fcd5ce'],
    monochrome: ['#001f3f', '#003366', '#004080', '#0059b3', '#0073e6', '#3399ff', '#66b3ff', '#99ccff', '#cce6ff', '#e6f2ff']
  };
  
  public currentColorScheme = 'default';
  private currentGrids = 3;
  private currentGridNames: string[] = [];
  private resetGrid = false;
  private usedFormatter: any;
  private legendOverridesGrids = false;
  private lastDataLengths: number[] = [];
  
  // Scroll position management for mode transitions
  private scrollState = {
    position: { top: 0, left: 0 },
    wasScrolling: false,
    isTransitioning: false
  };
  
  // Time formatters
  private zoomTimeWithSeconds = 60 * 60 * 1000;       // 1 day
  private zoomTimeWithMinutes = 7 * 24 * 60 * 60 * 1000;  // 7 days 
  private zoomTimeWithDays = 60 * 24 * 60 * 60 * 1000;   // 60 days
  
  // Formatter configurations
  private browserLocale = Intl.DateTimeFormat().resolvedOptions().timeZone.startsWith('Europe/') ? "en-GB" : navigator.language || (navigator as any).userLanguage;
  
  // Helper method to get the correct axis position map
  private getAxisPositionMap(): any {
    return this.ctx.settings?.multipleDevices ? axisPositionMapExtended : axisPositionMapStandard;
  }
  
  constructor(private dialog: MatDialog) {}

  ngOnInit(): void {
    this.LOG(this.ctx);
    this.LOG(`=== CHART VERSION ${this.CHART_VERSION} INITIALIZATION START ===`);
    this.LOG('Component initialized');
    this.LOG('Widget context:', this.ctx);
    this.LOG('Widget settings:', this.ctx.settings);
    
    // Initialize color scheme
    this.currentColorScheme = this.ctx.settings?.colorScheme || 'default';
    this.LOG('Using color scheme:', this.currentColorScheme);
    
    // Reset entity color mapping on initialization
    this.entityColorMap = {};
    this.nextColorIndex = 0;
    
    // Initialize DatePipe with user's locale
    
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
    
    // Check lazy loading setting
    const useLazyLoading = this.ctx.settings?.useLazyLoading !== false;
    this.LOG(`[LAZY] Lazy loading enabled: ${useLazyLoading}`);
    
    if (useLazyLoading) {
      // Lazy loading: initialize chart when it becomes visible
      this.initializeLazyLoading();
    } else {
      // Immediate loading: initialize chart right away
      this.initializeImmediate();
    }
    
    // Listen for fullscreen changes to force legend recalculation
    this.setupFullscreenListener();
  }
  
  private initializeLazyLoading(): void {
    this.LOG('[LAZY] Setting up lazy loading with Intersection Observer');
    
    // Create intersection observer to detect when chart becomes visible
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.LOG('[LAZY] Chart container is now visible, initializing...');
            observer.disconnect(); // Stop observing
            this.initializeImmediate();
          }
        });
      }, {
        root: null, // viewport
        rootMargin: '50px', // Start loading 50px before it's visible
        threshold: 0.1 // Trigger when 10% visible
      });
      
      observer.observe(this.chartContainer.nativeElement);
      this.LOG('[LAZY] Intersection Observer attached');
    } else {
      // Fallback for browsers without IntersectionObserver
      this.LOG('[LAZY] IntersectionObserver not supported, using immediate loading');
      this.initializeImmediate();
    }
  }
  
  private initializeImmediate(): void {
    // Delay initialization to ensure layout is complete
    setTimeout(() => {
      this.LOG(`[HEIGHT DEBUG] After timeout - ctx.height: ${this.ctx.height}`);
      this.initChart();
      this.setupResizeObserver();
      
      // Initialize zoom overlay positions
      this.updateZoomOverlay();
      
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
  
  private setupFullscreenListener(): void {
    const fullscreenHandler = () => {
      this.LOG('Fullscreen change detected');
      
      // Detect if we're exiting fullscreen (most problematic case)
      const isExitingFullscreen = !document.fullscreenElement && 
                                   !(document as any).webkitFullscreenElement &&
                                   !(document as any).mozFullScreenElement &&
                                   !(document as any).msFullscreenElement;
      
      if (isExitingFullscreen) {
        this.LOG('Exiting fullscreen - using enhanced recalculation strategy');
      }
      
      // First recalculation - immediate but may have stale measurements
      setTimeout(() => {
        // Reset max items to force fresh calculation when exiting fullscreen
        if (isExitingFullscreen) {
          this.maxItemsWithoutPagination = 0;
          
          // Force update of CSS custom properties for grid margins
          // This ensures the legend overlay has correct padding
          this.syncLegendToGridMargins('12%', '1%');
        }
        
        // Force comprehensive DOM reflow to get accurate measurements
        if (this.legendViewport?.nativeElement) {
          const viewport = this.legendViewport.nativeElement;
          
          // Force reflow using multiple property reads
          void viewport.offsetHeight;
          void viewport.offsetWidth;
          void viewport.getBoundingClientRect();
          
          const width = viewport.offsetWidth;
          this.LOG(`Fullscreen transition (1st) - viewport width: ${width}`);
          
          // Clear any cached measurements
          if (this.paginationCalculationTimer) {
            clearTimeout(this.paginationCalculationTimer);
          }
          
          this.calculateItemsPerPage();
        }
        
        // Also trigger resize handling
        if (this.ctx) {
          this.onResize();
        }
      }, 50); // Very quick initial calculation
      
      // Second recalculation - after browser has started adjusting layout
      setTimeout(() => {
        this.LOG('Second recalculation after fullscreen change');
        
        // Ensure CSS properties are still applied
        if (isExitingFullscreen) {
          this.syncLegendToGridMargins('12%', '1%');
        }
        
        // Force another recalculation with fresh measurements
        if (this.legendViewport?.nativeElement) {
          const viewport = this.legendViewport.nativeElement;
          
          // Force DOM reflow again
          void viewport.offsetHeight;
          void viewport.clientWidth;
          viewport.style.display = 'none';
          void viewport.offsetHeight; // Trigger reflow
          viewport.style.display = '';
          
          const width = viewport.offsetWidth;
          this.LOG(`Fullscreen transition (2nd) - viewport width: ${width}`);
          
          // Recalculate with fresh measurements
          this.calculateItemsPerPage();
        }
      }, 250); // Medium delay for layout to partially settle
      
      // Third recalculation - final check after everything has settled
      setTimeout(() => {
        this.LOG('Final recalculation after fullscreen change');
        
        // Force final recalculation with fully settled measurements
        if (this.legendViewport?.nativeElement) {
          const viewport = this.legendViewport.nativeElement;
          
          // One more comprehensive reflow
          void viewport.offsetHeight;
          void viewport.offsetWidth;
          void viewport.scrollWidth;
          
          const width = viewport.offsetWidth;
          this.LOG(`Fullscreen transition (final) - viewport width: ${width}`);
          
          // Final recalculation with fully settled DOM
          this.calculateItemsPerPage();
          
          // Trigger change detection to ensure UI updates
          if (this.ctx?.detectChanges) {
            this.ctx.detectChanges();
          }
        }
      }, 600); // Longer delay to ensure everything is fully settled
    };
    
    // Listen for all fullscreen change events (cross-browser)
    document.addEventListener('fullscreenchange', fullscreenHandler);
    document.addEventListener('webkitfullscreenchange', fullscreenHandler);
    document.addEventListener('mozfullscreenchange', fullscreenHandler);
    document.addEventListener('MSFullscreenChange', fullscreenHandler);
    
    // Store handler for cleanup
    (this as any).fullscreenHandler = fullscreenHandler;
  }

  // [CLAUDE EDIT] Helper to compute grid order for a label
  private gridOrderIndexOfLabel(label: string): number {
    const dyn = this.getDynamicAxisIndexMap();
    let best = Number.POSITIVE_INFINITY;
    for (const s of (this.ctx.data || [])) {
      if (s?.dataKey?.label === label) {
        const asg = s.dataKey?.settings?.axisAssignment || 'Top';
        if (dyn[asg] !== undefined) best = Math.min(best, dyn[asg]);
      }
    }
    return Number.isFinite(best) ? best : 999;
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
    
    // Clean up pagination calculation timer
    if (this.paginationCalculationTimer) {
      clearTimeout(this.paginationCalculationTimer);
    }
    
    // Clean up fullscreen listeners
    if ((this as any).fullscreenHandler) {
      document.removeEventListener('fullscreenchange', (this as any).fullscreenHandler);
      document.removeEventListener('webkitfullscreenchange', (this as any).fullscreenHandler);
      document.removeEventListener('mozfullscreenchange', (this as any).fullscreenHandler);
      document.removeEventListener('MSFullscreenChange', (this as any).fullscreenHandler);
    }
    
    // Clean up window resize listeners
    if ((this as any).windowResizeHandler) {
      window.removeEventListener('resize', (this as any).windowResizeHandler);
      window.removeEventListener('orientationchange', (this as any).windowResizeHandler);
    }
    
    // Clean up visibility change listener
    if ((this as any).visibilityChangeHandler) {
      document.removeEventListener('visibilitychange', (this as any).visibilityChangeHandler);
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
    this.LOG('Is initial load:', this.isInitialLoad);
    this.LOG('Has received data before:', this.hasReceivedData);
    
    // Reset hovered grid index to avoid stale references
    this.hoveredGridIndex = null;
    
    // Count total data points for optimization decisions
    this.totalDataPoints = this.ctx.data?.reduce((sum, series) => 
      sum + (series.data?.length || 0), 0) || 0;
    
    this.LOG('Total data points:', this.totalDataPoints);
    
    // Process update immediately
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
      this.LOG('ERROR: No data available, but continuing to render empty chart');
      // Don't return - we need to render the chart structure even with no data
    }
    
    // Check if we have real data with actual points
    const totalDataPoints = this.ctx.data ? this.ctx.data.reduce((sum, series) => 
      sum + (series.data?.length || 0), 0) : 0;
    
    if (totalDataPoints === 0) {
      this.LOG('WARNING: Data series exist but contain no data points');
      
      // Only show "no data" message if we're not in initial load
      // or if we've waited long enough for data to arrive
      if (!this.isInitialLoad || this.hasReceivedData) {
        // Hide loading spinner and show empty chart with "no data" message
        if (this.chart && !this.chart.isDisposed()) {
          this.chart.hideLoading();
          // Set flag to show no data message
          this.hasNoVisibleData = true;
          this.ctx.detectChanges();
        }
      } else {
        // Keep showing loading spinner during initial load
        this.LOG('Initial load with no data - keeping loading spinner');
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
        // Set a timeout to show "no data" message if data doesn't arrive
        setTimeout(() => {
          if (this.isInitialLoad && !this.hasReceivedData) {
            this.LOG('Timeout reached - showing no data message');
            if (this.chart && !this.chart.isDisposed()) {
              this.chart.hideLoading();
              this.hasNoVisibleData = true;
              this.ctx.detectChanges();
            }
          }
        }, 5000);  // Wait 5 seconds for initial data
      }
      // Don't return - continue to render empty chart structure
    } else {
      // We have data!
      this.hasReceivedData = true;
      this.isInitialLoad = false;
      this.hasNoVisibleData = false;
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
      
      // Handle case where there's no data
      if (!this.ctx.data || this.ctx.data.length === 0) {
        this.setGrids = new Set(['Top']);
        this.currentGridNames = ['Top'];
        this.maxGrids = 1;
        this.currentGrids = 1;
        this.LOG('No data available - using default single grid');
      } else {
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
      }
    } else {
      this.LOG('Using legend-selected grids:', this.currentGridNames);
      this.LOG('Current grid count:', this.currentGrids);
    }
    
    const myNewOptions: any = {
      // Configurable animation control based on settings and data size
      animation: this.getAnimationSettings(),
      animationDuration: this.getAnimationDuration(),
      animationDurationUpdate: this.getAnimationUpdateDuration(),
      animationEasing: 'cubicOut'
    };
    myNewOptions.series = [];
    
    this.LOG('=== SERIES CREATION ===');
    this.LOG('Grid configuration:', {
      currentGrids: this.currentGrids,
      maxGrids: this.maxGrids,
      currentGridNames: this.currentGridNames
    });
    
    // If no data, create empty series to maintain chart structure
    if (!this.ctx.data || this.ctx.data.length === 0) {
      this.LOG('No data - creating empty series');
      myNewOptions.series.push({
        name: 'No Data',
        type: 'line',
        data: [],
        xAxisIndex: 0,
        yAxisIndex: 0,
        showSymbol: false
      });
    }
    
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
      const label = this.ctx.data[i].dataKey.label;
      const seriesKey = this.buildSeriesKey(entityName, label);
      
      this.LOG(`Series[${i}] key="${seriesKey}" entity="${entityName}" color="${entityColor}"`);
      
      // [CLAUDE EDIT] Performance optimizations
      const points = this.ctx.data[i].data?.length || 0;
      const labelSelected = this.legendItems.find(item => item.label === label)?.selected !== false;
      
      const seriesElement = {
        name: seriesKey,  // Use unique key instead of just label
        itemStyle: {
          normal: {
            color: entityColor,  // Use entity-based color instead of series-specific color
            opacity: labelSelected ? 1 : 0.08,  // [CLAUDE EDIT] Lower opacity when off
            borderWidth: 2,
            borderColor: '#fff',  // White border for contrast
            shadowBlur: 4,
            shadowColor: 'rgba(0, 0, 0, 0.1)',
            shadowOffsetY: 2
          }
        },
        lineStyle: {
          color: entityColor,  // Also set line color to entity color
          width: (axisAssignment === 'Middle') 
            ? (this.currentSize === 'small' ? 2 : this.currentSize === 'large' ? 2.5 : 3)
            : (this.currentSize === 'small' ? 2.5 : this.currentSize === 'large' ? 3 : 3.5),
          opacity: labelSelected ? 1 : 0.08,  // [CLAUDE EDIT] Lower opacity when off
          shadowBlur: labelSelected ? 2 : 0,  // Subtle shadow for depth
          shadowColor: entityColor,
          shadowOpacity: 0.3,
          cap: 'round',  // Rounded line ends
          join: 'round'  // Rounded line joins
        },
        type: 'line',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        data: this.ctx.data[i].data,
        // Balanced performance settings
        symbol: (this.ctx.settings.showDataPoints && points <= 1000) ? 'circle' : 'none',
        symbolSize: (this.ctx.settings.symbolSize_data || 5) * 2.5,
        showSymbol: this.ctx.settings.showDataPoints && points <= 1000,
        smooth: this.ctx.settings.smooth !== false ? 0.3 : false,  // Subtle smoothing by default
        // Configurable performance optimizations
        ...this.getDataSamplingSettings(points),
        ...this.getProgressiveRenderingSettings(points),
        // Keep interactions responsive
        silent: !labelSelected
      };
      myNewOptions.series.push(seriesElement);
    }
    
    this.setTimeFormatter();
    myNewOptions.xAxis = this.currentXAxisArray();
    myNewOptions.yAxis = this.currentYAxisArray();
    myNewOptions.grid = this.currentGridArray();
    myNewOptions.dataZoom = this.getDataZoomConfig(); // Update datazoom based on current grid config
    
    // Plot numbers are now displayed as yAxis names instead of graphic elements
    
    // Hidden controller legend - maintains selection state but not visible
    // The custom HTML toolbar will control this via dispatchAction
    myNewOptions.legend = [{
      id: 'controllerLegend',
      show: false,  // Hidden from view
      type: 'scroll',
      data: this.getLegendState().data,
      selected: this.getLegendState().selected,
      selectedMode: true
    }];
    
    this.LOG("myNewOptions:", myNewOptions);
    
    // Apply options without notMerge to preserve tooltip state
    const needsFullReset = this.resetGrid || this.legendOverridesGrids;
    
    if (needsFullReset) {
      this.LOG('Applying full reset with replaceMerge');
      // Replace structural parts for grid changes
      this.chart.setOption(myNewOptions, {
        replaceMerge: ['grid', 'xAxis', 'yAxis', 'series', 'dataZoom']
      });
      this.resetGrid = false;
    } else {
      // Use notMerge for faster data updates
      this.chart.setOption(myNewOptions, true);  // true = notMerge for better performance
    }
    
    // Hide the loading spinner after data is rendered
    this.chart.hideLoading();
    
    // Refresh entity list for sidebar and sync custom legend
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();
    }, 100);
    
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
      
      // Recalculate legend pagination on resize
      this.calculateItemsPerPage();
    }, 50); // 50ms debounce
  }

  /**
   * Helper method to apply correct scroll height with floating overlays
   * The outer container gets paddings to prevent overlap with sticky bars
   * The inner canvas height scales by grid count for scrolling
   */
  private applyScrollableHeight(): void {
    const outer = this.chartContainer?.nativeElement as HTMLElement; // wrapper
    const inner = outer?.querySelector('#echartContainer') as HTMLElement;
    if (!inner || !this.ctx.height) return;

    const buttonBarHeight = 50;
    const legendH = this.getLegendPx(); // floating
    const zoomH = this.getZoomPx();   // floating

    const viewport = Math.max(0, this.ctx.height - buttonBarHeight - legendH - zoomH);

    // Scale plot canvas by grid count (scroll only the canvas area)
    const scaleFactor = this.currentGrids > 3 ? (this.currentGrids / 3) : 1;
    const innerHeight = Math.ceil(viewport * scaleFactor);

    // Keep plots clear of floating bars
    outer.style.paddingTop = `${legendH}px`;
    outer.style.paddingBottom = `${zoomH}px`;

    outer.style.height = `${viewport}px`;
    outer.style.maxHeight = `${viewport}px`;
    outer.style.overflowY = this.currentGrids > 3 ? 'auto' : 'hidden';
    inner.style.height = `${innerHeight}px`;

    // IMPORTANT: trigger resize so ECharts recomputes grids after height change
    this.chart?.resize();
    
    this.LOG(`[HEIGHT] viewport=${viewport}px inner=${innerHeight}px (legend=${legendH}px zoom=${zoomH}px scale=${scaleFactor})`);
  }

  // Convert px to % based on the current inner chart height
  private pxToPct(px: number): number {
    const el = this.chartContainer?.nativeElement?.querySelector('#echartContainer') as HTMLElement;
    const h = el?.clientHeight || this.ctx.height || 0;
    return h ? (px / h) * 100 : 0;
  }

  // Get the gap between grids as a percentage, converted from pixels
  // Dynamic gap that increases as plot count decreases (like bottom spacing)
  private getGapPct(): number {
    // Fewer plots = bigger gap for better separation
    // Similar pattern to bottom spacing but in pixels
    if (this.currentGrids === 1) return 0;  // No gap needed for single plot
    if (this.currentGrids === 2) return this.pxToPct(80);  // Large gap for 2 plots
    if (this.currentGrids === 3) return this.pxToPct(80);   // Good spacing for 3 plots
    if (this.currentGrids === 4) return this.pxToPct(80);   // 4 plots
    if (this.currentGrids === 5) return this.pxToPct(80);   // 5 plots
    if (this.currentGrids === 6) return this.pxToPct(80);   // 6 plots
    return this.pxToPct(80); // 7+ plots still need adequate spacing
  }


  // Reserve space at top and bottom to prevent line clipping
  private getTopReservePct(): number { 
    // Use pixel-based buffer for 1, 2, and 3 plots to prevent excessive whitespace in fullscreen
    if (this.currentGrids >= 1 && this.currentGrids <= 3) {
      return this.pxToPct(20); // ~60px top buffer, scales with container height
    }
    // Fixed small buffer at top for all other configurations
    return this.pxToPct(20); // ~20px buffer for 4+ plots
  }
  
  private getBottomReservePct(): number { 
    // Use pixel-based buffer calculations to prevent plot cutoff in fullscreen
    // Bottom buffer increases as plot count decreases for better fit
    const scrollThreshold = this.ctx.settings?.scrollingStartsAfter || 3;
    
    // If we're at or below the scrolling threshold, use larger buffers for better spacing
    if (this.currentGrids <= scrollThreshold) {
      // Use pixel-based calculations to prevent fullscreen cutoff
      if (this.currentGrids === 1) return this.pxToPct(150);  // ~100px for single plot
      if (this.currentGrids === 2) return this.pxToPct(150);   // ~90px for two plots  
      if (this.currentGrids === 3) return this.pxToPct(150);   // ~80px for three plots
    }
    
    // Above scrolling threshold, use smaller pixel-based buffers
    if (this.currentGrids >= 7) return this.pxToPct(70);  // ~50px for 7+ plots
    if (this.currentGrids === 6) return this.pxToPct(70);  // ~60px for 6 plots
    if (this.currentGrids === 5) return this.pxToPct(70);  // ~70px for 5 plots
    if (this.currentGrids === 4) return this.pxToPct(70);  // ~75px for 4 plots
    return this.pxToPct(70); // Default fallback ~60px
  }
  
  // Helper: heights of sticky bars
  private getLegendPx(): number {
    return this.legendOverlay?.nativeElement?.offsetHeight || 0;
  }
  
  private getZoomPx(): number {
    return this.zoomOverlay?.nativeElement?.offsetHeight || 0;
  }

  // Helper to check if tooltip should only show hovered grid
  private onlyShowHoveredGrid(): boolean {
    return !!this.ctx.settings?.tooltipOnlyHoveredGrid; // default off
  }
  
  // Scroll position management for smooth mode transitions
  private captureScrollPosition(): void {
    const container = this.chartContainer?.nativeElement;
    if (!container) return;
    
    this.scrollState.position = {
      top: container.scrollTop || 0,
      left: container.scrollLeft || 0
    };
    this.scrollState.wasScrolling = this.isInScrollingMode();
    
    this.LOG(`[SCROLL] Captured position: ${this.scrollState.position.top}px, wasScrolling: ${this.scrollState.wasScrolling}`);
  }
  
  private restoreScrollPosition(): void {
    const container = this.chartContainer?.nativeElement;
    if (!container || this.scrollState.isTransitioning) return;
    
    this.scrollState.isTransitioning = true;
    
    // Determine the appropriate scroll position based on mode transition
    const isNowScrolling = this.isInScrollingMode();
    
    this.LOG(`[SCROLL] Restore: wasScrolling=${this.scrollState.wasScrolling}, isNowScrolling=${isNowScrolling}, grids=${this.currentGrids}`);
    
    // Wait for chart to render, then apply scroll position
    setTimeout(() => {
      if (!container) return;
      
      let targetScrollTop = 0;
      
      if (this.scrollState.wasScrolling && !isNowScrolling) {
        // Transition from scrolling to non-scrolling mode
        // Reset to top for clean fitted view
        targetScrollTop = 0;
        this.LOG('[SCROLL] Scrolling → Non-scrolling: Resetting to top');
      } else if (!this.scrollState.wasScrolling && isNowScrolling) {
        // Transition from non-scrolling to scrolling mode  
        // Keep minimal scroll to show chart properly
        targetScrollTop = 0;
        this.LOG('[SCROLL] Non-scrolling → Scrolling: Starting from top');
      } else if (this.scrollState.wasScrolling && isNowScrolling) {
        // Both modes are scrolling, try to maintain relative position
        // But be conservative to avoid jarring jumps
        const maxScroll = container.scrollHeight - container.clientHeight;
        const relativePos = Math.min(this.scrollState.position.top * 0.8, maxScroll); 
        targetScrollTop = Math.max(0, relativePos);
        this.LOG(`[SCROLL] Scrolling → Scrolling: Adjusted from ${this.scrollState.position.top}px to ${targetScrollTop}px`);
      }
      
      // Apply smooth scroll
      container.scrollTo({
        top: targetScrollTop,
        left: 0,
        behavior: 'smooth'
      });
      
      // Reset transition flag after scroll completes
      setTimeout(() => {
        this.scrollState.isTransitioning = false;
      }, 300);
      
    }, 100); // Wait for chart render
  }
  
  private isInScrollingMode(): boolean {
    const scrollThreshold = this.ctx.settings?.scrollingStartsAfter || 3;
    return this.currentGrids > scrollThreshold;
  }
  
  // Check if selected keys actually correspond to visible data series
  private checkIfSelectedKeysHaveVisibleData(selectedKeys: string[]): boolean {
    if (!this.chart || !this.ctx?.data || selectedKeys.length === 0) {
      return false;
    }
    
    // Get current legend selection state
    const chartOption: any = this.chart.getOption();
    const legendSelected = (chartOption?.legend?.[0]?.selected) || {};
    
    // Check if any selected key is both in legend and visible
    for (const key of selectedKeys) {
      const isSeriesVisible = legendSelected[key] !== false;
      const seriesHasData = this.ctx.data.some(series => {
        const seriesKey = this.buildSeriesKey(series.datasource?.entityName || '', series.dataKey.label);
        return seriesKey === key && series.data && Array.isArray(series.data) && series.data.length > 0;
      });
      
      if (isSeriesVisible && seriesHasData) {
        return true; // Found at least one visible series with data
      }
    }
    
    return false; // No visible series with data found
  }
  
  // Performance setting helpers
  private getAnimationSettings(): boolean {
    const enableAnimations = this.ctx.settings?.enableAnimations !== false;
    if (!enableAnimations) {
      this.LOG('[PERF] Animations disabled via settings');
      return false;
    }
    // Smart animation based on data size when enabled
    const smartAnimation = this.totalDataPoints < 5000;
    this.LOG(`[PERF] Smart animations: ${smartAnimation} (${this.totalDataPoints} points)`);
    return smartAnimation;
  }
  
  private getAnimationDuration(): number {
    const enableAnimations = this.ctx.settings?.enableAnimations !== false;
    if (!enableAnimations) return 0;
    return this.totalDataPoints > 2000 ? 200 : 300;
  }
  
  private getAnimationUpdateDuration(): number {
    const enableAnimations = this.ctx.settings?.enableAnimations !== false;
    if (!enableAnimations) return 0;
    return this.totalDataPoints > 2000 ? 100 : 300;
  }
  
  private getDataSamplingSettings(points: number): { sampling?: string; large?: boolean; largeThreshold?: number } {
    const enableDataSampling = this.ctx.settings?.enableDataSampling !== false;
    const maxDataPoints = this.ctx.settings?.maxDataPoints || 10000;
    
    if (!enableDataSampling) {
      this.LOG(`[PERF] Data sampling disabled for series with ${points} points`);
      return {};
    }
    
    const samplingConfig: any = {};
    
    if (points > maxDataPoints) {
      samplingConfig.sampling = 'lttb';
      samplingConfig.large = true;
      samplingConfig.largeThreshold = Math.floor(maxDataPoints / 2);
      this.LOG(`[PERF] Data sampling enabled: ${points} -> ~${samplingConfig.largeThreshold} points`);
    } else if (points > 5000) {
      samplingConfig.sampling = 'lttb';
      this.LOG(`[PERF] Light sampling enabled for ${points} points`);
    }
    
    return samplingConfig;
  }
  
  private getProgressiveRenderingSettings(points: number): { progressive?: number; progressiveThreshold?: number } {
    const enableProgressiveRendering = this.ctx.settings?.enableProgressiveRendering === true;
    
    if (!enableProgressiveRendering || points < 20000) {
      return {};
    }
    
    this.LOG(`[PERF] Progressive rendering enabled for ${points} points`);
    return {
      progressive: 5000,
      progressiveThreshold: 10000
    };
  }
  
  // Check which plots/grids have visible series WITH DATA
  /* private checkPlotVisibility(legendSelected: {[key: string]: boolean}): {[plot: string]: {hasVisibleSeries: boolean, seriesNames: string[]}} {
    const plotVisibility: {[plot: string]: {hasVisibleSeries: boolean, seriesNames: string[]}} = {};
    
    // Initialize plot visibility tracking for all possible plots
    const allPlots = ['Top', 'Middle', 'Bottom'];
    allPlots.forEach(plot => {
      plotVisibility[plot] = {
        hasVisibleSeries: false,
        seriesNames: []
      };
    });
    
    // Go through all series and check their visibility AND data
    this.ctx.data.forEach(series => {
      const seriesKey = this.buildSeriesKey(series.datasource?.entityName || '', series.dataKey.label);
      const axisAssignment = series.dataKey?.settings?.axisAssignment || 'Top';
      const isVisible = legendSelected[seriesKey] !== false;
      const hasData = series.data && Array.isArray(series.data) && series.data.length > 0;
      
      if (plotVisibility[axisAssignment]) {
        plotVisibility[axisAssignment].seriesNames.push(seriesKey);
        // Only consider it visible if it's both selected AND has data
        if (isVisible && hasData) {
          plotVisibility[axisAssignment].hasVisibleSeries = true;
        }
      }
    });
    
    return plotVisibility;
  } */
  
  // Create detailed debug object showing all plots and series visibility
  private createDetailedVisibilityDebugInfo(legendSelected: {[key: string]: boolean}): any {
    const debugInfo: any = {
      timestamp: new Date().toISOString(),
      totalSeries: this.ctx.data.length,
      plots: {}
    };
    
    // Group series by plot/axis assignment
    const plotGroups: {[key: string]: any[]} = {};
    
    this.ctx.data.forEach((series) => {
      const seriesKey = this.buildSeriesKey(series.datasource?.entityName || '', series.dataKey.label);
      const axisAssignment = series.dataKey?.settings?.axisAssignment || 'Top';
      const isVisible = legendSelected[seriesKey] !== false;
      const dataPoints = series.data && Array.isArray(series.data) ? series.data.length : 0;
      
      if (!plotGroups[axisAssignment]) {
        plotGroups[axisAssignment] = [];
      }
      
      plotGroups[axisAssignment].push({
        seriesName: seriesKey,
        entityName: series.datasource?.entityName || 'Unknown',
        label: series.dataKey.label,
        visible: isVisible,
        dataPoints: dataPoints,
        hasData: dataPoints > 0,
        axisPosition: series.dataKey?.settings?.axisPosition || 'left'
      });
    });
    
    // Create plot numbering based on order (Top=1, Middle=2, Bottom=3, etc.)
    const plotOrder = ['Top', 'Middle', 'Bottom'];
    let plotNumber = 1;
    
    plotOrder.forEach(plotName => {
      if (plotGroups[plotName] && plotGroups[plotName].length > 0) {
        const visibleCount = plotGroups[plotName].filter(s => s.visible).length;
        const visibleWithDataCount = plotGroups[plotName].filter(s => s.visible && s.hasData).length;
        const totalCount = plotGroups[plotName].length;
        
        debugInfo.plots[`Plot_${plotNumber}_${plotName}`] = {
          plotNumber: plotNumber,
          plotName: plotName,
          visibleSeries: visibleCount,
          visibleWithData: visibleWithDataCount,
          totalSeries: totalCount,
          allHidden: visibleCount === 0,
          allHiddenOrNoData: visibleWithDataCount === 0,
          series: plotGroups[plotName].map(s => ({
            name: s.seriesName,
            visible: s.visible ? '✓' : '✗',
            dataPoints: s.dataPoints,
            status: !s.visible ? 'hidden' : (s.dataPoints === 0 ? 'visible-no-data' : 'visible-with-data'),
            entity: s.entityName,
            label: s.label
          }))
        };
        plotNumber++;
      }
    });
    
    // Add any additional plots not in the standard order
    Object.keys(plotGroups).forEach(plotName => {
      if (!plotOrder.includes(plotName)) {
        const visibleCount = plotGroups[plotName].filter(s => s.visible).length;
        const visibleWithDataCount = plotGroups[plotName].filter(s => s.visible && s.hasData).length;
        const totalCount = plotGroups[plotName].length;
        
        debugInfo.plots[`Plot_${plotNumber}_${plotName}`] = {
          plotNumber: plotNumber,
          plotName: plotName,
          visibleSeries: visibleCount,
          visibleWithData: visibleWithDataCount,
          totalSeries: totalCount,
          allHidden: visibleCount === 0,
          allHiddenOrNoData: visibleWithDataCount === 0,
          series: plotGroups[plotName].map(s => ({
            name: s.seriesName,
            visible: s.visible ? '✓' : '✗',
            dataPoints: s.dataPoints,
            status: !s.visible ? 'hidden' : (s.dataPoints === 0 ? 'visible-no-data' : 'visible-with-data'),
            entity: s.entityName,
            label: s.label
          }))
        };
        plotNumber++;
      }
    });
    
    // Summary statistics
    debugInfo.summary = {
      totalPlots: Object.keys(debugInfo.plots).length,
      plotsWithData: Object.values(debugInfo.plots).filter((p: any) => !p.allHiddenOrNoData).length,
      plotsWithoutData: Object.values(debugInfo.plots).filter((p: any) => p.allHiddenOrNoData).length,
      visibleSeriesTotal: Object.values(debugInfo.plots).reduce((sum: number, p: any) => sum + p.visibleSeries, 0),
      visibleSeriesWithData: Object.values(debugInfo.plots).reduce((sum: number, p: any) => sum + p.visibleWithData, 0),
      hiddenSeriesTotal: Object.values(debugInfo.plots).reduce((sum: number, p: any) => sum + (p.totalSeries - p.visibleSeries), 0)
    };
    
    return debugInfo;
  }
  
  // Helper to get consistent color for an entity
  private getColorForEntity(entityName: string): string {
    if (!entityName) {
      // Fallback for series without entity name
      entityName = '_unknown_' + this.nextColorIndex;
    }
    
    if (!this.entityColorMap[entityName]) {
      // Get the active color palette based on selected scheme
      const activeColorScheme = this.colorSchemes[this.currentColorScheme] || this.colorSchemes.default;
      
      // For extended palette, create variations if needed
      let colorToUse: string;
      const baseIndex = this.nextColorIndex % activeColorScheme.length;
      const variation = Math.floor(this.nextColorIndex / activeColorScheme.length);
      
      if (variation === 0) {
        // Use base colors for first set
        colorToUse = activeColorScheme[baseIndex];
      } else {
        // Create variations for subsequent sets
        const factor = 1 + (0.2 * variation);
        colorToUse = this.adjustColorBrightness(activeColorScheme[baseIndex], factor);
      }
      
      this.entityColorMap[entityName] = colorToUse;
      this.nextColorIndex++;
    }
    
    return this.entityColorMap[entityName];
  }
  
  private adjustColorBrightness(color: string, factor: number): string {
    // Simple brightness adjustment for hex colors
    const hex = color.replace('#', '');
    const r = Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) * factor));
    const g = Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) * factor));
    const b = Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) * factor));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
  
  public openSettingsDialog(): void {
    const dialogRef = this.dialog.open(EchartsSettingsDialogComponent, {
      width: '500px',
      data: { colorScheme: this.currentColorScheme }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.changeColorScheme(result.colorScheme);
      }
    });
  }
  
  public changeColorScheme(scheme: string): void {
    this.LOG('Changing color scheme to:', scheme);
    this.currentColorScheme = scheme;
    
    // Reset color mapping to apply new scheme
    this.entityColorMap = {};
    this.nextColorIndex = 0;
    
    // Trigger chart update with new colors
    if (this.chart && !this.chart.isDisposed()) {
      this.onDataUpdated();
    }
  }
  
  // Helper functions for unique series keys
  private buildSeriesKey(entityName: string, label: string): string {
    // Create unique key: "entityName :: label"
    return `${entityName || 'Unknown'} :: ${label}`;
  }
  
  private extractLabelFromKey(key: string): string {
    // Extract label from "entityName :: label"
    const parts = key.split(' :: ');
    return parts.length > 1 ? parts[1] : key;
  }
  
  
  // Get grouped legend state (unique labels only)
  private getGroupLegendState(): { data: string[]; selected: Record<string, boolean> } {
    // Get unique labels from all series
    const uniqueLabels = new Set<string>();
    (this.ctx.data || []).forEach(s => {
      if (s?.dataKey?.label) {
        uniqueLabels.add(s.dataKey.label);
      }
    });
    
    const data = Array.from(uniqueLabels).sort();
    
    // Get controller legend selection state
    let controllerSelected: Record<string, boolean> = {};
    try {
      const opt: any = this.chart?.getOption?.();
      if (opt?.legend && opt.legend[0]?.selected) {
        controllerSelected = opt.legend[0].selected;
      }
    } catch (e) {
      this.LOG('Could not retrieve controller legend state:', e);
    }
    
    // A label is selected if ANY series with that label is selected
    const selected: Record<string, boolean> = {};
    for (const label of data) {
      let anySelected = false;
      for (const s of this.ctx.data || []) {
        if (s?.dataKey?.label === label) {
          const entityName = s.datasource?.entityName || 'Unknown';
          const seriesKey = this.buildSeriesKey(entityName, label);
          if (controllerSelected[seriesKey] !== false) {
            anySelected = true;
            break;
          }
        }
      }
      selected[label] = anySelected;
    }
    
    return { data, selected };
  }
  
  // Refresh entity list for sidebar
  public refreshEntityList(): void {
    if (!this.ctx?.data || !this.chart) {
      this.entityList = [];
      return;
    }
    
    // Group series by entity and count data points
    const entityGroups: Record<string, { seriesKeys: string[], color: string, dataPoints: number }> = {};
    
    for (const data of this.ctx.data) {
      const entityName = data.datasource?.entityName || 'Unknown';
      const label = data.dataKey.label;
      const seriesKey = this.buildSeriesKey(entityName, label);
      
      if (!entityGroups[entityName]) {
        entityGroups[entityName] = {
          seriesKeys: [],
          color: this.getColorForEntity(entityName),
          dataPoints: 0
        };
      }
      entityGroups[entityName].seriesKeys.push(seriesKey);
      
      // Count data points for this series
      if (data.data && Array.isArray(data.data)) {
        entityGroups[entityName].dataPoints += data.data.length;
      }
    }
    
    // Get current legend selection state
    const opt: any = this.chart.getOption();
    const selected = opt?.legend?.[0]?.selected || {};
    
    // Build entity list with data point counts
    this.entityList = Object.keys(entityGroups).map(entityName => {
      const group = entityGroups[entityName];
      // Entity is visible if any of its series are visible
      const visible = group.seriesKeys.some(seriesKey => selected[seriesKey] !== false);
      
      return {
        name: entityName,
        color: group.color,
        count: group.seriesKeys.length,
        dataPoints: group.dataPoints,
        visible: visible
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    
    this.ctx.detectChanges();
  }
  
  // Toggle visibility for all series of an entity
  public toggleEntityVisibility(entityName: string): void {
    if (!this.ctx?.data || !this.chart) return;
    
    // Find all series keys for this entity
    const seriesKeys: string[] = [];
    
    for (const data of this.ctx.data) {
      const currentEntityName = data.datasource?.entityName || 'Unknown';
      if (currentEntityName === entityName) {
        const label = data.dataKey.label;
        const seriesKey = this.buildSeriesKey(entityName, label);
        seriesKeys.push(seriesKey);
      }
    }
    
    if (seriesKeys.length === 0) {
      return;
    }
    
    // Get current visibility state from controller legend
    const opt: any = this.chart.getOption();
    const selected = opt?.legend?.[0]?.selected || {};
    
    // Check if any series is visible
    const anyVisible = seriesKeys.some(key => selected[key] !== false);
    
    // Toggle all series for this entity on controller legend
    const action = anyVisible ? 'legendUnSelect' : 'legendSelect';
    
    seriesKeys.forEach(key => {
      this.chart.dispatchAction({
        type: action,
        name: key,
        legendIndex: 0  // Target controller legend
      });
    });
    
    // After toggling, check if grids need to be recalculated
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();
      
      // Get updated legend state after timeout
      const finalOption: any = this.chart.getOption();
      const finalSelected = (finalOption?.legend?.[0]?.selected) || {};
      
      const activeSeriesKeys = Object.keys(finalSelected).filter(k => finalSelected[k] !== false);
      
      // Create detailed debug info
      const debugInfo = this.createDetailedVisibilityDebugInfo(finalSelected);
      
      // Log the detailed visibility information
      this.LOG('[Device_Plot_Visi: ] ====== VISIBILITY REPORT after toggling "' + entityName + '" ======');
      this.LOG('[Device_Plot_Visi: ] Summary:', debugInfo.summary);
      
      // First, check and report any completely hidden plots
      const hiddenPlots: string[] = [];
      Object.keys(debugInfo.plots).forEach(plotKey => {
        const plot = debugInfo.plots[plotKey];
        if (plot.allHiddenOrNoData) {
          hiddenPlots.push(`Plot ${plot.plotNumber} (${plot.plotName})`);
        }
      });
      
      if (hiddenPlots.length > 0) {
        this.LOG('[Device_Plot_Visi: ] ⚠️  PLOTS WITH NO VISIBLE DATA (hidden or empty):');
        hiddenPlots.forEach(plotName => {
          this.LOG('[Device_Plot_Visi: ]     --> ' + plotName + ' has NO VISIBLE DATA');
        });
      }
      
      // Log each plot with its series
      Object.keys(debugInfo.plots).forEach(plotKey => {
        const plot = debugInfo.plots[plotKey];
        const status = plot.allHiddenOrNoData ? '[NO DATA]' : '[HAS DATA]';
        this.LOG(`[Device_Plot_Visi: ] Plot ${plot.plotNumber} (${plot.plotName}): ${plot.visibleWithData}/${plot.visibleSeries}/${plot.totalSeries} (with-data/visible/total) ${status}`);
        plot.series.forEach((s: any) => {
          const dataInfo = s.dataPoints === 0 ? ' [NO DATA]' : ` [${s.dataPoints} pts]`;
          this.LOG(`[Device_Plot_Visi: ]     ${s.visible} ${s.name}${dataInfo}`);
        });
      });
      
      this.LOG('[Device_Plot_Visi: ] Full debug object:', JSON.stringify(debugInfo, null, 2));
      this.LOG('[Device_Plot_Visi: ] ====== END VISIBILITY REPORT ======');
      
      // NEW APPROACH: Only include series that are visible AND have data
      this.legendOverridesGrids = true;
      const previousGridCount = this.currentGrids;
      
      // Capture scroll position before mode change
      this.captureScrollPosition();
      
      // Filter to only include series that are both visible AND have data
      const activeSeriesWithData = activeSeriesKeys.filter(key => {
        const series = this.ctx.data.find(d => this.buildSeriesKey(d.datasource?.entityName || '', d.dataKey.label) === key);
        return series && series.data && Array.isArray(series.data) && series.data.length > 0;
      });
      
      this.LOG('[Device_Plot_Visi: ] Active series with data: ' + activeSeriesWithData.length + ' out of ' + activeSeriesKeys.length + ' visible series');
      
      // Pass only series that have actual data
      this.setDataGridByNames(activeSeriesWithData);
      
      // If grid count changed, rebuild the chart
      if (previousGridCount !== this.currentGrids) {
        this.LOG(`[SCROLL] Entity toggle mode transition: ${previousGridCount} → ${this.currentGrids} grids`);
        this.resetGrid = true;
        this.applyScrollableHeight();
        this.onDataUpdated();
        
        // Restore appropriate scroll position after chart updates
        setTimeout(() => {
          this.restoreScrollPosition();
        }, 200); // Wait for chart to complete rendering
      }
      
      // Trigger change detection to update UI
      this.ctx.detectChanges();
    }, 100);  // Increased timeout to ensure legend actions complete
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
    
    // Initialize chart with configurable performance settings
    const useCanvasRenderer = this.ctx.settings?.useCanvasRenderer !== false; // Default to canvas for better performance
    this.LOG(`[PERF] Using renderer: ${useCanvasRenderer ? 'canvas' : 'svg'}`);
    
    this.chart = echarts.init(containerElement, undefined, {
      renderer: useCanvasRenderer ? 'canvas' : 'svg',
      useDirtyRect: true  // Dirty rect rendering for selective updates
    });
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
    
    // Always call onDataUpdated to render the chart
    // Even with no data, we need to show the chart structure
    if (!this.ctx.data || this.ctx.data.length === 0) {
      this.LOG('[ECharts Line Chart] No data available yet, but rendering chart structure');
    } else {
      this.LOG('[ECharts Line Chart] Data already available:', this.ctx.data.length, 'series');
    }
    
    // Always update to show chart (empty or with data)
    this.onDataUpdated();
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
    
    // Plot numbers are now displayed as yAxis names instead of graphic elements
    
    this.LOG('Setting chart option with grid config...');
    this.chart.setOption(option);
    
    // Register legend selection event listener with guard
    this.chart.on('legendselectchanged', (event: any) => {
      // Guard: prevent hiding all series
      const selected = event?.selected || {};
      const visibleCount = Object.values(selected).filter(v => v !== false).length;
      
      if (visibleCount === 0) {
        // Re-enable the last clicked item
        this.chart.dispatchAction({ 
          type: 'legendSelect', 
          name: event.name, 
          legendIndex: 0 
        });
        return;
      }
      
      this.onLegendSelectChanged(event);
      // Sync custom legend toolbar when legend changes
      this.syncCustomLegendFromChart();
    });
    
    // Keep zoom sliders in sync when user uses mousewheel/drag
    this.chart.on('dataZoom', () => {
      const dz = (this.chart.getOption().dataZoom || [])[0];
      if (dz) {
        const s = Math.round((dz.start as number) * 1000) / 1000;
        const e = Math.round((dz.end as number) * 1000) / 1000;
        if (s !== this.zoomStart || e !== this.zoomEnd) {
          this.zoomStart = s;
          this.zoomEnd = e;
          // Update external bar positions (handles/window)
          this.updateZoomOverlay();
          this.ctx.detectChanges?.();
        }
      }
    });
    
    // Initial refresh of entity list and sync custom legend
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();
    }, 100);
    
    this.LOG('=== INIT CHART AND GRID COMPLETE ===');
  }

  private onLegendSelectChanged(event: any): void {
    // Reset hovered grid index to avoid stale references
    this.hoveredGridIndex = null;
    
    const clickedLabel = event.name;
    
    // Check if this is a grouped label (not a series key)
    if (!clickedLabel.includes(' :: ')) {
      // This is a grouped label click
      
      // Build all series names that match this label
      const seriesToToggle: string[] = [];
      for (const s of this.ctx.data || []) {
        if (s?.dataKey?.label === clickedLabel) {
          const entityName = s.datasource?.entityName || 'Unknown';
          const seriesKey = this.buildSeriesKey(entityName, clickedLabel);
          seriesToToggle.push(seriesKey);
        }
      }
      
      // Toggle visibility of actual series (they're hidden but control visibility)
      seriesToToggle.forEach(seriesName => {
        // Find the series and toggle its visibility
        const seriesIndex = this.ctx.data.findIndex(s => {
          const entityName = s.datasource?.entityName || 'Unknown';
          const key = this.buildSeriesKey(entityName, s.dataKey.label);
          return key === seriesName;
        });
        
        if (seriesIndex >= 0) {
          // Toggle series visibility directly
          const series = this.chart.getOption().series[seriesIndex];
          if (series) {
            this.chart.setOption({
              series: [{
                name: seriesName,
                lineStyle: {
                  opacity: event.selected[clickedLabel] ? 1 : 0.1
                },
                itemStyle: {
                  opacity: event.selected[clickedLabel] ? 1 : 0.1
                }
              }]
            });
          }
        }
      });
      
      // Refresh entity list
      setTimeout(() => this.refreshEntityList(), 50);
      return;
    }
    
    // Handle actual series legend changes (if any)
    const selected = event.selected;
    const selectedKeys = Object.keys(selected).filter(key => selected[key]);
    
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
    
    // Refresh entity list and sync custom legend after changes
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();
    }, 50);
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
        // Reset loading state when navigating to a new state
        this.isInitialLoad = true;
        this.hasNoVisibleData = false;
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
  
  // Helper to detect if window is maximized
  private isWindowMaximized(): boolean {
    // Check if window dimensions match screen dimensions (with small tolerance)
    const tolerance = 10; // pixels
    const isMaxWidth = Math.abs(window.outerWidth - screen.availWidth) < tolerance;
    const isMaxHeight = Math.abs(window.outerHeight - screen.availHeight) < tolerance;
    
    // Also check using screen.width/height for some browsers
    const isFullScreenWidth = Math.abs(window.outerWidth - screen.width) < tolerance;
    const isFullScreenHeight = Math.abs(window.outerHeight - screen.height) < tolerance;
    
    return (isMaxWidth && isMaxHeight) || (isFullScreenWidth && isFullScreenHeight);
  }
  
  private setupResizeObserver(): void {
    this.LOG('[HEIGHT DEBUG] Setting up ResizeObserver');
    
    // Track previous width to detect maximize/restore
    let previousWidth = 0;
    let lastWindowWidth = window.innerWidth;
    let wasMaximized = this.isWindowMaximized();
    
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        this.LOG(`[HEIGHT DEBUG] ResizeObserver triggered - contentRect: width=${width}, height=${height}`);
        if (width > 0 && height > 0) {
          this.LOG('[ECharts Line Chart] Container resized:', { width, height });
          
          // Always force immediate legend recalculation on ANY resize
          // This is aggressive but ensures we never have clipping
          this.LOG('Forcing immediate legend recalculation on resize');
          
          // Clear ALL caches immediately
          this.maxItemsWithoutPagination = 0;
          
          // Force immediate recalculation - no delay
          this.performPaginationCalculation();
          
          // Detect significant width changes that indicate maximize/restore
          const widthChange = Math.abs(width - previousWidth);
          const isSignificantChange = widthChange > 100; // Lower threshold
          
          if (isSignificantChange && previousWidth > 0) {
            this.LOG(`SIGNIFICANT RESIZE DETECTED: ${previousWidth}px -> ${width}px (change: ${widthChange}px)`);
            
            // Additional recalculations for significant changes
            setTimeout(() => {
              this.LOG('Recalculating after significant resize (100ms)');
              this.performPaginationCalculation();
            }, 100);
            
            setTimeout(() => {
              this.LOG('Recalculating after significant resize (300ms)');
              this.performPaginationCalculation();
            }, 300);
            
            setTimeout(() => {
              this.LOG('Final recalculation after significant resize (500ms)');
              this.performPaginationCalculation();
            }, 500);
          }
          
          previousWidth = width;
          
          this.LOG(`[HEIGHT DEBUG] Before resize - ctx.height: ${this.ctx.height}`);
          this.onResize();
          this.LOG(`[HEIGHT DEBUG] After resize - ctx.height: ${this.ctx.height}`);
        }
      }
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
    this.LOG('[HEIGHT DEBUG] ResizeObserver attached to chart container');
    
    // Window resize listener with more aggressive handling
    const windowResizeHandler = () => {
      const currentWindowWidth = window.innerWidth;
      const windowWidthChange = Math.abs(currentWindowWidth - lastWindowWidth);
      
      // Check if maximize state changed
      const isNowMaximized = this.isWindowMaximized();
      const maximizeStateChanged = isNowMaximized !== wasMaximized;
      
      if (maximizeStateChanged) {
        this.LOG(`MAXIMIZE STATE CHANGED: ${wasMaximized ? 'Maximized' : 'Normal'} -> ${isNowMaximized ? 'Maximized' : 'Normal'}`);
      }
      
      this.LOG(`Window resize: ${lastWindowWidth}px -> ${currentWindowWidth}px (change: ${windowWidthChange}px)`);
      
      // Always reset and recalculate on window resize or maximize state change
      if (maximizeStateChanged || windowWidthChange > 0) {
        this.maxItemsWithoutPagination = 0;
        this.LOG('Reset cache due to window resize or maximize state change');
      }
      
      // Immediate recalculation
      this.performPaginationCalculation();
      
      // Multiple delayed recalculations to catch any layout settling
      const delays = [50, 150, 300, 500];
      
      // Add extra recalculation for maximize state changes
      if (maximizeStateChanged) {
        // Add an immediate extra calculation for maximize/restore
        setTimeout(() => {
          this.LOG('Extra recalculation for maximize state change (25ms)');
          this.performPaginationCalculation();
        }, 25);
        
        // Add a very late recalculation for maximize state changes
        delays.push(800, 1000);
      }
      
      delays.forEach(delay => {
        setTimeout(() => {
          this.LOG(`Window resize recalculation at ${delay}ms`);
          this.performPaginationCalculation();
        }, delay);
      });
      
      lastWindowWidth = currentWindowWidth;
      wasMaximized = isNowMaximized;
      
      // Also trigger general resize
      this.onResize();
    };
    
    // Use both standard resize and Chrome-specific resize events
    window.addEventListener('resize', windowResizeHandler);
    
    // Also listen for orientation change (mobile) and visibility change
    window.addEventListener('orientationchange', windowResizeHandler);
    
    const visibilityChangeHandler = () => {
      if (!document.hidden) {
        this.LOG('Document became visible, recalculating');
        windowResizeHandler();
      }
    };
    document.addEventListener('visibilitychange', visibilityChangeHandler);
    
    // Store handlers for cleanup
    (this as any).windowResizeHandler = windowResizeHandler;
    (this as any).visibilityChangeHandler = visibilityChangeHandler;
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

  public resetZoom(): void {
    this.zoomStart = 0;
    this.zoomEnd = 100;
    if (this.chart) {
      this.chart.dispatchAction({
        type: 'dataZoom',
        start: 0,
        end: 100
      });
    }
    this.updateZoomOverlay();
  }
  
  // Hook the zoom sliders
  public onZoomInput(): void {
    // Enforce start <= end
    if (this.zoomStart > this.zoomEnd) {
      [this.zoomStart, this.zoomEnd] = [this.zoomEnd, this.zoomStart];
    }

    if (!this.chart) return;
    this.chart.dispatchAction({
      type: 'dataZoom',
      start: this.zoomStart,
      end: this.zoomEnd
    });
    
    // Update external bar positions (handles/window)
    this.updateZoomOverlay();
  }
  
  // Update the visual position of zoom handles and window
  private updateZoomOverlay(): void {
    const track = this.zoomOverlay?.nativeElement?.querySelector('.zoom-track') as HTMLElement;
    if (!track) return;
    
    const left = this.zoomStart;
    const right = 100 - this.zoomEnd;

    const win = track.querySelector('.zoom-window') as HTMLElement;
    const hl = track.querySelector('.zoom-handle.left') as HTMLElement;
    const hr = track.querySelector('.zoom-handle.right') as HTMLElement;

    if (win) {
      win.style.left = `${left}%`;
      win.style.right = `${right}%`;
    }
    if (hl) hl.style.left = `calc(${left}% - 7px)`;
    if (hr) hr.style.right = `calc(${right}% - 7px)`;
  }
  
  // Handle dragging of zoom handles
  public startDragHandle(event: MouseEvent | TouchEvent, handle: 'start' | 'end'): void {
    event.preventDefault();
    const track = this.zoomOverlay?.nativeElement?.querySelector('.zoom-track') as HTMLElement;
    if (!track) return;
    
    const rect = track.getBoundingClientRect();
    const isTouch = event.type.startsWith('touch');
    
    const moveHandler = (e: MouseEvent | TouchEvent) => {
      const clientX = isTouch ? (e as TouchEvent).touches[0].clientX : (e as MouseEvent).clientX;
      const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      
      if (handle === 'start') {
        this.zoomStart = Math.min(percent, this.zoomEnd);
      } else {
        this.zoomEnd = Math.max(percent, this.zoomStart);
      }
      
      this.onZoomInput();
    };
    
    const upHandler = () => {
      document.removeEventListener('mousemove', moveHandler);
      document.removeEventListener('mouseup', upHandler);
      document.removeEventListener('touchmove', moveHandler);
      document.removeEventListener('touchend', upHandler);
    };
    
    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', moveHandler);
    document.addEventListener(isTouch ? 'touchend' : 'mouseup', upHandler);
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
    
    // Determine margins based on size - increased left margin for multi-line labels
    const leftMargin = this.currentSize === 'small' ? '15%' : '13%';
    const rightMargin = '1%';
    
    // Sync legend overlay to use same margins as grids
    this.syncLegendToGridMargins(leftMargin, rightMargin);
    
    // Use scrolling threshold from settings to determine layout type
    const scrollThreshold = this.ctx.settings?.scrollingStartsAfter || 3;
    
    if (this.currentGrids > scrollThreshold) {
      // For scrollable layouts, use the existing calculation
      gridArray = this.calculateScrollableGrids(this.currentGrids);
    } else {
      // For grids at or below threshold, fit without scrolling
      const grids = [];
      
      // [CLAUDE] Use dynamic top reserve based on actual legend height
      const topReserved = this.getTopReservePct();
      
      // [CLAUDE] Use proper bottom reserve for dataZoom
      const bottomReservedPct = this.getBottomReservePct();
      
      // Get unified gap between grids
      const gapPct = this.getGapPct();
      
      // Calculate available height with buffers to prevent clipping
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
    
    // [CLAUDE] Use dynamic top reserve based on actual legend height
    const topReserved = this.getTopReservePct();
    
    // [CLAUDE] Use proper bottom reserve for dataZoom
    const bottomReserved = this.getBottomReservePct();
    
    // Get gap between grids as percentage from pixels
    const gapPct = this.getGapPct();
    
    // Total vertical budget for plots + their gaps
    // Now accounts for 2.5% buffers at top and bottom to prevent line clipping
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
          color: 'rgba(0, 0, 0, 0.06)',  // Ultra-subtle grid lines
          width: 0.5
        }
      },
      axisLine: { 
        onZero: false,
        lineStyle: {
          color: '#cfd4dc'  // [CLAUDE] Apple-style axis line
        }
      },
      axisTick: {
        show: false  // [CLAUDE] Hide ticks for cleaner look
      },
      position: 'bottom',
      axisLabel: {
        show: true,
        fontSize: this.currentSize === 'small' ? 14 : 
                 this.currentSize === 'large' ? 15 : 16,
        fontWeight: '400',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        hideOverlap: true,
        color: 'rgba(0, 0, 0, 0.7)',  // Darker for better readability
        interval: 'auto',
        formatter: createAxisFormatter(true), // First grid gets special first label
        rotate: this.currentConfig.option.xAxis.rotate,
        align: 'right',
        margin: 20,  // Increased margin to prevent clipping
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
            color: '#e9edf2',  // [CLAUDE] Apple-style subtle grid lines
            width: 1,
            type: 'solid'
          }
        },
        axisLine: { 
          onZero: false,
          show: true,
          lineStyle: {
            color: '#cfd4dc'  // [CLAUDE] Apple-style axis line
          }
        },
        axisTick: {
          show: false  // [CLAUDE] Hide ticks for cleaner look
        },
        position: 'bottom', // Always position at bottom for all grids
        axisLabel: {
          show: true, // NOW SHOWING LABELS ON ALL GRIDS
          fontSize: this.currentSize === 'small' ? 14 : 
                   this.currentSize === 'large' ? 15 : 16,
          fontWeight: '400',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
          color: 'rgba(0, 0, 0, 0.7)',  // Darker for better readability
          hideOverlap: true,
          interval: 'auto', // Auto interval to prevent overcrowding
          formatter: createAxisFormatter(false), // Other grids don't get special first label
          rotate: this.currentConfig.option.xAxis.rotate,
          align: 'right',
          margin: 20,  // Increased margin to prevent clipping
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
    this.LOG("currentYAxisArray getGridUnitsByData:", tempUnits);
    
    // Get the axis position map to determine fixed plot numbers
    const axisMap = this.getAxisPositionMap();
    const visibleGridNames = this.currentGridNames;
    const plotNumber1 = visibleGridNames[0] ? axisMap[visibleGridNames[0]] + 1 : 1;
    
    // Get the actual series label and unit for this grid
    const plotName1 = visibleGridNames[0] ? this.getFirstLabelForGrid(visibleGridNames[0]) : 'Top';
    const unit1 = tempUnits[0] ? `(${tempUnits[0]})` : '';
    
    this.LOG(`Y-Axis 1 - Plot: ${plotNumber1}, Label: ${plotName1}, Unit: ${unit1}`);
    
    // Create label based on configured number of lines
    const numLines = this.ctx.settings?.yAxisLabelLines || 3;
    let multiLineLabel1: string;
    
    if (numLines === 1) {
      // 1 line: "Temperature (°C) - 1"
      multiLineLabel1 = `{singleLine|${plotName1} ${unit1} - ${plotNumber1}}`;
    } else if (numLines === 2) {
      // 2 lines: "Temperature" / "(°C) - 1"
      multiLineLabel1 = `{topLine|${plotName1}}\n{bottomLine|${unit1} - ${plotNumber1}}`;
    } else {
      // 3 lines: "1" / "Temperature" / "(°C)"
      multiLineLabel1 = `{plotNum|${plotNumber1}}\n{plotName|${plotName1}}\n{plotUnit|${unit1}}`;
    }
    
    myYAxisArray.push({
      type: 'value',
      scale: true,
      splitNumber: this.currentConfig.option.yAxis.splitNumber,
      name: multiLineLabel1,  // Axis label (compact or stacked)
      nameLocation: 'middle',
      nameGap: numLines === 1 ? 45 : numLines === 2 ? 55 : 65,  // Adjust gap based on number of lines
      nameRotate: 0,  // Keep horizontal
      nameTextStyle: this.getYAxisLabelStyle(numLines),
      axisLine: {
        show: true,
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.08)',  // Very subtle axis line
          width: 1
        }
      },
      axisTick: {
        show: false  // [CLAUDE] Hide ticks
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(0, 0, 0, 0.06)',  // Ultra-subtle grid lines
          width: 0.5
        }
      },
      axisLabel: {
        formatter: '{value} ' + (tempUnits[0] || ""),
        color: 'rgba(0, 0, 0, 0.45)',  // Softer, more modern label color
        fontSize: this.currentSize === 'small' ? 11 : 
                 this.currentSize === 'large' ? 12 : 13,
        fontWeight: '400',
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
        showMinLabel: true,
        showMaxLabel: true
      },
      gridIndex: 0
    });
    
    // Add Y axes for all grids
    for (let i = 1; i < this.currentGrids; i++) {
      const plotNumber = visibleGridNames[i] ? axisMap[visibleGridNames[i]] + 1 : i + 1;
      
      // Get the actual series label and unit for this grid
      const plotName = visibleGridNames[i] ? this.getFirstLabelForGrid(visibleGridNames[i]) : `Plot${i + 1}`;
      const unit = tempUnits[i] ? `(${tempUnits[i]})` : '';
      
      this.LOG(`Y-Axis ${i + 1} - Plot: ${plotNumber}, Label: ${plotName}, Unit: ${unit}`);
      
      // Create label based on configured number of lines
      let multiLineLabel: string;
      
      if (numLines === 1) {
        // 1 line: "Temperature (°C) - 1"
        multiLineLabel = `{singleLine|${plotName} ${unit} - ${plotNumber}}`;
      } else if (numLines === 2) {
        // 2 lines: "Temperature" / "(°C) - 1"
        multiLineLabel = `{topLine|${plotName}}\n{bottomLine|${unit} - ${plotNumber}}`;
      } else {
        // 3 lines: "1" / "Temperature" / "(°C)"
        multiLineLabel = `{plotNum|${plotNumber}}\n{plotName|${plotName}}\n{plotUnit|${unit}}`;
      }
      
      myYAxisArray.push({
        type: 'value',
        show: true,
        scale: true,
        splitNumber: this.currentConfig.option.yAxis.splitNumber,
        alignTicks: true,
        name: multiLineLabel,  // Axis label (compact or stacked)
        nameLocation: 'middle',
        nameGap: numLines === 1 ? 45 : numLines === 2 ? 55 : 65,  // Adjust gap based on number of lines
        nameRotate: 0,  // Keep horizontal
        nameTextStyle: this.getYAxisLabelStyle(numLines),
        axisLine: {
          show: true,
          lineStyle: {
            color: 'rgba(0, 0, 0, 0.08)',  // Very subtle axis line
            width: 1
          }
        },
        axisTick: {
          show: false  // [CLAUDE] Hide ticks
        },
        splitLine: {
          lineStyle: {
            color: '#e9edf2',  // [CLAUDE] Apple-style subtle grid lines
            width: 1
          }
        },
        axisLabel: {
          formatter: '{value} ' + (tempUnits[i] || ''),
          color: 'rgba(0, 0, 0, 0.45)',  // Softer, more modern label color
          fontSize: this.currentSize === 'small' ? 11 : 
                   this.currentSize === 'large' ? 12 : 13,
          fontWeight: '400',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, sans-serif',
          show: true,
          showMaxLabel: true
        },
        gridIndex: i
      });
    }
    return myYAxisArray;
  }

  private checkDataGridByName(selectedKeys: string[]): Set<string> {
    this.LOG('[Device_Plot_Visi: ] checkDataGridByName called with keys:', selectedKeys);
    
    const matchedValues = selectedKeys.map(key => {
      // Extract label from key to find the matching data object
      const label = this.extractLabelFromKey(key);
      this.LOG('[Device_Plot_Visi: ] Extracted label from key:', key, '->', label);
      
      const foundObject = this.ctx.data.find(obj => obj.dataKey.label === label);
      const axisAssignment = foundObject ? (foundObject.dataKey.settings?.axisAssignment || 'Top') : null;
      
      this.LOG('[Device_Plot_Visi: ] For label', label, 'found axis assignment:', axisAssignment);
      
      // Default to 'Top' if no assignment is set
      return axisAssignment;
    });
    this.LOG('[Device_Plot_Visi: ] All matched values:', matchedValues);
    
    const axisPositionMap = this.getAxisPositionMap();
    this.LOG('[Device_Plot_Visi: ] Axis position map:', axisPositionMap);
    
    const uniqueMatches = new Set(matchedValues.filter(item => item && Object.prototype.hasOwnProperty.call(axisPositionMap, item)));
    this.LOG('[Device_Plot_Visi: ] Unique matches (valid grids):', Array.from(uniqueMatches), ', count:', uniqueMatches.size);
    return uniqueMatches;
  }

  private setDataGridByNames(selectedKeys: string[]): void {
    this.LOG('[Device_Plot_Visi: ] setDataGridByNames called with:', selectedKeys);
    this.LOG('[Device_Plot_Visi: ] Number of selected keys:', selectedKeys.length);
    
    // If no keys with data, keep 1 grid but mark as having no data
    if (selectedKeys.length === 0) {
      this.LOG('[Device_Plot_Visi: ] No series with data - keeping 1 grid for stability');
      this.currentGridNames = ['Top']; // Keep at least one grid
      this.currentGrids = 1; // Minimum 1 grid to prevent chart breaking
      // Only show no data message if we're not waiting for initial data
      if (!this.isInitialLoad || this.hasReceivedData) {
        this.hasNoVisibleData = true; // Flag to show no data message
      }
      return;
    }
    
    // Only clear no data flag if we actually have visible data
    // Check if any of the selected keys correspond to visible series
    const hasActuallyVisibleData = this.checkIfSelectedKeysHaveVisibleData(selectedKeys);
    this.hasNoVisibleData = !hasActuallyVisibleData;
    
    if (hasActuallyVisibleData) {
      this.hasReceivedData = true;
      this.isInitialLoad = false;
    }
    
    // Get unique axis assignments from selected series
    const selectedGrids = this.checkDataGridByName(selectedKeys);
    this.LOG('[Device_Plot_Visi: ] Selected grids from checkDataGridByName:', Array.from(selectedGrids));
    this.LOG('[Device_Plot_Visi: ] Number of unique grids:', selectedGrids.size);
    
    // Update current grid configuration
    this.currentGridNames = Array.from(selectedGrids);
    this.currentGrids = selectedGrids.size;
    
    this.LOG('[Device_Plot_Visi: ] Updated grid configuration from legend:');
    this.LOG('[Device_Plot_Visi: ] - currentGridNames:', this.currentGridNames);
    this.LOG('[Device_Plot_Visi: ] - currentGrids:', this.currentGrids);
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
    // Get all series keys from data
    const data = (this.ctx.data || [])
      .map(s => {
        if (!s?.dataKey?.label) return null;
        const entityName = s.datasource?.entityName || 'Unknown';
        return this.buildSeriesKey(entityName, s.dataKey.label);
      })
      .filter(Boolean) as string[];
    
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
    for (const key of data) {
      if (!(key in selected)) {
        selected[key] = true;
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
      (item.dataKey?.settings?.axisAssignment || 'Top') === gridName
    );
    return found?.dataKey?.units || "";
  }

  private getDataLabelsForGrid(gridName: string): string[] {
    // Get all series labels that belong to this grid
    const labels = this.ctx.data
      .filter(item => (item.dataKey?.settings?.axisAssignment || 'Top') === gridName)
      .map(item => item.dataKey?.label)
      .filter(Boolean);
    return labels;
  }

  private getFirstLabelForGrid(gridName: string): string {
    // Get the first series label for this grid (for display on Y-axis)
    const labels = this.getDataLabelsForGrid(gridName);
    return labels.length > 0 ? labels[0] : gridName;
  }

  private getYAxisLabelStyle(numLines: number): any {
    // Create consistent styling for all layout options
    const baseFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif';
    
    if (numLines === 1) {
      // Single line style
      return {
        rich: {
          singleLine: {
            fontSize: this.currentSize === 'small' ? 13 : 
                     this.currentSize === 'large' ? 15 : 17,
            fontWeight: '500',
            color: 'rgba(0, 0, 0, 0.87)',
            lineHeight: this.currentSize === 'small' ? 16 : 
                        this.currentSize === 'large' ? 18 : 20,
            fontFamily: baseFont
          }
        }
      };
    } else if (numLines === 2) {
      // Two line style
      return {
        rich: {
          topLine: {
            fontSize: this.currentSize === 'small' ? 14 : 
                     this.currentSize === 'large' ? 16 : 18,
            fontWeight: '600',
            color: 'rgba(0, 0, 0, 0.87)',
            lineHeight: this.currentSize === 'small' ? 18 : 
                        this.currentSize === 'large' ? 20 : 22,
            fontFamily: baseFont
          },
          bottomLine: {
            fontSize: this.currentSize === 'small' ? 12 : 
                     this.currentSize === 'large' ? 14 : 16,
            fontWeight: '400',
            color: 'rgba(0, 0, 0, 0.60)',
            lineHeight: this.currentSize === 'small' ? 16 : 
                        this.currentSize === 'large' ? 18 : 20,
            fontFamily: baseFont,
            padding: [2, 0, 0, 0]
          }
        }
      };
    } else {
      // Three line style (default)
      return {
        rich: {
          plotNum: {
            fontSize: this.currentSize === 'small' ? 20 : 
                     this.currentSize === 'large' ? 24 : 28,
            fontWeight: '700',
            color: '#1976d2',  // ThingsBoard primary blue
            lineHeight: this.currentSize === 'small' ? 24 : 
                        this.currentSize === 'large' ? 28 : 32,
            fontFamily: baseFont
          },
          plotName: {
            fontSize: this.currentSize === 'small' ? 14 : 
                     this.currentSize === 'large' ? 16 : 18,
            fontWeight: '500',
            color: 'rgba(0, 0, 0, 0.87)',
            lineHeight: this.currentSize === 'small' ? 18 : 
                        this.currentSize === 'large' ? 20 : 22,
            fontFamily: baseFont,
            padding: [2, 0, 0, 0]
          },
          plotUnit: {
            fontSize: this.currentSize === 'small' ? 12 : 
                     this.currentSize === 'large' ? 13 : 15,
            fontWeight: '400',
            color: 'rgba(0, 0, 0, 0.54)',
            lineHeight: this.currentSize === 'small' ? 15 : 
                        this.currentSize === 'large' ? 16 : 18,
            fontFamily: baseFont,
            padding: [1, 0, 0, 0]
          }
        }
      };
    }
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
    return {
      // [CLAUDE EDIT] Disable animations at root level
      animation: false,
      animationDurationUpdate: 0,
      // Modern Apple-inspired background with subtle gradient
      backgroundColor: {
        type: 'linear',
        x: 0,
        y: 0,
        x2: 0,
        y2: 1,
        colorStops: [{
          offset: 0, color: '#ffffff' // Pure white at top
        }, {
          offset: 1, color: '#fafbfc' // Very subtle gray at bottom
        }]
      },
      // [CLAUDE] Apple-style system font
      textStyle: {
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
      },
      // Hidden controller legend - maintains selection state but not visible
      legend: [{
        id: 'controllerLegend',
        show: false,  // Hidden from view
        type: 'scroll',
        data: this.getLegendState().data,
        selected: this.getLegendState().selected,
        selectedMode: true
      }],
      tooltip: {
        trigger: 'axis',
        triggerOn: 'mousemove|click',
        confine: true,
        animation: false,  // [CLAUDE EDIT] Disable tooltip animation
        // [CLAUDE] Apple-style tooltip design
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderColor: 'rgba(0, 0, 0, 0.1)',
        borderWidth: 1,
        borderRadius: 12,
        shadowBlur: 20,
        shadowColor: 'rgba(0, 0, 0, 0.1)',
        shadowOffsetY: 5,
        textStyle: {
          color: '#1d1d1f',
          fontSize: 12,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial'
        },
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

          // [CLAUDE] Sort by grid order (same as legend), then by value
          const MAX_ITEMS = this.ctx.settings?.tooltipMaxItems ?? 10;
          
          // Add grid position to each item
          const itemsWithPosition = visible.map(item => {
            const label = this.extractLabelFromKey(item.seriesName);
            const gridPos = this.gridOrderIndexOfLabel(label);
            return { ...item, gridPos, label };
          });
          
          // Sort by grid position first (like legend), then by value
          itemsWithPosition.sort((a, b) => {
            // First sort by grid position
            if (a.gridPos !== b.gridPos) {
              return a.gridPos - b.gridPos;
            }
            // Then by value (descending)
            return Math.abs(b.value[1]) - Math.abs(a.value[1]);
          });
          
          const items = itemsWithPosition.slice(0, MAX_ITEMS);
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
              // Use the label we already extracted (it has gridPos ordering)
              const displayName = it.label || this.extractLabelFromKey(it.seriesName);
              html += `<tr>
                <td style="padding:2px 6px 2px 0;white-space:nowrap">${it.marker} ${displayName}</td>
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
        animation: false,  // [CLAUDE EDIT] Disable axisPointer animation
        link: [{
          xAxisIndex: 'all'
        }]
      },
      dataZoom: this.getDataZoomConfig()
    };
  }


  private getDataZoomConfig(): any[] {
    return [
      // Keep the internal slider hidden — external bar controls start/end
      { 
        type: 'slider', 
        show: false, 
        xAxisIndex: 'all', 
        start: this.zoomStart, 
        end: this.zoomEnd 
      },
      // INSIDE zoom: wheel & pinch should just work anywhere over the plots
      {
        type: 'inside',
        xAxisIndex: 'all',
        start: this.zoomStart,
        end: this.zoomEnd,
        zoomOnMouseWheel: true,   // ← allow wheel zoom
        moveOnMouseWheel: false,  // wheel zooms, not pans
        moveOnMouseMove: true,    // drag pans
        zoomOnTouch: true,        // enable touch
        throttle: 50
      }
    ];
  }

  // Utility methods
  private LOG(...args: any[]): void {
    if (this.DEBUG) {
      console.log("[sc chart v6.1 3sub production]", ...args);
    }
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

  // ===== Custom Legend Toolbar Methods =====
  
  // Get count of visible labels
  private getVisibleLabelCount(): number {
    const group = this.getGroupLegendState();
    return Object.values(group.selected).filter(v => v !== false).length;
  }

  // Check if a label can be turned off (at least one must remain visible)
  public canTurnOff(label: string): boolean {
    const group = this.getGroupLegendState();
    const isOn = group.selected[label] !== false;
    if (!isOn) return true; // turning on is always fine
    const visible = this.getVisibleLabelCount();
    return visible > 1; // can only turn off if there would still be >=1 left
  }

  // Visual feedback when action is blocked
  private pulseChip(label: string): void {
    this.lastPulsedLabel = label;
    setTimeout(() => {
      this.lastPulsedLabel = null;
      if (this.ctx?.detectChanges) {
        this.ctx.detectChanges();
      }
    }, 250);
  }
  
  // Get representative color for a label (first visible series with this label)
  private pickRepresentativeColor(label: string): string {
    // Find first series with this label
    for (const series of this.ctx.data) {
      if (series?.dataKey?.label === label) {
        const entityName = series.datasource?.entityName || 'Unknown';
        // Return the entity color if we have it
        if (this.entityColorMap[entityName]) {
          return this.entityColorMap[entityName];
        }
      }
    }
    // Fallback to a default color
    return '#999999';
  }
  
  // [CLAUDE EDIT] Build/update the legend items from the grouped legend state
  private syncCustomLegendFromChart(): void {
    if (!this.chart) return;
    
    const group = this.getGroupLegendState();
    
    // Get the fixed plot number for each label based on its axis assignment
    const axisMap = this.getAxisPositionMap();
    
    // Build legend items with colors and FIXED plot numbers
    const itemsWithPosition = group.data.map(label => {
      // Find the axis assignment for this label
      let axisAssignment = 'Top'; // Default
      for (const series of this.ctx.data || []) {
        if (series?.dataKey?.label === label) {
          axisAssignment = series.dataKey?.settings?.axisAssignment || 'Top';
          break;
        }
      }
      
      // Get the fixed plot number from the axis map
      const fixedPlotNumber = (axisMap[axisAssignment] ?? 0) + 1; // Make it 1-based
      
      return {
        label,
        color: this.pickRepresentativeColor(label),
        selected: group.selected[label] !== false,
        plotNumber: fixedPlotNumber
      };
    });
    
    // Sort by plot number for consistent ordering
    this.legendItems = itemsWithPosition
      .sort((a, b) => a.plotNumber - b.plotNumber || a.label.localeCompare(b.label));
    
    // [CLAUDE EDIT] Apply pagination without recalculating widths
    this.applyLegendPagination();
    
    // Trigger change detection
    if (this.ctx?.detectChanges) {
      this.ctx.detectChanges();
    }
  }
  
  // Sync legend overlay position with grid margins
  private syncLegendToGridMargins(leftPct: string, rightPct: string): void {
    if (this.chartContainer?.nativeElement) {
      const chartEl = this.chartContainer.nativeElement;
      chartEl.style.setProperty('--plot-left', leftPct);
      chartEl.style.setProperty('--plot-right', rightPct);
    }
  }
  
  
  // [CLAUDE EDIT] Calculate items per page based on measured widths with debouncing
  private calculateItemsPerPage(): void {
    // Skip if no items or viewport not ready
    if (!this.legendItems.length || !this.legendViewport?.nativeElement) {
      return;
    }
    
    // Clear any pending calculation
    if (this.paginationCalculationTimer) {
      clearTimeout(this.paginationCalculationTimer);
    }
    
    // Debounce the calculation to prevent flip-flopping
    this.paginationCalculationTimer = setTimeout(() => {
      this.performPaginationCalculation();
    }, 150); // Wait for DOM to settle
  }
  
  private performPaginationCalculation(): void {
    if (!this.legendViewport?.nativeElement || !this.legendItems.length) return;
    
    const viewport = this.legendViewport.nativeElement;
    const overlay = viewport.closest('.legend-overlay') as HTMLElement;
    
    // Force comprehensive DOM reflow to ensure we have accurate measurements
    // This is critical after fullscreen changes
    void viewport.offsetHeight; // Force reflow
    void viewport.offsetWidth;
    void viewport.getBoundingClientRect();
    
    // Get the computed styles to force style recalculation
    const computedStyle = window.getComputedStyle(viewport);
    void computedStyle.width;
    
    // Use clientWidth instead of offsetWidth to exclude borders
    // Also check if the overlay has proper padding applied
    let viewportWidth = viewport.clientWidth;
    
    // During fullscreen transitions, the CSS custom properties might not be applied yet
    // So we need to account for the padding manually if needed
    if (overlay) {
      const overlayStyle = window.getComputedStyle(overlay);
      const paddingLeft = parseFloat(overlayStyle.paddingLeft) || 0;
      const paddingRight = parseFloat(overlayStyle.paddingRight) || 0;
      
      // If paddings seem too small (< 10px total), it might mean percentages haven't resolved
      if (paddingLeft + paddingRight < 10) {
        // Apply a safety margin to prevent clipping
        const safetyMargin = viewportWidth * 0.15; // 15% safety margin
        viewportWidth = viewportWidth - safetyMargin;
        this.LOG(`Applied safety margin during transition: effective width = ${viewportWidth}`);
      }
    }
    
    // Simple estimation approach
    const estimatedChipWidth = 130; // Estimate for chip with plot number and text
    const gap = 8;
    const pagerWidth = 70; // Space for pagination buttons
    const buffer = 30; // Increased buffer for safety
    
    const estimatedTotalWidth = this.legendItems.length * (estimatedChipWidth + gap);
    const availableWidthWithoutPagers = viewportWidth - buffer;
    const availableWidthWithPagers = viewportWidth - pagerWidth - buffer;
    
    // Store current page
    const currentPage = this.legendCurrentPage;
    
    // Check if we've successfully shown all items before at this width
    if (!this.legendNeedsPagination && this.legendItems.length === this.legendPageItems.length) {
      // We're currently showing all items without pagination - remember this
      this.maxItemsWithoutPagination = Math.max(this.maxItemsWithoutPagination, this.legendItems.length);
    }
    
    // If we know these items have fit before, don't add pagination
    if (this.legendItems.length <= this.maxItemsWithoutPagination && 
        estimatedTotalWidth <= availableWidthWithoutPagers + 100) { // Be more generous
      // All items should fit based on history
      this.legendNeedsPagination = false;
      this.legendItemsPerPage = this.legendItems.length;
      this.legendCurrentPage = 0;
      this.legendPageItems = [...this.legendItems];
    } else if (estimatedTotalWidth <= availableWidthWithoutPagers) {
      // All items fit - no pagination needed
      this.legendNeedsPagination = false;
      this.legendItemsPerPage = this.legendItems.length;
      this.legendCurrentPage = 0;
      this.legendPageItems = [...this.legendItems];
      // Remember this success
      this.maxItemsWithoutPagination = Math.max(this.maxItemsWithoutPagination, this.legendItems.length);
    } else {
      // Pagination needed
      this.legendNeedsPagination = true;
      const itemsPerPage = Math.max(3, Math.floor(availableWidthWithPagers / (estimatedChipWidth + gap)));
      
      // Only update if changed
      if (Math.abs(this.legendItemsPerPage - itemsPerPage) > 0) {
        this.legendItemsPerPage = itemsPerPage;
      }
      
      // Restore current page if valid
      const maxPage = Math.ceil(this.legendItems.length / this.legendItemsPerPage) - 1;
      this.legendCurrentPage = Math.min(currentPage, Math.max(0, maxPage));
      
      this.applyLegendPagination();
    }
    
    if (this.ctx?.detectChanges) {
      this.ctx.detectChanges();
    }
  }
  
  
  // [CLAUDE EDIT] Apply pagination without recalculating widths
  private applyLegendPagination(): void {
    // If pagination not needed, show all items
    if (!this.legendNeedsPagination) {
      this.legendPageItems = [...this.legendItems];
      this.legendTotalPages = 1;
      this.legendCurrentPage = 0;
      this.legendHasMorePages = false;
      return;
    }
    
    // Standard pagination - simple window sliding
    const startIdx = this.legendCurrentPage * this.legendItemsPerPage;
    const endIdx = Math.min(startIdx + this.legendItemsPerPage, this.legendItems.length);
    
    // Show items for current page
    this.legendPageItems = this.legendItems.slice(startIdx, endIdx);
    
    // Calculate total pages
    this.legendTotalPages = Math.ceil(this.legendItems.length / this.legendItemsPerPage);
    
    // Ensure current page is valid
    if (this.legendCurrentPage >= this.legendTotalPages) {
      this.legendCurrentPage = Math.max(0, this.legendTotalPages - 1);
    }
    
    // Update pagination flags
    this.legendHasMorePages = (this.legendCurrentPage + 1) < this.legendTotalPages;
  }
  // [CLAUDE EDIT] Navigate to previous page
  public legendPrevPage(): void {
    if (this.legendCurrentPage > 0) {
      this.legendCurrentPage--;
      this.applyLegendPagination();  // [CLAUDE EDIT] Use apply instead of update
      if (this.ctx?.detectChanges) {
        this.ctx.detectChanges();
      }
    }
  }
  
  // [CLAUDE EDIT] Navigate to next page
  public legendNextPage(): void {
    if (this.legendCurrentPage < this.legendTotalPages - 1) {
      this.legendCurrentPage++;
      this.applyLegendPagination();  // [CLAUDE EDIT] Use apply instead of update
      if (this.ctx?.detectChanges) {
        this.ctx.detectChanges();
      }
    }
  }

  // New toggleLabel method for legend chip items
  public toggleLabel(item: { label: string; selected: boolean }): void {
    if (!this.chart) return;
    
    // Find the actual item in the main array
    const mainItem = this.legendItems.find(i => i.label === item.label);
    if (!mainItem) return;
    
    // Count currently selected items
    const selectedCount = this.legendItems.filter(i => i.selected).length;
    
    // Guard: prevent hiding the last visible series
    if (mainItem.selected && selectedCount === 1) {
      this.pulseChip(mainItem.label);
      return;
    }
    
    // Toggle the selection in both main and page item
    mainItem.selected = !mainItem.selected;
    item.selected = mainItem.selected;
    
    // Dispatch actions to toggle all series for this label
    this.toggleAllSeriesForLabel(mainItem.label, mainItem.selected);
  }
  
  // Helper to toggle all series belonging to a label
  private toggleAllSeriesForLabel(label: string, shouldSelect: boolean): void {
    if (!this.chart) return;
    
    const action = shouldSelect ? 'legendSelect' : 'legendUnSelect';
    
    // Build all controller legend keys for this label
    const keys: string[] = [];
    for (const series of (this.ctx.data || [])) {
      if (series?.dataKey?.label === label) {
        const entityName = series.datasource?.entityName || 'Unknown';
        const seriesKey = this.buildSeriesKey(entityName, label);
        keys.push(seriesKey);
      }
    }
    
    // Dispatch actions for all matching series
    keys.forEach(key => {
      this.chart.dispatchAction({ 
        type: action, 
        name: key, 
        legendIndex: 0 
      });
    });
    
    // Re-sync UI & possibly recompute grids
    setTimeout(() => {
      this.syncCustomLegendFromChart();
      this.refreshEntityList();
      
      // Check if grid layout needs to change
      this.legendOverridesGrids = true;
      const chartOption: any = this.chart.getOption();
      const legendSelected = (chartOption?.legend?.[0]?.selected) || {};
      const activeSeriesKeys = Object.keys(legendSelected).filter(k => legendSelected[k] !== false);
      
      const previousGridCount = this.currentGrids;
      
      // Capture scroll position before mode change
      this.captureScrollPosition();
      
      this.setDataGridByNames(activeSeriesKeys);
      
      if (previousGridCount !== this.currentGrids) {
        this.LOG(`[SCROLL] Mode transition detected: ${previousGridCount} → ${this.currentGrids} grids`);
        this.resetGrid = true;
        this.applyScrollableHeight();
        this.onDataUpdated();
        
        // Restore appropriate scroll position after chart updates
        setTimeout(() => {
          this.restoreScrollPosition();
        }, 200); // Wait for chart to complete rendering
      }
    }, 50);
  }

}