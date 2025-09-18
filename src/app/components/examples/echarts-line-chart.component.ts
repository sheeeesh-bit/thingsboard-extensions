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
import JSZip from 'jszip';
import { Observable, of, firstValueFrom } from 'rxjs';
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
  public isExporting = false;  // Track export loading state
  public showExportOptions = false;  // Track export pulldown state
  
  // Entity sidebar model
  public entityList: Array<{
    name: string;           // Original entity name (for functionality)
    displayName: string;    // Display name (deviceName attribute or fallback)
    label: string;          // Label attribute for tooltip
    deviceName: string;     // DeviceName attribute for tooltip
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
  private PERF_DEBUG = true; // Enable performance diagnostics for tooltip lag analysis
  private lastChartRenderStart = 0; // Track render timing
  // Removed throttling variables - using native ECharts smooth performance
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
  
  // Plot (label) state tracking - persists across device toggles
  private plotLabelStates = new Map<string, boolean>(); // label -> visible state

  // Min/Max reference lines state
  private minMaxVisible = false;
  private minMaxCache = new Map<number, { min: number; max: number }>();
  private minMaxStyle: 'dashed' | 'solid' | 'dotted' = 'dashed';
  private minMaxColor = 'rgba(128, 128, 128, 0.5)';
  private minColor = '#ff4757';
  private maxColor = '#5352ed';
  private minMaxLineWidth = 2;
  private minMaxDebugLogs = false;
  
  // Alarm overlay state
  private alarmStatusVisible = false;
  private alarmData: Map<string, { min?: number; max?: number; severity?: string }> | null = null;
  private alarmFetchPromise: Promise<void> | null = null;
  private alarmOpacity = 0.12;
  private alarmShowCritical = true;
  private alarmShowWarning = true;
  private alarmShowInfo = false;
  
  // Alarm lines state (similar to min/max lines)
  private alarmLinesVisible = false;
  private alarmLineStyle: 'dashed' | 'solid' | 'dotted' = 'dashed';
  private alarmLineWidth = 2;
  private alarmMinColor = '#ff9500';
  private alarmMaxColor = '#ff3b30';
  private alarmDebugLogs = true;
  private alarmAttributeSubscription: any = null;
  private alarmUpdateTimer: any = null;
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
  
  // UI Performance optimization state
  private clickDebounceTimeout: any = null;
  private pendingUIUpdates = new Set<string>();
  private uiUpdateBatch: any = null;
  
  // ECharts interaction optimization state
  private pendingChartActions: Array<{type: string, name: string, legendIndex: number}> = [];
  private chartActionBatch: any = null;
  private originalAnimationState: boolean | null = null;
  
  // Critical INP performance optimization state
  private rafId: number | null = null;
  private pendingDataUpdates: any[] = [];
  private lastUpdateTime = 0;
  private isUpdating = false;
  
  // Sidebar state
  public isSidebarVisible = true;
  public sidebarDisplayMode: 'full' | 'compact' | 'colors' = 'full';
  public sidebarCollapsedMode: 'hidden' | 'colors' = 'hidden';
  public sidebarWidth = 240; // Default width, will be calculated dynamically
  
  // UI feedback states
  // private lastPulsedEntity: string | null = null; // Unused - removed for performance
  
  // Cache for entity display names
  private entityDisplayNameCache = new Map<string, string>();
  private entityAttributesCache = new Map<string, { label: string; deviceName: string }>();
  
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
  
  // Toggle sidebar visibility
  public toggleSidebar(): void {
    this.isSidebarVisible = !this.isSidebarVisible;
    
    // Update margins and sync overlays immediately
    const margins = this.getPlotMargins();
    this.syncLegendToGridMargins(margins.left, margins.right);
    
    // Force grid reset to apply new margins
    this.resetGrid = true;
    
    // Update grid margins immediately
    this.onDataUpdated();
    
    // Trigger chart resize and legend recalculation after animation
    setTimeout(() => {
      if (this.chart && !this.chart.isDisposed()) {
        this.chart.resize();
      }
      
      // Recalculate legend pagination with new width
      this.calculateItemsPerPage();
      this.ctx.detectChanges();
    }, 300); // Wait for CSS transition
  }

  // Get count of selected (visible) devices
  public getSelectedDeviceCount(): number {
    if (!this.entityList) return 0;
    return this.entityList.filter(entity => entity.visible).length;
  }

  // Check if all devices are hidden (for warning indicator)
  public hasAllDevicesHidden(): boolean {
    if (!this.entityList || this.entityList.length === 0) return false;
    const visibleCount = this.getSelectedDeviceCount();
    const totalWithData = this.entityList.filter(entity => entity.dataPoints > 0).length;
    return totalWithData > 0 && visibleCount < totalWithData;
  }

  // Check if all devices are empty (no data at all)
  public getAllDevicesEmpty(): boolean {
    if (!this.entityList || this.entityList.length === 0) return true;
    return this.entityList.every(entity => entity.dataPoints === 0);
  }

  // Check if only empty devices are selected (visible)
  public hasOnlyEmptyDevicesSelected(): boolean {
    if (!this.entityList || this.entityList.length === 0) return false;
    const visibleDevices = this.entityList.filter(entity => entity.visible);
    if (visibleDevices.length === 0) return false;
    return visibleDevices.every(entity => entity.dataPoints === 0);
  }

  // Get all status messages for the tooltip
  public getStatusMessages(): { type: 'warning' | 'info', message: string }[] {
    const messages: { type: 'warning' | 'info', message: string }[] = [];

    // Check if no devices are selected/visible
    const visibleDevices = this.entityList?.filter(e => e.visible) || [];
    if (visibleDevices.length === 0 && this.entityList?.length > 0) {
      messages.push({ type: 'warning', message: 'No devices selected' });
      // Make sure to show the no data overlay
      if (!this.hasNoVisibleData) {
        this.hasNoVisibleData = true;
        this.ctx.detectChanges();
      }
    } else if (this.hasNoVisibleData) {
      // Check for no data conditions
      if (this.getAllDevicesEmpty()) {
        messages.push({ type: 'warning', message: 'No data available for any device' });
      } else {
        messages.push({ type: 'warning', message: 'No visible devices have data' });
      }
    }

    // Check for hidden devices
    if (this.hasAllDevicesHidden()) {
      const hiddenCount = this.entityList.filter(e => !e.visible && e.dataPoints > 0).length;
      if (hiddenCount > 0) {
        messages.push({
          type: 'warning',
          message: `${hiddenCount} device${hiddenCount > 1 ? 's' : ''} with data hidden`
        });
      }
    }

    // Check for manually hidden plots
    const hiddenPlots = Array.from(this.plotLabelStates.entries())
      .filter(([label, visible]) => !visible)
      .map(([label]) => label);

    if (hiddenPlots.length > 0) {
      messages.push({
        type: 'warning',
        message: `${hiddenPlots.length} plot${hiddenPlots.length > 1 ? 's' : ''} manually hidden: ${hiddenPlots.join(', ')}`
      });
    }

    // Check for devices without data
    const emptyDevices = this.entityList?.filter(e => e.visible && e.dataPoints === 0) || [];
    if (emptyDevices.length > 0 && !this.getAllDevicesEmpty()) {
      messages.push({
        type: 'warning',
        message: `${emptyDevices.length} visible device${emptyDevices.length > 1 ? 's' : ''} without data`
      });
    }

    return messages;
  }

  // Check if there are any status messages to show
  public hasStatusMessages(): boolean {
    return this.getStatusMessages().length > 0;
  }

  // Get the primary status type (warning takes precedence over info)
  public getPrimaryStatusType(): 'warning' | 'info' {
    const messages = this.getStatusMessages();
    return messages.some(m => m.type === 'warning') ? 'warning' : 'info';
  }

  // Format status messages as HTML for tooltip
  public getStatusTooltip(): string {
    const messages = this.getStatusMessages();
    if (messages.length === 0) return '';

    if (messages.length === 1) {
      return messages[0].message;
    }

    // Create HTML list for multiple messages
    const listItems = messages
      .map(m => `• ${m.message}`)
      .join('\n');

    return listItems;
  }

  // Hide all devices
  public hideAllDevices(): void {
    if (!this.ctx?.data || !this.chart || !this.entityList || this.entityList.length === 0) return;

    // Note: We hide ALL devices/entities, but preserve plot (label) toggle states
    // This means if a plot was manually toggled off, it stays off

    // Collect all series keys to hide
    const allSeriesKeys: string[] = [];

    for (const data of this.ctx.data) {
      const entityName = data.datasource?.entityName || 'Unknown';
      const label = data.dataKey.label;
      const seriesKey = this.buildSeriesKey(entityName, label);
      allSeriesKeys.push(seriesKey);
    }

    // Hide all series
    allSeriesKeys.forEach(key => {
      this.batchedDispatchAction({
        type: 'legendUnSelect',
        name: key,
        legendIndex: 0
      });
    });

    // Update UI after batch operations
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();

      // Check if we need to update grid configuration
      this.legendOverridesGrids = true;
      const previousGridCount = this.currentGrids;

      // No active series since we're hiding everything
      this.setDataGridByNames([]);

      // If grid count changed, rebuild the chart
      if (previousGridCount !== this.currentGrids) {
        this.resetGrid = true;
        this.applyScrollableHeight();
        this.onDataUpdated();
      }

      this.ctx.detectChanges();
    }, 100);
  }

  // Show all devices
  public showAllDevices(): void {
    if (!this.ctx?.data || !this.chart || !this.entityList || this.entityList.length === 0) return;

    // Initialize plot states if not already set
    const uniqueLabels = new Set<string>();
    for (const data of this.ctx.data) {
      const label = data.dataKey.label;
      if (!this.plotLabelStates.has(label)) {
        // If not tracked yet, default to visible
        this.plotLabelStates.set(label, true);
      }
      uniqueLabels.add(label);
    }

    // Get all series keys from all entities, but only for plots that should be visible
    const allSeriesKeys: string[] = [];
    const seriesToShow: string[] = [];

    for (const data of this.ctx.data) {
      const entityName = data.datasource?.entityName || 'Unknown';
      const label = data.dataKey.label;
      const seriesKey = this.buildSeriesKey(entityName, label);
      allSeriesKeys.push(seriesKey);

      // Only show this series if its plot (label) is not manually hidden
      const plotVisible = this.plotLabelStates.get(label) !== false;
      if (plotVisible) {
        seriesToShow.push(seriesKey);
      }
    }

    // First, select all series that should be shown
    seriesToShow.forEach(key => {
      this.batchedDispatchAction({
        type: 'legendSelect',
        name: key,
        legendIndex: 0
      });
    });

    // Then, ensure hidden plots stay hidden
    const hiddenPlotSeries = allSeriesKeys.filter(key => !seriesToShow.includes(key));
    hiddenPlotSeries.forEach(key => {
      this.batchedDispatchAction({
        type: 'legendUnSelect',
        name: key,
        legendIndex: 0
      });
    });

    // Update UI after batch operations
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();

      // Check if we need to update grid configuration
      this.legendOverridesGrids = true;
      const previousGridCount = this.currentGrids;

      // Capture scroll position before mode change
      this.captureScrollPosition();

      // Filter to only include series that have actual data AND their plot is visible
      const activeSeriesWithData = seriesToShow.filter(key => {
        const series = this.ctx.data.find(d => this.buildSeriesKey(d.datasource?.entityName || '', d.dataKey.label) === key);
        return series && series.data && Array.isArray(series.data) && series.data.length > 0;
      });

      // Pass only series that have actual data
      this.setDataGridByNames(activeSeriesWithData);

      // If grid count changed, rebuild the chart
      if (previousGridCount !== this.currentGrids) {
        this.resetGrid = true;
        this.applyScrollableHeight();
        this.onDataUpdated();

        // Restore appropriate scroll position after chart updates
        setTimeout(() => {
          this.restoreScrollPosition();
        }, 200);
      }

      this.ctx.detectChanges();
    }, 100);
  }

  ngOnInit(): void {
    
    // Initialize sidebar settings
    this.sidebarDisplayMode = this.ctx.settings?.sidebarDisplayMode || 'full';
    this.sidebarCollapsedMode = this.ctx.settings?.sidebarCollapsedMode || 'hidden';
    
    // Initialize color scheme
    this.currentColorScheme = this.ctx.settings?.colorScheme || 'default';
    
    // Initialize min/max settings from widget configuration
    this.minMaxVisible = this.ctx.settings?.minMaxVisible === true;
    this.minMaxStyle = this.ctx.settings?.minMaxStyle || 'dashed';
    this.minMaxColor = this.ctx.settings?.minMaxColor || 'rgba(128, 128, 128, 0.5)';
    this.minColor = this.ctx.settings?.minColor || '#ff4757';
    this.maxColor = this.ctx.settings?.maxColor || '#5352ed';
    this.minMaxLineWidth = this.ctx.settings?.minMaxLineWidth || 2;
    this.minMaxDebugLogs = this.ctx.settings?.debugMinMaxLogs === true;
    
    // Initialize alarm settings from widget configuration
    // Check if alarm support is enabled first
    const alarmSupportEnabled = this.ctx.settings?.alarmSupportEnabled === true;
    
    // Only enable alarm features if alarm support is enabled
    this.alarmStatusVisible = alarmSupportEnabled && this.ctx.settings?.alarmStatusVisible === true;
    this.alarmDebugLogs = this.ctx.settings?.debugAlarmLogs === true;
    this.alarmLinesVisible = alarmSupportEnabled && this.ctx.settings?.alarmLinesVisible === true;
    this.alarmLineStyle = this.ctx.settings?.alarmLineStyle || 'dashed';
    this.alarmLineWidth = this.ctx.settings?.alarmLineWidth || 2;
    this.alarmMinColor = this.ctx.settings?.alarmMinColor || '#ff9500';
    this.alarmMaxColor = this.ctx.settings?.alarmMaxColor || '#ff3b30';
    
    // Reset entity color mapping on initialization
    this.entityColorMap = {};
    this.nextColorIndex = 0;
    
    // Initialize DatePipe with user's locale
    
    // Initialize debug output first
    this.DEBUG = this.ctx.settings.debugOutput;
    this.PERF_DEBUG = this.ctx.settings.performanceDebug !== false; // Default enabled
    
    // Force maximum performance settings
    this.applyMaximumPerformanceSettings();
    
    // Log data series details
    
    // Log first few series for debugging
    if (this.ctx.data && this.ctx.data.length > 0) {
      for (let i = 0; i < Math.min(5, this.ctx.data.length); i++) {
      }
    }
    
    // Log datasources information
    if (this.ctx.datasources) {
      this.ctx.datasources.forEach((ds, idx) => {
      });
    }
    
    if (this.ctx.data && this.ctx.data.length > 0) {
      this.ctx.data.forEach((item: any, index: number) => {
        const axisAssignment = item?.dataKey?.settings?.axisAssignment;
      });
    } else {
    }
    
    // Setup menu buttons
    this.ctx.$scope.menuButtons = (buttonName: string) => {
      switch (buttonName) {
        case 'genImage':
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
    
    // Count grids by settings
    const axisPositionMap = this.getAxisPositionMap();
    this.setGrids = this.countGridsBySettings(Object.keys(axisPositionMap));
    
    this.currentGridNames = Array.from(this.setGrids);
    this.maxGrids = this.setGrids.size;
    this.currentGrids = this.maxGrids;
    
    
    // Subscribe to ThingsBoard state changes
    this.subscribeToStateChanges();
    
  }

  ngAfterViewInit(): void {
    
    // Don't apply height here - let initChart handle it
    
    // Check lazy loading setting
    const useLazyLoading = this.ctx.settings?.useLazyLoading !== false;
    
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
    
    // Create intersection observer to detect when chart becomes visible
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
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
    } else {
      // Fallback for browsers without IntersectionObserver
      this.initializeImmediate();
    }
  }
  
  private initializeImmediate(): void {
    // Set initial legend padding to prevent cutoff on first render
    // This ensures the CSS custom properties are set before the legend renders
    const margins = this.getPlotMargins();
    this.syncLegendToGridMargins(margins.left, margins.right);
    
    // Delay initialization to ensure layout is complete
    setTimeout(() => {
      this.initChart();
      this.setupResizeObserver();
      
      // Initialize zoom overlay positions
      this.updateZoomOverlay();
      
      // CRITICAL: Expose component to ThingsBoard's widget.js bridge
      // This allows TB to call our methods and flush pending updates
      if (this.ctx.$scope) {
        this.ctx.$scope.echartsLineChartComponent = this;
        
        // If widget.js has already queued pending updates, flush them now
        if (typeof this.ctx.$scope.componentReady === 'function') {
          this.ctx.$scope.componentReady();
        }
      }
    }, 100);
  }
  
  private setupFullscreenListener(): void {
    const fullscreenHandler = () => {
      
      // Detect if we're exiting fullscreen (most problematic case)
      const isExitingFullscreen = !document.fullscreenElement && 
                                   !(document as any).webkitFullscreenElement &&
                                   !(document as any).mozFullScreenElement &&
                                   !(document as any).msFullscreenElement;
      
      if (isExitingFullscreen) {
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
          
          // Recalculate with fresh measurements
          this.calculateItemsPerPage();
        }
      }, 250); // Medium delay for layout to partially settle
      
      // Third recalculation - final check after everything has settled
      setTimeout(() => {
        
        // Force final recalculation with fully settled measurements
        if (this.legendViewport?.nativeElement) {
          const viewport = this.legendViewport.nativeElement;
          
          // One more comprehensive reflow
          void viewport.offsetHeight;
          void viewport.offsetWidth;
          void viewport.scrollWidth;
          
          const width = viewport.offsetWidth;
          
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
      delete this.ctx.$scope.echartsLineChartComponent;
    }
    
    // Clean up alarm monitoring
    if (this.alarmUpdateTimer) {
      clearInterval(this.alarmUpdateTimer);
      this.alarmUpdateTimer = null;
    }
    
    if (this.alarmAttributeSubscription) {
      try {
        if (typeof this.alarmAttributeSubscription.unsubscribe === 'function') {
          this.alarmAttributeSubscription.unsubscribe();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      this.alarmAttributeSubscription = null;
    }
    
    // Clean up resize debounce timer
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    
    // Clean up RAF for INP optimization
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
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
    
    // Reset hovered grid index to avoid stale references
    this.hoveredGridIndex = null;
    
    // Count total data points for optimization decisions
    const dataCountStart = performance.now();
    this.totalDataPoints = this.ctx.data?.reduce((sum, series) => 
      sum + (series.data?.length || 0), 0) || 0;
    const dataCountDuration = performance.now() - dataCountStart;
    
    
    // Performance threshold warnings
    if (this.totalDataPoints > 10000) {
    }
    if (this.totalDataPoints > 50000) {
    }
    
    // Series count performance warnings
    const seriesCount = this.ctx.data?.length || 0;
    if (seriesCount > 50) {
    }
    if (seriesCount > 100) {
    }
    
    // Process update immediately
    // Clear legend override if this is fresh data from ThingsBoard
    const hasNewData = this.ctx.data?.some((series, idx) => 
      series.data?.length !== this.lastDataLengths?.[idx]
    );
    
    if (hasNewData) {
      this.legendOverridesGrids = false;
      this.lastDataLengths = this.ctx.data?.map(s => s.data?.length || 0) || [];
    }
    
    // Debug: Log detailed data structure
    if (this.ctx.data) {
      this.ctx.data.forEach((series, idx) => {
      });
    }
    
    if (!this.ctx.data || this.ctx.data.length === 0) {
      // Don't return - we need to render the chart structure even with no data
    }
    
    // Check if we have real data with actual points
    const totalDataPoints = this.ctx.data ? this.ctx.data.reduce((sum, series) => 
      sum + (series.data?.length || 0), 0) : 0;
    
    if (totalDataPoints === 0) {
      
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
    
    
    // If chart is not initialized yet, just return
    // The data will be loaded when the chart initializes in ngAfterViewInit
    if (!this.chart) {
      return;
    }

    this.currentConfig = this.isContainerHeight();
    
    // Only recalculate grids from data if legend is not overriding
    if (!this.legendOverridesGrids) {
      
      // Handle case where there's no data
      if (!this.ctx.data || this.ctx.data.length === 0) {
        this.setGrids = new Set(['Top']);
        this.currentGridNames = ['Top'];
        this.maxGrids = 1;
        this.currentGrids = 1;
      } else {
        const axisPositionMap = this.getAxisPositionMap();
        
        const previousGridCount = this.currentGrids;
        this.setGrids = this.countGridsBySettings(Object.keys(axisPositionMap));
        
        this.currentGridNames = Array.from(this.setGrids);
        this.maxGrids = this.setGrids.size;
        this.currentGrids = this.maxGrids;
        
        
        if (previousGridCount !== this.currentGrids) {
          this.resetGrid = true;
          // Keep DOM height in sync on data-driven grid changes
          this.applyScrollableHeight();
        }
      }
    } else {
    }
    
    const myNewOptions: any = {
      // Configurable animation control based on settings and data size
      animation: this.getAnimationSettings(),
      animationDuration: this.getAnimationDuration(),
      animationDurationUpdate: this.getAnimationUpdateDuration(),
      animationEasing: 'linear',  // Use linear for better performance
      animationEasingUpdate: 'linear',  // Linear easing on updates
      useUTC: true  // Use UTC for cheaper date math
    };
    myNewOptions.series = [];
    
    
    // If no data, create empty series to maintain chart structure
    if (!this.ctx.data || this.ctx.data.length === 0) {
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
        gridIndex = 0;
      }
      
      
      // Get entity name for color grouping
      const entityName = this.ctx.data[i].datasource?.entityName || '';
      const entityColor = this.getColorForEntity(entityName);
      const label = this.ctx.data[i].dataKey.label;
      const seriesKey = this.buildSeriesKey(entityName, label);
      
      
      // [CLAUDE EDIT] Performance optimizations
      const points = this.ctx.data[i].data?.length || 0;
      const labelSelected = this.legendItems.find(item => item.label === label)?.selected !== false;
      
      const seriesElement = {
        id: `series_${i}_${seriesKey}`,  // Add ID for incremental updates
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
          width: this.ctx.settings.lineWidth || 3,
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
        symbol: this.ctx.settings.showDataPoints ? 'circle' : 'none',
        symbolSize: (this.ctx.settings.symbolSize_data || 5) * 2.5,
        showSymbol: this.ctx.settings.showDataPoints,
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
      selectedMode: true,
      animation: false,  // Disable legend animation for faster response
      animationDurationUpdate: 0  // No animation delay on updates
    }];
    
    // Add min/max reference lines if enabled
    this.addMinMaxLines(myNewOptions);
    
    // Add alarm lines if enabled
    this.addAlarmLines(myNewOptions);
    
    // Add alarm overlay areas if enabled
    this.addAlarmAreas(myNewOptions);
    
    
    // Apply options without notMerge to preserve tooltip state
    const needsFullReset = this.resetGrid || this.legendOverridesGrids;
    
    if (needsFullReset) {
      // Replace structural parts for grid changes
      this.lastChartRenderStart = performance.now();
      this.chart.setOption(myNewOptions, {
        replaceMerge: ['grid', 'xAxis', 'yAxis', 'series', 'dataZoom']
      });
      this.resetGrid = false;
    } else {
      // Use scheduled updates for smaller datasets for maximum smoothness
      const shouldCoalesce = this.ctx.settings?.coalesceRapidUpdates !== false;
      if (shouldCoalesce && this.totalDataPoints > 500) { // Much more aggressive threshold
        this.scheduleDataUpdate(myNewOptions);
      } else {
        // Use incremental updates with lazyUpdate for better performance
        const updateStart = performance.now();
        this.lastChartRenderStart = performance.now();
        this.chart.setOption(myNewOptions, { 
          notMerge: false, 
          lazyUpdate: true,
          replaceMerge: ['series']  // Only replace series data
        });
        const updateDuration = performance.now() - updateStart;
        
        // Ultra-aggressive direct update performance warnings
        if (updateDuration > 50) { // Much stricter threshold
        }
      }
    }
    
    // Hide the loading spinner after data is rendered
    this.chart.hideLoading();
    
    // Refresh entity list for sidebar and sync custom legend
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();

      // Force pagination calculation after legend updates
      setTimeout(() => {
        this.performPaginationCalculation();
        this.ctx.detectChanges();
      }, 200);
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
    
    // Debounce resize to prevent thrashing
    if (this.resizeDebounceTimer) {
      clearTimeout(this.resizeDebounceTimer);
    }
    
    this.resizeDebounceTimer = setTimeout(() => {
      // Apply correct scroll height based on current active grids
      this.applyScrollableHeight();
      
      if (this.chart) {
        const resizeStart = performance.now();
        this.chart.resize();
        const resizeDuration = performance.now() - resizeStart;
        
        // More aggressive resize performance warnings
        if (resizeDuration > 30) { // Much stricter threshold for maximum performance
        }
      }
      
      const oldSize = this.currentSize;
      this.currentConfig = this.isContainerHeight();
      
      if (oldSize !== this.currentSize) {
      }
      
      this.onDataUpdated();
      
      // Recalculate legend pagination on resize
      this.calculateItemsPerPage();
    }, 16); // Ultra-fast 16ms debounce for maximum responsiveness
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

    // Expose heights as CSS custom properties for sidebar alignment
    if (outer) {
      outer.style.setProperty('--legend-height', `${legendH}px`);
      outer.style.setProperty('--zoom-height', `${zoomH}px`);
    }

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
    
  }

  // Convert px to % based on the current inner chart height
  private pxToPct(px: number): number {
    const el = this.chartContainer?.nativeElement?.querySelector('#echartContainer') as HTMLElement;
    const h = el?.clientHeight || this.ctx.height || 0;
    // Round to 0.01% to avoid fractional pixel issues
    return h ? Math.round((px / h) * 10000) / 100 : 0;
  }
  
  // Unified helper for consistent plot margins across all modes
  private getPlotMargins(): { left: string; right: string } {
    // Check if sidebar feature is completely disabled
    if (this.ctx.settings?.showEntitySidebar === false) {
      // When sidebar is disabled entirely (no toggle button)
      return {
        left: '60px', // Ensure room for axis labels even without sidebar
        right: `${this.ctx.settings?.grid_layout_right || 40}px`
      };
    }
    
    // Calculate actual left margin based on sidebar state
    let actualLeftMargin: number;
    const extraGap = 12; // Fixed gap to keep sidebar toggle away from y-axis text
    
    if (this.isSidebarVisible) {
      // When sidebar is visible, the outer layout already accounts for sidebar width
      // We need enough space for toggle button and y-axis labels
      const base = this.ctx.settings?.grid_layout_left ?? 60;
      actualLeftMargin = Math.max(60, base); // Minimum space for toggle + labels
    } else if (this.sidebarCollapsedMode === 'colors') {
      // When sidebar is collapsed to colors mode (60px width including colors)
      actualLeftMargin = 100; // 60px colors + 40px padding
    } else {
      // When sidebar is completely hidden but toggle button is visible
      actualLeftMargin = 75; // 32px toggle button + 43px padding for comfortable spacing
    }
    
    // Add the extra gap to ensure clean separation
    actualLeftMargin += extraGap;
    
    // Convert to pixels for consistency (ECharts accepts px values in grid config)
    return {
      left: `${actualLeftMargin}px`,
      right: `${this.ctx.settings?.grid_layout_right || 40}px`
    };
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
    
  }
  
  private restoreScrollPosition(): void {
    const container = this.chartContainer?.nativeElement;
    if (!container || this.scrollState.isTransitioning) return;
    
    this.scrollState.isTransitioning = true;
    
    // Determine the appropriate scroll position based on mode transition
    const isNowScrolling = this.isInScrollingMode();
    
    
    // Wait for chart to render, then apply scroll position
    setTimeout(() => {
      if (!container) return;
      
      let targetScrollTop = 0;
      
      if (this.scrollState.wasScrolling && !isNowScrolling) {
        // Transition from scrolling to non-scrolling mode
        // Reset to top for clean fitted view
        targetScrollTop = 0;
      } else if (!this.scrollState.wasScrolling && isNowScrolling) {
        // Transition from non-scrolling to scrolling mode  
        // Keep minimal scroll to show chart properly
        targetScrollTop = 0;
      } else if (this.scrollState.wasScrolling && isNowScrolling) {
        // Both modes are scrolling, try to maintain relative position
        // But be conservative to avoid jarring jumps
        const maxScroll = container.scrollHeight - container.clientHeight;
        const relativePos = Math.min(this.scrollState.position.top * 0.8, maxScroll); 
        targetScrollTop = Math.max(0, relativePos);
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
    // Default to false for better performance
    const enableAnimations = this.ctx.settings?.enableAnimations === true;
    if (!enableAnimations) {
      return false;
    }
    // Smart animation based on data size when explicitly enabled
    const smartAnimation = this.totalDataPoints < 2000;
    return smartAnimation;
  }
  
  private getAnimationDuration(): number {
    const enableAnimations = this.ctx.settings?.enableAnimations === true;
    if (!enableAnimations) return 0;
    return this.totalDataPoints > 1000 ? 100 : 200;
  }
  
  private getAnimationUpdateDuration(): number {
    const enableAnimations = this.ctx.settings?.enableAnimations === true;
    if (!enableAnimations) return 0;
    // Always 0 for updates to maintain performance
    return 0;
  }
  
  private getDataSamplingSettings(points: number): { sampling?: string; large?: boolean; largeThreshold?: number; hoverLayerThreshold?: number } {
    const enableDataSampling = this.ctx.settings?.enableDataSampling !== false;
    const maxDataPoints = this.ctx.settings?.maxDataPoints || 100; // Ultra-low for maximum performance with 98 series
    
    if (!enableDataSampling) {
      return {};
    }
    
    const samplingConfig: any = {};
    
    // Ultra-aggressive sampling for maximum performance
    if (points > maxDataPoints) {
      samplingConfig.sampling = 'lttb';
      samplingConfig.large = true;
      samplingConfig.largeThreshold = Math.floor(maxDataPoints / 4); // Even more aggressive
      samplingConfig.hoverLayerThreshold = 2000; // Lower threshold
    } else if (points > 800) { // Much lower threshold
      samplingConfig.sampling = 'lttb';
    }
    
    return samplingConfig;
  }
  
  private getProgressiveRenderingSettings(points: number): { progressive?: number; progressiveThreshold?: number; hoverAnimation?: boolean } {
    // Enable progressive rendering for much smaller datasets for maximum performance
    const enableProgressiveRendering = this.ctx.settings?.enableProgressiveRendering !== false;
    
    if (!enableProgressiveRendering || points < 2000) { // Much lower threshold
      return {};
    }
    
    return {
      progressive: 2000,  // Smaller chunks for smoother rendering
      progressiveThreshold: 2000,  // Start much earlier
      hoverAnimation: false  // Always disable hover animation
    };
  }
  
  // UI Performance optimization helpers
  private shouldOptimizeClicks(): boolean {
    return this.ctx.settings?.optimizeClickHandling !== false;
  }
  
  private shouldDeferUIUpdates(): boolean {
    return this.ctx.settings?.deferredUIUpdates !== false;
  }
  
  private getClickDebounceMs(): number {
    return this.ctx.settings?.clickDebounceMs || 100;
  }
  
  private debouncedUIUpdate(updateType: string, callback: () => void): void {
    if (!this.shouldOptimizeClicks()) {
      callback();
      return;
    }
    
    const debounceMs = this.getClickDebounceMs();
    
    // Clear existing timeout for this update type
    if (this.clickDebounceTimeout) {
      clearTimeout(this.clickDebounceTimeout);
    }
    
    
    this.clickDebounceTimeout = setTimeout(() => {
      callback();
      this.clickDebounceTimeout = null;
    }, debounceMs);
  }
  
  private batchUIUpdate(updateType: string, callback: () => void): void {
    if (!this.shouldDeferUIUpdates()) {
      callback();
      return;
    }
    
    this.pendingUIUpdates.add(updateType);
    
    if (this.uiUpdateBatch) {
      clearTimeout(this.uiUpdateBatch);
    }
    
    this.uiUpdateBatch = setTimeout(() => {
      callback();
      this.pendingUIUpdates.clear();
      this.uiUpdateBatch = null;
    }, 8); // Ultra-fast ~120fps batching for maximum responsiveness
  }
  
  // ECharts batching optimization helpers
  private shouldBatchEChartsUpdates(): boolean {
    return this.ctx.settings?.batchEChartsUpdates !== false;
  }
  
  private getEChartsUpdateDelay(): number {
    return this.ctx.settings?.echartsUpdateDelay || 50;
  }

  // Critical INP performance methods to prevent 1,728ms presentation delays
  private scheduleDataUpdate(options: any): void {
    // Coalesce rapid updates to prevent jank
    this.pendingDataUpdates.push(options);
    
    if (this.rafId) {
      return; // Update already scheduled
    }
    
    this.rafId = requestAnimationFrame(() => {
      this.processCoalescedUpdates();
      this.rafId = null;
    });
  }

  private processCoalescedUpdates(): void {
    if (this.isUpdating || !this.pendingDataUpdates.length) {
      return;
    }

    this.isUpdating = true;
    const now = performance.now();
    const timeSinceLastUpdate = now - this.lastUpdateTime;
    
    
    // Ultra-aggressive throttling for maximum smoothness
    if (timeSinceLastUpdate < 8) { // 120fps throttle for ultra-smooth performance
      this.rafId = requestAnimationFrame(() => {
        this.processCoalescedUpdates();
        this.rafId = null;
      });
      return;
    }

    // Use the latest update options (discard older ones)
    const discardedUpdates = this.pendingDataUpdates.length - 1;
    const latestOptions = this.pendingDataUpdates[this.pendingDataUpdates.length - 1];
    this.pendingDataUpdates.length = 0;

    if (discardedUpdates > 0) {
    }

    // Apply the update with minimal work
    if (this.chart && !this.chart.isDisposed()) {
      const updateStart = performance.now();
      this.chart.setOption(latestOptions, { 
        notMerge: false, 
        lazyUpdate: true,
        replaceMerge: ['series'],
        silent: true  // Prevent events during update
      });
      const updateDuration = performance.now() - updateStart;
      
      // Ultra-aggressive update performance warnings
      if (updateDuration > 50) { // Much stricter threshold for maximum performance
      }
    }

    this.lastUpdateTime = now;
    this.isUpdating = false;
    
    // Memory usage monitoring (if available)
    if ((window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
    }
  }
  
  private shouldDisableAnimationsDuringInteraction(): boolean {
    return this.ctx.settings?.disableChartAnimationsDuringInteraction !== false;
  }
  
  private batchedDispatchAction(action: {type: string, name: string, legendIndex: number}): void {
    if (!this.chart || !this.shouldBatchEChartsUpdates()) {
      // Direct dispatch when batching disabled
      this.chart?.dispatchAction(action);
      return;
    }
    
    // Add to batch queue
    this.pendingChartActions.push(action);
    
    // Clear existing batch timeout
    if (this.chartActionBatch) {
      clearTimeout(this.chartActionBatch);
    }
    
    // Disable animations for faster interaction
    this.temporarilyDisableAnimations();
    
    const delay = this.getEChartsUpdateDelay();
    
    this.chartActionBatch = setTimeout(() => {
      this.flushChartActionBatch();
    }, delay);
  }
  
  private temporarilyDisableAnimations(): void {
    if (!this.shouldDisableAnimationsDuringInteraction() || !this.chart) return;
    
    // Store original animation state only once
    if (this.originalAnimationState === null) {
      const currentOption = this.chart.getOption();
      this.originalAnimationState = currentOption?.animation !== false;
      
      if (this.originalAnimationState) {
        this.chart.setOption({
          animation: false,
          animationDuration: 0,
          animationDurationUpdate: 0
        });
      }
    }
  }
  
  private restoreAnimations(): void {
    if (this.originalAnimationState === true && this.chart) {
      this.chart.setOption({
        animation: true,
        animationDuration: this.getAnimationDuration(),
        animationDurationUpdate: this.getAnimationUpdateDuration()
      });
    }
    this.originalAnimationState = null;
  }
  
  private flushChartActionBatch(): void {
    if (!this.chart || this.pendingChartActions.length === 0) {
      this.chartActionBatch = null;
      return;
    }
    
    const actionCount = this.pendingChartActions.length;
    
    // Process all batched actions
    this.pendingChartActions.forEach(action => {
      this.chart.dispatchAction(action);
    });
    
    // Clear batch
    this.pendingChartActions = [];
    this.chartActionBatch = null;
    
    // Restore animations after a short delay
    setTimeout(() => {
      this.restoreAnimations();
    }, 200);
  }
  
  
  
  // Check if an entity can be disabled (all entities can now be disabled)
  private canDisableEntity(entityName: string): boolean {
    // All entities can be disabled now
    return true;
  }
  
  // Provide visual feedback when an action is blocked (pulse effect)
  private pulseEntityVisually(entityName: string): void {
    // Visual pulse functionality removed for performance optimization
    // this.lastPulsedEntity = entityName;
    // this.ctx.detectChanges();
    
    // Clear the pulse after animation duration
    // setTimeout(() => {
    //   this.lastPulsedEntity = null;
    //   this.ctx.detectChanges();
    // }, 600);
    
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
    const alarmSupportEnabled = this.ctx.settings?.alarmSupportEnabled === true;
    const dialogRef = this.dialog.open(EchartsSettingsDialogComponent, {
      width: '500px',
      data: { 
        colorScheme: this.currentColorScheme,
        sidebarCollapsedMode: this.sidebarCollapsedMode,
        minMaxVisible: this.minMaxVisible,
        minMaxStyle: this.minMaxStyle || 'dashed',
        minMaxColor: this.minMaxColor || 'rgba(128, 128, 128, 0.5)',
        minColor: this.minColor || '#ff4757',
        maxColor: this.maxColor || '#5352ed',
        minMaxLineWidth: this.minMaxLineWidth || 2,
        alarmStatusVisible: this.alarmStatusVisible,
        alarmOpacity: this.alarmOpacity || 0.12,
        alarmShowCritical: this.alarmShowCritical !== false,
        alarmShowWarning: this.alarmShowWarning !== false,
        alarmShowInfo: this.alarmShowInfo !== false,
        alarmLinesVisible: this.alarmLinesVisible,
        alarmLineStyle: this.alarmLineStyle || 'dashed',
        alarmLineWidth: this.alarmLineWidth || 2,
        alarmMinColor: this.alarmMinColor || '#ff9500',
        alarmMaxColor: this.alarmMaxColor || '#ff3b30',
        showAlarmOverlayInDialog: alarmSupportEnabled && this.ctx.settings?.showAlarmOverlayInDialog !== false,
        showAlarmLinesInDialog: alarmSupportEnabled && this.ctx.settings?.showAlarmLinesInDialog !== false,
        showMinMaxInDialog: this.ctx.settings?.showMinMaxInDialog !== false
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.changeColorScheme(result.colorScheme);
        this.sidebarCollapsedMode = result.sidebarCollapsedMode || 'hidden';
        
        // Update min/max settings
        this.minMaxVisible = result.minMaxVisible;
        this.minMaxStyle = result.minMaxStyle;
        this.minMaxColor = result.minMaxColor;
        this.minColor = result.minColor;
        this.maxColor = result.maxColor;
        this.minMaxLineWidth = result.minMaxLineWidth;
        
        // Update alarm settings
        const wasAlarmVisible = this.alarmStatusVisible;
        this.alarmStatusVisible = result.alarmStatusVisible;
        this.alarmOpacity = result.alarmOpacity;
        this.alarmShowCritical = result.alarmShowCritical;
        this.alarmShowWarning = result.alarmShowWarning;
        this.alarmShowInfo = result.alarmShowInfo;
        
        // Update alarm lines settings
        const wasAlarmLinesVisible = this.alarmLinesVisible;
        this.alarmLinesVisible = result.alarmLinesVisible;
        this.alarmLineStyle = result.alarmLineStyle || 'dashed';
        this.alarmLineWidth = result.alarmLineWidth || 2;
        this.alarmMinColor = result.alarmMinColor || '#ff9500';
        this.alarmMaxColor = result.alarmMaxColor || '#ff3b30';
        
        // Handle alarm lines toggling
        if (this.alarmLinesVisible && !wasAlarmLinesVisible) {
          // Alarm lines just enabled - fetch alarms and start monitoring
          if (this.alarmDebugLogs) {
            console.log('[ALARM] Alarm lines enabled - fetching alarms and starting monitoring');
          }
          this.fetchAlarmsForDevices().catch(error => {
            if (this.alarmDebugLogs) {
              console.error('[ALARM] Failed to fetch alarms:', error);
            }
          });
          this.setupAlarmAttributeMonitoring();
        } else if (!this.alarmLinesVisible && wasAlarmLinesVisible) {
          // Alarm lines just disabled - stop monitoring
          if (this.alarmDebugLogs) {
            console.log('[ALARM] Alarm lines disabled - stopping monitoring');
          }
          if (this.alarmUpdateTimer) {
            clearInterval(this.alarmUpdateTimer);
            this.alarmUpdateTimer = null;
          }
        }
        
        // If alarm status was just enabled and we don't have alarm data, fetch it
        if (this.alarmStatusVisible && !wasAlarmVisible && !this.alarmData && !this.alarmFetchPromise) {
          this.alarmFetchPromise = this.fetchAlarmsForDevices();
        } else {
          // Re-render chart with new settings
          this.onDataUpdated();
        }
        
        // If sidebar is currently collapsed, trigger resize to apply new mode
        if (!this.isSidebarVisible) {
          setTimeout(() => {
            if (this.chart && !this.chart.isDisposed()) {
              this.chart.resize();
            }
          }, 300);
        }
      }
    });
  }
  
  public changeColorScheme(scheme: string): void {
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
  
  /**
   * Format tooltip label according to user settings
   */
  private formatTooltipLabel(seriesName: string, value?: number, unit?: string): string {
    // Get format preset and custom format
    const preset = this.ctx.settings?.tooltipLabelPreset || 'default';
    let format = this.ctx.settings?.tooltipLabelFormat || '{device} | {label}: {value}';
    
    // Use preset formats
    if (preset !== 'custom') {
      switch (preset) {
        case 'compact':
          format = '{label}: {value}';
          break;
        case 'detailed':
          format = '[{device}] {label}: {value} {unit}';
          break;
        default:
          format = '{device} | {label}: {value}';
      }
    }
    
    // Extract entity name and label from series name
    const parts = seriesName.split(' :: ');
    const entityName = parts.length > 1 ? parts[0] : '';
    const label = parts.length > 1 ? parts[1] : seriesName;
    
    // Get the proper display name for the device (same as sidebar)
    const deviceDisplayName = this.getEntityDisplayName(entityName);
    
    // Get the deviceName attribute (what shows in parentheses in sidebar)
    const attrs = this.getEntityAttributes(entityName);
    const deviceName = attrs.deviceName || '';
    
    // Get the entity ID from the datasource
    let deviceId = '';
    const entityData = this.ctx?.data?.find(d => d.datasource?.entityName === entityName);
    if (entityData?.datasource?.entityId) {
      const entityId = entityData.datasource.entityId;
      deviceId = typeof entityId === 'string' 
        ? entityId 
        : (entityId as any).id || '';
    }
    
    // Helper function to limit string length
    const limitString = (str: string, maxLength: number): string => {
      if (str.length <= maxLength) return str;
      return str.substring(0, maxLength) + '...';
    };
    
    // Process the format string
    let result = format;
    
    // Handle .limit() functions first
    result = result.replace(/\{device\.limit\((\d+)\)\}/g, (match, limit) => {
      return limitString(deviceDisplayName, parseInt(limit, 10));
    });
    
    result = result.replace(/\{deviceName\.limit\((\d+)\)\}/g, (match, limit) => {
      return limitString(deviceName, parseInt(limit, 10));
    });
    
    result = result.replace(/\{label\.limit\((\d+)\)\}/g, (match, limit) => {
      return limitString(label, parseInt(limit, 10));
    });
    
    result = result.replace(/\{deviceId\.limit\((\d+)\)\}/g, (match, limit) => {
      return limitString(deviceId, parseInt(limit, 10));
    });
    
    // Replace placeholders
    result = result.replace(/\{device\}/g, deviceDisplayName);
    result = result.replace(/\{deviceName\}/g, deviceName);
    result = result.replace(/\{deviceId\}/g, deviceId);
    result = result.replace(/\{label\}/g, label);
    
    if (value !== undefined) {
      const decimals = this.ctx.decimals ?? 2;
      result = result.replace(/\{value\}/g, isFinite(value) ? value.toFixed(decimals) : '');
    } else {
      result = result.replace(/\{value\}/g, '');
    }
    
    result = result.replace(/\{unit\}/g, unit || '');
    
    // Clean up empty brackets/spaces
    result = result.replace(/\[\s*\]/g, '');
    result = result.replace(/\s+/g, ' ').trim();
    
    return result;
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
  
  // Get both label and deviceName for tooltip display
  private getEntityAttributes(entityName: string): { label: string; deviceName: string } {
    // First check if we have cached attributes from the SERVER_SCOPE fetch
    if (this.entityAttributesCache.has(entityName)) {
      const cached = this.entityAttributesCache.get(entityName)!;
      return cached;
    }
    
    let label = entityName;   // default to entity name
    let deviceName = '';
    
    try {
      // Look through the data to find the entity
      for (const series of this.ctx.data) {
        if (series.datasource?.entityName === entityName) {
          const entity = series.datasource?.entity as any;
          
          if (entity) {
            // First check direct properties
            if (entity.label && entity.label.trim() !== '') {
              label = entity.label;
            }
            if (entity.deviceName && entity.deviceName.trim() !== '') {
              deviceName = entity.deviceName;
            }
            
            // Also check additionalInfo
            if (entity.additionalInfo) {
              if (!label || label === entityName) {
                if (entity.additionalInfo.label) {
                  label = entity.additionalInfo.label;
                }
              }
              if (!deviceName && entity.additionalInfo.deviceName) {
                deviceName = entity.additionalInfo.deviceName;
              }
            }
          }
          
          break; // Found the entity, stop searching
        }
      }
      
    } catch (error) {
    }
    
    return { label, deviceName };
  }
  
  // Get display name for entity based on configured attribute
  private getEntityDisplayName(entityName: string): string {
    // Check cache first
    if (this.entityDisplayNameCache.has(entityName)) {
      return this.entityDisplayNameCache.get(entityName)!;
    }
    
    // Get the configured attribute to display
    const displayAttribute = this.ctx.settings?.entityDisplayAttribute || 'label';
    const customAttribute = this.ctx.settings?.customEntityAttribute;
    
    // Determine which attribute to look for
    let attributeToFind = displayAttribute;
    if (displayAttribute === 'custom' && customAttribute) {
      attributeToFind = customAttribute;
    } else if (displayAttribute === 'name') {
      // Return entity name directly
      this.entityDisplayNameCache.set(entityName, entityName);
      return entityName;
    }
    
    try {
      // Find the entity data from context
      let entity: any = null;
      let entityData: any = null;
      
      // Check in ctx.data
      for (const series of this.ctx.data) {
        if (series.datasource?.entityName === entityName) {
          entityData = series;
          entity = series.datasource?.entity;
          break;
        }
      }
      
      // Method 1: Check the entity object itself
      if (entity) {
        const entityObj = entity as any;
        
        // Check for label attribute
        if (attributeToFind === 'label' && entityObj.label && entityObj.label.trim() !== '') {
          this.entityDisplayNameCache.set(entityName, entityObj.label);
          return entityObj.label;
        }
        
        // Check additionalInfo for any attribute
        if (entityObj.additionalInfo) {
          const value = entityObj.additionalInfo[attributeToFind];
          if (value) {
            this.entityDisplayNameCache.set(entityName, value);
            return value;
          }
        }
      }
      
      // Method 2: Check datasource attributes
      if (entityData?.datasource) {
        const ds = entityData.datasource as any;
        
        // Check various locations for the attribute
        const locations = [
          { path: ds[attributeToFind], name: 'direct' },
          { path: ds.attributes?.[attributeToFind], name: 'attributes' },
          { path: ds.serverAttributes?.[attributeToFind], name: 'serverAttributes' },
          { path: ds.resolvedAttributes?.[attributeToFind], name: 'resolvedAttributes' }
        ];
        
        for (const loc of locations) {
          if (loc.path) {
            const value = typeof loc.path === 'object' ? loc.path.value : loc.path;
            if (value) {
              this.entityDisplayNameCache.set(entityName, value);
              return value;
            }
          }
        }
      }
      
      // Method 3: Check datasources array
      if (this.ctx.datasources) {
        for (const ds of this.ctx.datasources) {
          if (ds.entityName === entityName) {
            const dsAny = ds as any;
            
            // Check for the attribute in various locations
            const value = dsAny.attributes?.[attributeToFind]?.value || 
                         dsAny.latestValues?.[attributeToFind] ||
                         dsAny[attributeToFind];
                         
            if (value) {
              this.entityDisplayNameCache.set(entityName, value);
              return value;
            }
          }
        }
      }
      
    } catch (error) {
    }
    
    
    // Cache the fallback value for now
    this.entityDisplayNameCache.set(entityName, entityName);
    
    // Try to fetch the attribute asynchronously for next time
    this.fetchEntityAttribute(entityName, attributeToFind);
    
    return entityName;
  }
  
  // Fetch entity attribute from ThingsBoard server
  private async fetchEntityAttribute(entityName: string, attributeName: string): Promise<void> {
    try {
      const entityData = this.ctx?.data?.find(d => d.datasource?.entityName === entityName);
      if (!entityData) return;
      
      const entityId = entityData.datasource?.entityId;
      const entityType = entityData.datasource?.entityType;
      
      if (!entityId || !entityType) {
        return;
      }
      
      // Check if ThingsBoard API is available
      if (!this.ctx.http || !this.ctx.attributeService) {
        
        // Try alternative: use the widget's subscription to fetch attributes
        if (this.ctx.subscriptionApi) {
          
          // Create attribute keys to fetch
          const attributeKeys = ['deviceName', 'label', 'description'];
          
          // Try to subscribe to attributes
          const subscription = {
            type: 'attribute',
            entityType: entityType,
            entityId: entityId,
            keys: attributeKeys,
            scopeType: 'SERVER_SCOPE' as any
          };
          
          
          // Note: The actual subscription would need to be done through the widget's data subscription
          // This is a placeholder showing the structure
        }
        return;
      }
      
      
      // Fetch SERVER_SCOPE attributes
      // Note: The API might expect an entity object, not just the type
      const entityObj = { entityType, id: entityId };
      const attributes = await firstValueFrom(this.ctx.attributeService.getEntityAttributes(
        entityObj as any,
        'SERVER_SCOPE' as any,
        [attributeName, 'label', 'deviceName']  // Try to fetch the requested attribute plus fallbacks
      ));
      
      
      // Find the requested attribute
      let displayName = entityName;
      let fetchedLabel = '';
      let fetchedDeviceName = '';
      
      if (attributes && Array.isArray(attributes)) {
        // Get all the attributes we fetched
        const labelAttr = attributes.find(attr => attr.key === 'label');
        const deviceNameAttr = attributes.find(attr => attr.key === 'deviceName');
        
        // Store what we found
        if (labelAttr?.value) {
          fetchedLabel = labelAttr.value;
        }
        if (deviceNameAttr?.value) {
          fetchedDeviceName = deviceNameAttr.value;
        }
        
        // Cache both attributes
        this.entityAttributesCache.set(entityName, {
          label: fetchedLabel || entityName,
          deviceName: fetchedDeviceName
        });
        
        // Set display name based on what was requested
        const requestedAttr = attributes.find(attr => attr.key === attributeName);
        if (requestedAttr?.value) {
          displayName = requestedAttr.value;
        } else if (fetchedLabel) {
          displayName = fetchedLabel;
        } else if (fetchedDeviceName) {
          displayName = fetchedDeviceName;
        }
      }
      
      // Cache the display name result
      this.entityDisplayNameCache.set(entityName, displayName);
      
      // Update the entity list if the display name changed
      if (displayName !== entityName) {
        this.refreshEntityList();
      }
      
    } catch (error) {
    }
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
    
    // Build entity list with display names and data point counts
    this.entityList = Object.keys(entityGroups).map(entityName => {
      const group = entityGroups[entityName];
      // Entity is visible if any of its series are visible
      const visible = group.seriesKeys.some(seriesKey => selected[seriesKey] !== false);
      
      // Get both label and deviceName for tooltip
      const attrs = this.getEntityAttributes(entityName);
      
      return {
        name: entityName,                                    // Original entity name (for functionality)
        displayName: this.getEntityDisplayName(entityName), // Display name (deviceName or fallback)
        label: attrs.label,                                 // Label attribute for tooltip
        deviceName: attrs.deviceName,                       // DeviceName attribute for tooltip
        color: group.color,
        count: group.seriesKeys.length,
        dataPoints: group.dataPoints,
        visible: visible
      };
    }).sort((a, b) => a.displayName.localeCompare(b.displayName)); // Sort by display name

    // Check if we should show the no data overlay
    const visibleEntities = this.entityList.filter(e => e.visible);
    const visibleEntitiesWithData = visibleEntities.filter(e => e.dataPoints > 0);

    // Show no data overlay if:
    // 1. No devices are selected (visible)
    // 2. Only devices with 0 data points are selected
    if (visibleEntities.length === 0 || visibleEntitiesWithData.length === 0) {
      if (!this.hasNoVisibleData) {
        this.hasNoVisibleData = true;
      }
    } else {
      // Only clear the flag if we actually have visible entities with data
      // Don't clear it here if it was set by other conditions (like initial load)
      if (this.hasNoVisibleData && visibleEntitiesWithData.length > 0) {
        // Double check with the chart's actual data
        const hasActualData = this.checkIfSelectedKeysHaveVisibleData(
          visibleEntities.flatMap(e => entityGroups[e.name]?.seriesKeys || [])
        );
        if (hasActualData) {
          this.hasNoVisibleData = false;
        }
      }
    }

    // Calculate dynamic sidebar width based on longest name
    this.calculateDynamicSidebarWidth();

    this.ctx.detectChanges();
  }
  
  // Calculate sidebar width based on longest entity name
  private calculateDynamicSidebarWidth(): void {
    const oldWidth = this.sidebarWidth;
    
    if (!this.entityList || this.entityList.length === 0) {
      this.sidebarWidth = 240; // Default width
      return;
    }
    
    // Find the longest display name
    let maxNameLength = 0;
    for (const entity of this.entityList) {
      if (entity.displayName.length > maxNameLength) {
        maxNameLength = entity.displayName.length;
      }
    }
    
    // Calculate width based on character count
    // Approximate: 8px per character + padding + color box + count
    const charWidth = 8;
    const paddingAndExtras = 120; // Color box (32px) + count (60px) + padding (28px)
    const calculatedWidth = (maxNameLength * charWidth) + paddingAndExtras;
    
    // Get the container width
    const containerWidth = this.ctx.width || window.innerWidth;
    const maxAllowedWidth = containerWidth * 0.5; // Maximum 50% of container width
    
    // Set width with constraints
    const minWidth = 180; // Minimum width
    this.sidebarWidth = Math.min(Math.max(calculatedWidth, minWidth), maxAllowedWidth);
    
    // If width changed and sidebar is visible, update grid margins
    if (oldWidth !== this.sidebarWidth && this.isSidebarVisible) {
      const margins = this.getPlotMargins();
      this.syncLegendToGridMargins(margins.left, margins.right);
      
      // Force grid reset to apply new margins
      this.resetGrid = true;
    }
  }
  
  // Toggle visibility for all series of an entity
  public toggleEntityVisibility(entityName: string): void {
    if (!this.ctx?.data || !this.chart) return;
    
    
    // All entities can now be disabled - no restrictions
    
    // Immediate UI feedback - update entity list optimistically
    this.batchUIUpdate('entity-list', () => {
      this.updateEntityListOptimistically(entityName);
    });
    
    // Perform the toggle with debouncing
    this.debouncedUIUpdate('entity-toggle', () => {
      this.performEntityToggle(entityName);
    });
  }
  
  private updateEntityListOptimistically(entityName: string): void {
    // Quick visual feedback - find and toggle the entity immediately
    const entityIndex = this.entityList.findIndex(e => e.name === entityName);
    if (entityIndex >= 0) {
      this.entityList[entityIndex].visible = !this.entityList[entityIndex].visible;
      this.ctx.detectChanges();
    }
  }
  
  private performEntityToggle(entityName: string): void {
    // Find all series keys for this entity, but respect plot states
    const seriesKeys: string[] = [];
    const seriesToToggle: string[] = [];

    for (const data of this.ctx.data) {
      const currentEntityName = data.datasource?.entityName || 'Unknown';
      if (currentEntityName === entityName) {
        const label = data.dataKey.label;
        const seriesKey = this.buildSeriesKey(entityName, label);
        seriesKeys.push(seriesKey);

        // Only include series for toggling if their plot (label) is not manually hidden
        const plotVisible = this.plotLabelStates.get(label) !== false;
        if (plotVisible) {
          seriesToToggle.push(seriesKey);
        }
      }
    }

    if (seriesToToggle.length === 0) {
      // If all plots for this entity are manually hidden, just update UI
      this.refreshEntityList();
      return;
    }

    // Get current visibility state from controller legend (cached to avoid multiple calls)
    const opt: any = this.chart.getOption();
    const selected = opt?.legend?.[0]?.selected || {};

    // Check if any series (that should be toggleable) is visible
    const anyVisible = seriesToToggle.some(key => selected[key] !== false);

    // Toggle only series that respect plot states
    const action = anyVisible ? 'legendUnSelect' : 'legendSelect';

    seriesToToggle.forEach(key => {
      this.batchedDispatchAction({
        type: action,
        name: key,
        legendIndex: 0  // Target controller legend
      });
    });
    
    // Optimized post-toggle processing
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();
      
      // Get updated legend state after timeout
      const finalOption: any = this.chart.getOption();
      const finalSelected = (finalOption?.legend?.[0]?.selected) || {};
      
      const activeSeriesKeys = Object.keys(finalSelected).filter(k => finalSelected[k] !== false);
      
      // Conditional debug processing based on performance settings
      if (this.shouldOptimizeClicks()) {
        // Lightweight debug info when performance mode is enabled
      } else {
        // Full debug info only when performance optimization is disabled
        const debugInfo = this.createDetailedVisibilityDebugInfo(finalSelected);
        
        // First, check and report any completely hidden plots
        const hiddenPlots: string[] = [];
        Object.keys(debugInfo.plots).forEach(plotKey => {
          const plot = debugInfo.plots[plotKey];
          if (plot.allHiddenOrNoData) {
            hiddenPlots.push(`Plot ${plot.plotNumber} (${plot.plotName})`);
          }
        });
        
        if (hiddenPlots.length > 0) {
          hiddenPlots.forEach(plotName => {
          });
        }
        
        // Log each plot with its series
        Object.keys(debugInfo.plots).forEach(plotKey => {
          const plot = debugInfo.plots[plotKey];
          const status = plot.allHiddenOrNoData ? '[NO DATA]' : '[HAS DATA]';
          plot.series.forEach((s: any) => {
            const dataInfo = s.dataPoints === 0 ? ' [NO DATA]' : ` [${s.dataPoints} pts]`;
          });
        });
        
      }
      
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
      
      
      // Pass only series that have actual data
      this.setDataGridByNames(activeSeriesWithData);
      
      // If grid count changed, rebuild the chart
      if (previousGridCount !== this.currentGrids) {
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
    
    const container = this.chartContainer.nativeElement;
    // Set up GPU acceleration hints
    container.style.willChange = 'transform';
    container.style.transform = 'translateZ(0)';
    
    const containerElement = container.querySelector('#echartContainer') as HTMLElement;
    
    if (!containerElement) {
      return;
    }
    
    // Fetch alarms for devices if alarm lines are enabled
    if (this.alarmLinesVisible) {
      if (this.alarmDebugLogs) {
        console.log('[ALARM] Fetching alarms on chart initialization');
      }
      this.fetchAlarmsForDevices().catch(error => {
        if (this.alarmDebugLogs) {
          console.error('[ALARM] Failed to fetch alarms on init:', error);
        }
      });
      
      // Set up automatic alarm updates
      this.setupAlarmAttributeMonitoring();
    }
    
    // Set height for chart container to account for button bar
    if (this.ctx.height) {
      containerElement.style.width = '100%';
      
      // Apply correct scroll height based on current active grids
      this.applyScrollableHeight();
    }
    
    // Initialize chart with configurable performance settings
    const useCanvasRenderer = this.ctx.settings?.useCanvasRenderer !== false; // Default to canvas for better performance
    
    const initStart = performance.now();
    this.chart = echarts.init(containerElement, undefined, {
      renderer: useCanvasRenderer ? 'canvas' : 'svg',
      useDirtyRect: true  // Dirty rect rendering for selective updates
    });
    const initDuration = performance.now() - initStart;
    
    // Ensure ECharts recalculates layout with the container padding
    setTimeout(() => {
      if (this.chart && !this.chart.isDisposed()) {
        this.chart.resize();
      }
    }, 0);
    
    // Renderer performance recommendation
    if (!useCanvasRenderer && this.totalDataPoints > 1000) {
    }
    
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
    } else {
    }
    
    // Always update to show chart (empty or with data)
    this.onDataUpdated();
  }

  private initChartAndGrid(): void {
    
    const option = this.getInitConfig();
    
    option.xAxis = this.currentXAxisArray();
    
    option.yAxis = this.currentYAxisArray();
    
    option.grid = this.currentGridArray();
    
    // Plot numbers are now displayed as yAxis names instead of graphic elements
    
    this.chart.setOption(option);
    
    // Legend debouncing for stability
    let legendDebounceTimer: any = null;
    
    // Register legend selection event listener with debouncing
    this.chart.on('legendselectchanged', (event: any) => {
      const eventStart = performance.now();
      
      // Clear any pending legend update
      if (legendDebounceTimer) {
        clearTimeout(legendDebounceTimer);
      }
      
      // Debounce legend updates to prevent flashing
      legendDebounceTimer = setTimeout(() => {
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
          const eventDuration = performance.now() - eventStart;
          return;
        }
        
        this.onLegendSelectChanged(event);
        // Sync custom legend toolbar when legend changes
        this.syncCustomLegendFromChart();
        
        const eventDuration = performance.now() - eventStart;
        if (eventDuration > 50) {
        }
      }, 50); // 50ms debounce for stable legend toggling
    });
    
    // Keep zoom sliders in sync when user uses mousewheel/drag - native smooth zoom
    this.chart.on('dataZoom', () => {
      const now = performance.now();
      const zoomStart = now;
      
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
          
          const zoomDuration = performance.now() - zoomStart;
          if (zoomDuration > 30) {
          }
        }
      }
    });
    
    // Add critical mouse/hover performance monitoring for tooltip lag detection
    this.setupMouseInteractionLogging();
    
    // Initial refresh of entity list and sync custom legend
    setTimeout(() => {
      this.refreshEntityList();
      this.syncCustomLegendFromChart();

      // Force pagination calculation after legend is populated
      setTimeout(() => {
        this.performPaginationCalculation();
        this.ctx.detectChanges();
      }, 200);
    }, 100);
    
  }

  private onLegendSelectChanged = (event: any): void => {
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
    
    // Method 1: Subscribe to dashboard state controller changes
    if (this.ctx.stateController) {
      
      try {
        // Subscribe to state change events using the correct method
        this.stateChangeSubscription = this.ctx.stateController.stateChanged().subscribe(() => {
          this.handleStateChange();
        });
      } catch (error) {
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
            lastStateId = newStateId;
            this.handleStateChange();
          }
        }, 1000); // Check every second
        
        // Store interval ID for cleanup
        (this as any).stateCheckInterval = stateCheckInterval;
      } catch (error) {
      }
    }
    
    // Method 3: Subscribe to widget lifecycle events if $scope.$on is available
    if (this.ctx.$scope && this.ctx.$scope.$on) {
      
      try {
        // Only set up listeners if $on is actually a function
        if (typeof this.ctx.$scope.$on === 'function') {
          // Watch for data source changes
          this.ctx.$scope.$on('widgetConfigUpdated', () => {
            this.handleStateChange();
          });
          
          // Listen for dashboard state updates
          this.ctx.$scope.$on('dashboardPageChanged', () => {
            setTimeout(() => this.handleStateChange(), 300);
          });
          
          // Listen for mobile/desktop view changes
          this.ctx.$scope.$on('mobileModeChanged', () => {
            setTimeout(() => this.handleStateChange(), 300);
          });
        }
      } catch (error) {
      }
    }
  }
  
  private handleStateChange(): void {
    
    // Only refresh if chart is initialized
    if (!this.chart) {
      return;
    }
    
    // Use setTimeout to ensure DOM is ready after state change
    setTimeout(() => {
      
      // Force resize to recalculate dimensions
      if (this.chart) {
        this.chart.resize();
      }
      
      // Update data if available
      if (this.ctx.data && this.ctx.data.length > 0) {
        this.onDataUpdated();
      } else {
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
    
    // Track previous width to detect maximize/restore
    let previousWidth = 0;
    let lastWindowWidth = window.innerWidth;
    let wasMaximized = this.isWindowMaximized();
    
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          
          // Always force immediate legend recalculation on ANY resize
          // This is aggressive but ensures we never have clipping
          
          // Clear ALL caches immediately
          this.maxItemsWithoutPagination = 0;
          
          // Force immediate recalculation - no delay
          this.performPaginationCalculation();
          
          // Detect significant width changes that indicate maximize/restore
          const widthChange = Math.abs(width - previousWidth);
          const isSignificantChange = widthChange > 100; // Lower threshold
          
          if (isSignificantChange && previousWidth > 0) {
            
            // Additional recalculations for significant changes
            setTimeout(() => {
              this.performPaginationCalculation();
            }, 100);
            
            setTimeout(() => {
              this.performPaginationCalculation();
            }, 300);
            
            setTimeout(() => {
              this.performPaginationCalculation();
            }, 500);
          }
          
          previousWidth = width;
          
          this.onResize();
        }
      }
    });
    this.resizeObserver.observe(this.chartContainer.nativeElement);
    
    // Window resize listener with more aggressive handling
    const windowResizeHandler = () => {
      const currentWindowWidth = window.innerWidth;
      const windowWidthChange = Math.abs(currentWindowWidth - lastWindowWidth);
      
      // Check if maximize state changed
      const isNowMaximized = this.isWindowMaximized();
      const maximizeStateChanged = isNowMaximized !== wasMaximized;
      
      if (maximizeStateChanged) {
      }
      
      
      // Always reset and recalculate on window resize or maximize state change
      if (maximizeStateChanged || windowWidthChange > 0) {
        this.maxItemsWithoutPagination = 0;
      }
      
      // Immediate recalculation
      this.performPaginationCalculation();
      
      // Multiple delayed recalculations to catch any layout settling
      const delays = [50, 150, 300, 500];
      
      // Add extra recalculation for maximize state changes
      if (maximizeStateChanged) {
        // Add an immediate extra calculation for maximize/restore
        setTimeout(() => {
          this.performPaginationCalculation();
        }, 25);
        
        // Add a very late recalculation for maximize state changes
        delays.push(800, 1000);
      }
      
      delays.forEach(delay => {
        setTimeout(() => {
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
      return of('sensor[unknown]');
    }
    
    // Get the first datasource entity
    const datasource = this.ctx.datasources[0];
    if (!datasource || !datasource.entity) {
      return of('sensor[unknown]');
    }
    
    const entity = {
      entityType: datasource.entityType,
      id: datasource.entityId
    };
    
    
    // Check if attributeService is available
    if (!this.ctx.attributeService) {
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
          
          
          // Format as "label[deviceName]" and sanitize for filename
          const combined = `${label}[${deviceName}]`;
          return combined.replace(/[^a-zA-Z0-9-_[\]]/g, '_'); // Sanitize but keep brackets
        }),
        catchError(error => {
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
    });
  }

  private exportDataToCsv(): void {
    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Chart Widget] No data available for CSV export');
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
    
  }

  public async exportData(format: 'csv' | 'xls' | 'xlsx'): Promise<void> {
    
    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Chart Widget] No data available for export');
      return;
    }
    
    console.log(`[DEBUG EXPORT] Starting export - Format: ${format}`);
    console.log(`[DEBUG EXPORT] Setting isExporting = true`);
    this.isExporting = true;
    const isMultipleDevices = this.ctx.settings?.multipleDevices;
    console.log(`[DEBUG EXPORT] Multiple devices mode: ${isMultipleDevices}`);
    
    try {
      // Check if multiple devices mode is enabled
      if (isMultipleDevices) {
        console.log(`[DEBUG EXPORT] Calling exportMultipleDevices`);
        await this.exportMultipleDevices(format);
        console.log(`[DEBUG EXPORT] exportMultipleDevices completed, isExporting = ${this.isExporting}`);
        // Loading state is cleared inside exportMultipleDevices when download starts
      } else {
        console.log(`[DEBUG EXPORT] Calling exportSingleFile`);
        this.exportSingleFile(format);
        console.log(`[DEBUG EXPORT] exportSingleFile completed, isExporting = ${this.isExporting}`);
      }
    } catch (error) {
      console.error('[Chart Widget] Export failed:', error);
      console.log(`[DEBUG EXPORT] Error occurred, isExporting = ${this.isExporting}`);
    } finally {
      console.log(`[DEBUG EXPORT] In finally block - isMultipleDevices: ${isMultipleDevices}, isExporting: ${this.isExporting}`);
      // Only clear loading state for single device exports or errors
      // Multiple device exports clear it manually when download starts
      if (!isMultipleDevices || this.isExporting) {
        console.log(`[DEBUG EXPORT] Setting isExporting = false in finally block`);
        this.isExporting = false;
      } else {
        console.log(`[DEBUG EXPORT] NOT setting isExporting = false in finally block (should have been cleared already)`);
      }
      console.log(`[DEBUG EXPORT] Final isExporting state: ${this.isExporting}`);
    }
  }

  private exportSingleFile(format: 'csv' | 'xls' | 'xlsx'): void {
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
    
  }

  private async exportMultipleDevices(format: 'csv' | 'xls' | 'xlsx'): Promise<void> {
    console.log(`[DEBUG MULTIPLE] exportMultipleDevices started, isExporting = ${this.isExporting}`);
    
    // Group data by device (entity name)
    const deviceDataMap = new Map<string, any[]>();
    
    this.ctx.data.forEach((series) => {
      const entityName = series.datasource?.entityName || 'Unknown Device';
      if (!deviceDataMap.has(entityName)) {
        deviceDataMap.set(entityName, []);
      }
      deviceDataMap.get(entityName)!.push(series);
    });

    console.log(`[DEBUG MULTIPLE] Found ${deviceDataMap.size} devices`);

    if (deviceDataMap.size === 0) {
      console.warn('[Chart Widget] No device data available for export');
      return;
    }

    // Create ZIP archive
    console.log(`[DEBUG MULTIPLE] Creating ZIP archive`);
    const zip = new JSZip();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    // Process each device - filter out devices with no data points
    let exportedDeviceCount = 0;
    for (const [entityName, deviceSeries] of deviceDataMap.entries()) {
      // Check if this device has any data points
      const totalDataPoints = deviceSeries.reduce((sum, series) => 
        sum + (series.data?.length || 0), 0);
      
      if (totalDataPoints === 0) {
        console.log(`[Chart Widget] Skipping device "${entityName}" - no data points`);
        continue;
      }
      
      console.log(`[DEBUG MULTIPLE] Processing device "${entityName}" with ${totalDataPoints} data points`);
      const { blob, filename } = await this.createDeviceFile(entityName, deviceSeries, format);
      zip.file(filename, blob);
      exportedDeviceCount++;
    }

    console.log(`[DEBUG MULTIPLE] Processed ${exportedDeviceCount} devices with data`);

    if (exportedDeviceCount === 0) {
      console.log(`[DEBUG MULTIPLE] No devices with data points - throwing error, isExporting = ${this.isExporting}`);
      throw new Error('No devices with data points found for export. All devices have been skipped.');
    }

    // Generate ZIP and download
    console.log(`[DEBUG MULTIPLE] Generating ZIP blob, isExporting = ${this.isExporting}`);
    const zipBlob = await zip.generateAsync({ type: 'blob' });
    console.log(`[DEBUG MULTIPLE] ZIP blob generated, isExporting = ${this.isExporting}`);
    
    const zipFilename = `multiple-devices-export_${timestamp}.zip`;
    
    const link = document.createElement('a');
    if (link.download !== undefined) {
      console.log(`[DEBUG MULTIPLE] Creating download link, isExporting = ${this.isExporting}`);
      const url = URL.createObjectURL(zipBlob);
      link.setAttribute('href', url);
      link.setAttribute('download', zipFilename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      
      console.log(`[DEBUG MULTIPLE] About to click download link, isExporting = ${this.isExporting}`);
      link.click();
      document.body.removeChild(link);
      
      // Clear loading state immediately after download starts and trigger change detection
      console.log(`[DEBUG MULTIPLE] Setting isExporting = false after download click`);
      this.isExporting = false;
      console.log(`[DEBUG MULTIPLE] Loading state cleared, isExporting = ${this.isExporting}`);
      
      // Trigger change detection immediately to update UI
      if (this.ctx && this.ctx.detectChanges) {
        console.log(`[DEBUG MULTIPLE] Triggering change detection`);
        this.ctx.detectChanges();
      }
      
      // Cleanup URL after a brief delay to ensure download started
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } else {
      console.log(`[DEBUG MULTIPLE] Download not supported, isExporting = ${this.isExporting}`);
    }
    
    console.log(`[DEBUG MULTIPLE] exportMultipleDevices completed, isExporting = ${this.isExporting}`);
  }

  private async createDeviceFile(entityName: string, deviceSeries: any[], format: 'csv' | 'xls' | 'xlsx'): Promise<{ blob: Blob; filename: string }> {
    // Get device display name and attributes for filename using same logic as main export
    const attrs = this.getEntityAttributes(entityName);
    const label = attrs.label || this.getEntityDisplayName(entityName);
    const deviceName = attrs.deviceName || 'unknown';
    
    // Build dynamic headers based on device's data keys
    const headers = ['Timestamp'];
    const dataKeyOrder: string[] = [];
    
    deviceSeries.forEach((series) => {
      const seriesName = series.dataKey.label || series.dataKey.name;
      if (!dataKeyOrder.includes(seriesName)) {
        dataKeyOrder.push(seriesName);
        headers.push(seriesName);
      }
    });
    
    // Group points by timestamp for this device
    const timestampMap = new Map<number, Record<string, number>>();
    
    deviceSeries.forEach((series) => {
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
    
    // Calculate metadata
    const seriesCount = dataKeyOrder.length;
    const totalDataPoints = deviceSeries.reduce((sum, series) => 
      sum + (series.data?.length || 0), 0);
    
    // Create data rows
    const dataRows: any[] = [];
    sortedTimestamps.forEach((timestamp) => {
      const dataPoint = timestampMap.get(timestamp)!;
      const row: any[] = [this.formatLocalTimestamp(timestamp)];
      
      dataKeyOrder.forEach((key) => {
        const value = dataPoint[key];
        const series = deviceSeries.find(s => 
          (s.dataKey.label || s.dataKey.name) === key
        );
        const decimals = this.ctx.settings?.exportDecimals ?? series?.dataKey?.decimals ?? this.ctx.decimals ?? 6;
        row.push(this.formatNum(value, decimals));
      });
      
      dataRows.push(row);
    });

    // Generate filename with proper format - same as main export
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const ms = String(now.getMilliseconds()).padStart(3, '0');
    
    // Format: label[deviceName]_YYYY-MM-DD_HH-mm-ss-SSS.ext
    const timestamp = `${year}-${month}-${day}_${hours}-${minutes}-${seconds}-${ms}`;
    const sanitizedLabel = label.replace(/[^a-zA-Z0-9-_[\]]/g, '_');
    const sanitizedDeviceName = deviceName.replace(/[^a-zA-Z0-9-_[\]]/g, '_');
    const filename = `${sanitizedLabel}[${sanitizedDeviceName}]_${timestamp}.${format}`;

    let blob: Blob;

    if (format === 'csv') {
      // Generate CSV content with metadata headers
      let csvContent = '';
      
      // Add metadata rows
      csvContent += `Label: ${label}\n`;
      csvContent += `Device ID: ${deviceName}\n`;
      csvContent += `Series Count: ${seriesCount}\n`;
      csvContent += `Data Points: ${totalDataPoints}\n`;
      csvContent += '\n'; // Empty line separator
      
      // Add data headers and rows
      csvContent += headers.join(';') + '\n';
      dataRows.forEach(row => {
        csvContent += row.join(';') + '\n';
      });
      blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    } else if (format === 'xls') {
      // Generate XLS (HTML) content
      // Remove invalid Excel sheet name characters: : \ / ? * [ ]
      const sanitizedLabel = label.replace(/[:\\\/\?\*\[\]]/g, '_');
      const sheetName = sanitizedLabel.length > 31 ? sanitizedLabel.substring(0, 31) : sanitizedLabel;
      
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
      
      // Add metadata rows
      htmlContent += `<tr><td colspan="${headers.length}"><b>Label:</b> ${label}</td></tr>`;
      htmlContent += `<tr><td colspan="${headers.length}"><b>Device ID:</b> ${deviceName}</td></tr>`;
      htmlContent += `<tr><td colspan="${headers.length}"><b>Series Count:</b> ${seriesCount}</td></tr>`;
      htmlContent += `<tr><td colspan="${headers.length}"><b>Data Points:</b> ${totalDataPoints}</td></tr>`;
      htmlContent += '<tr><td colspan="' + headers.length + '">&nbsp;</td></tr>'; // Empty row
      
      // Add data headers
      htmlContent += '<tr>';
      headers.forEach(header => {
        htmlContent += `<td><b>${header}</b></td>`;
      });
      htmlContent += '</tr>';
      
      // Add data rows
      dataRows.forEach(row => {
        htmlContent += '<tr>';
        row.forEach((cell: any) => {
          htmlContent += `<td>${cell}</td>`;
        });
        htmlContent += '</tr>';
      });
      
      htmlContent += '</table></body></html>';
      blob = new Blob([htmlContent], { type: 'application/vnd.ms-excel' });

    } else { // xlsx
      // Generate XLSX content
      const xlsxDataRows: any[] = [];
      sortedTimestamps.forEach((timestamp) => {
        const dataPoint = timestampMap.get(timestamp)!;
        const row: any[] = [this.formatLocalTimestamp(timestamp)];
        
        dataKeyOrder.forEach((key) => {
          const value = dataPoint[key];
          const series = deviceSeries.find(s => 
            (s.dataKey.label || s.dataKey.name) === key
          );
          const decimals = this.ctx.settings?.exportDecimals ?? series?.dataKey?.decimals ?? this.ctx.decimals ?? 6;
          
          const numValue = Number(value);
          if (isFinite(numValue)) {
            const roundedValue = parseFloat(numValue.toFixed(decimals));
            row.push(roundedValue);
          } else {
            row.push('');
          }
        });
        
        xlsxDataRows.push(row);
      });
      
      // Create XLSX data with metadata headers
      const metadataRows = [
        [`Label: ${label}`],
        [`Device ID: ${deviceName}`],
        [`Series Count: ${seriesCount}`],
        [`Data Points: ${totalDataPoints}`],
        [], // Empty row
      ];
      
      const worksheet_data = [...metadataRows, headers, ...xlsxDataRows];
      const worksheet = XLSX.utils.aoa_to_sheet(worksheet_data);
      
      // Apply styling to metadata rows (bold)
      for (let row = 0; row < metadataRows.length - 1; row++) { // -1 to skip empty row
        const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true, color: { rgb: "000000" } }
          };
        }
      }
      
      // Apply header styling (headers are now at row 5 after metadata)
      const headerRowIndex = metadataRows.length;
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
        if (worksheet[cellRef]) {
          worksheet[cellRef].s = {
            font: { bold: true, color: { rgb: "000000" } },
            fill: { fgColor: { rgb: "E0E0E0" } },
            alignment: { horizontal: "center", vertical: "center" }
          };
        }
      }
      
      // Apply number formatting to data cells (now starting after metadata + headers)
      for (let row = headerRowIndex + 1; row <= headerRowIndex + xlsxDataRows.length; row++) {
        for (let col = 1; col < headers.length; col++) {
          const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
          if (worksheet[cellRef] && typeof worksheet[cellRef].v === 'number') {
            worksheet[cellRef].t = 'n';
          }
        }
      }
      
      // Set column widths
      const columnWidths = headers.map((header, index) => {
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
        return { wch: Math.min(Math.max(maxWidth + 2, 10), 50) };
      });
      worksheet['!cols'] = columnWidths;
      
      // Add autofilter
      worksheet['!autofilter'] = { ref: worksheet['!ref'] || 'A1:A1' };
      
      // Create workbook with sanitized and truncated sheet name (Excel limits: no invalid chars, 31 chars max)
      const workbook = XLSX.utils.book_new();
      const sanitizedLabel = label.replace(/[:\\\/\?\*\[\]]/g, '_');
      const truncatedSheetName = sanitizedLabel.length > 31 ? sanitizedLabel.substring(0, 31) : sanitizedLabel;
      XLSX.utils.book_append_sheet(workbook, worksheet, truncatedSheetName);
      
      // Set workbook properties
      workbook.Props = {
        Title: label,
        Subject: 'ThingsBoard Chart Data Export',
        Author: 'ThingsBoard',
        Manager: 'ThingsBoard Platform',
        Company: 'ThingsBoard',
        Category: 'IoT Data',
        Keywords: 'ThingsBoard, IoT, Time Series',
        Comments: `Exported from ${label} device`,
        CreatedDate: new Date(),
        ModifiedDate: new Date(),
        Application: 'ThingsBoard Platform',
        AppVersion: '3.0'
      };
      
      const excelBuffer = XLSX.write(workbook, { 
        bookType: 'xlsx', 
        type: 'array',
        bookSST: true,
        compression: true,
        Props: workbook.Props,
        cellDates: false,
        cellStyles: true
      });
      
      blob = new Blob([excelBuffer], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
    }

    return { blob, filename };
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
        this.downloadChartImage();
        break;
      case 'reset':
        this.resetChartCompletely();
        break;
      case 'exportCsv':
        this.exportDataToCsv();
        break;
    }
  }

  private isContainerHeight(): any {
    
    if ((this.ctx.height >= this.containerHeightLimit[0]) && 
        (this.ctx.height < this.containerHeightLimit[1])) {
      this.currentSize = SIZE_NAMES.LARGE;
      return this.ifLargeContainerConfig();
    } else if (this.ctx.height >= this.containerHeightLimit[1]) {
      this.currentSize = SIZE_NAMES.HUGE;
      return this.ifHugeContainerConfig();
    }
    this.currentSize = SIZE_NAMES.SMALL;
    return this.ifSmallContainerConfig();
  }

  private currentGridArray(): any[] {
    let gridArray = [];
    
    // Use unified margins for consistency
    const margins = this.getPlotMargins();
    
    // Sync legend overlay to use same margins as grids
    this.syncLegendToGridMargins(margins.left, margins.right);
    
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
          left: margins.left,
          right: margins.right,
          height: `${gridHeight}%`
        });
      }
      
      gridArray = grids;
    }
    
    return gridArray;
  }
  
  private calculateScrollableGrids(numGrids: number): any[] {
    const grids = [];
    // Use unified margins for consistency
    const margins = this.getPlotMargins();
    
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
        left: margins.left,
        right: margins.right,
        height: `${gridHeight}%`
      };
      
      grids.push(grid);
    }
    
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
    
    // Get the axis position map to determine fixed plot numbers
    const axisMap = this.getAxisPositionMap();
    const visibleGridNames = this.currentGridNames;
    const plotNumber1 = visibleGridNames[0] ? axisMap[visibleGridNames[0]] + 1 : 1;
    
    // Get the actual series label and unit for this grid
    const plotName1 = visibleGridNames[0] ? this.getFirstLabelForGrid(visibleGridNames[0]) : 'Top';
    const unit1 = tempUnits[0] ? `[${tempUnits[0]}]` : '';
    
    
    // Create label based on configured number of lines
    const numLines = this.ctx.settings?.yAxisLabelLines || 3;
    let multiLineLabel1: string;
    
    if (numLines === 1) {
      // 1 line: "Temperature [°C] - 1"
      multiLineLabel1 = `{singleLine|${plotName1} ${unit1} - ${plotNumber1}}`;
    } else if (numLines === 2) {
      // 2 lines: "Temperature" / "[°C] - 1"
      multiLineLabel1 = `{topLine|${plotName1}}\n{bottomLine|${unit1} - ${plotNumber1}}`;
    } else {
      // 3 lines: "1" / "Temperature" / "[°C]"
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
      const unit = tempUnits[i] ? `[${tempUnits[i]}]` : '';
      
      
      // Create label based on configured number of lines
      let multiLineLabel: string;
      
      if (numLines === 1) {
        // 1 line: "Temperature [°C] - 1"
        multiLineLabel = `{singleLine|${plotName} ${unit} - ${plotNumber}}`;
      } else if (numLines === 2) {
        // 2 lines: "Temperature" / "[°C] - 1"
        multiLineLabel = `{topLine|${plotName}}\n{bottomLine|${unit} - ${plotNumber}}`;
      } else {
        // 3 lines: "1" / "Temperature" / "[°C]"
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
    
    const matchedValues = selectedKeys.map(key => {
      // Extract label from key to find the matching data object
      const label = this.extractLabelFromKey(key);
      
      const foundObject = this.ctx.data.find(obj => obj.dataKey.label === label);
      const axisAssignment = foundObject ? (foundObject.dataKey.settings?.axisAssignment || 'Top') : null;
      
      
      // Default to 'Top' if no assignment is set
      return axisAssignment;
    });
    
    const axisPositionMap = this.getAxisPositionMap();
    
    const uniqueMatches = new Set(matchedValues.filter(item => item && Object.prototype.hasOwnProperty.call(axisPositionMap, item)));
    return uniqueMatches;
  }

  private setDataGridByNames(selectedKeys: string[]): void {
    
    // If no keys with data, keep 1 grid but mark as having no data
    if (selectedKeys.length === 0) {
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
    
    // Update current grid configuration
    this.currentGridNames = Array.from(selectedGrids);
    this.currentGrids = selectedGrids.size;
    
  }

  private countGridsBySettings(selectedKeys: string[]): Set<string> {
    
    const axisPositionMap = this.getAxisPositionMap();
    
    // Collect all unique axisAssignment values from the data
    const axisAssignments = this.ctx.data
      .map((item, index) => {
        // Default to 'Top' if no assignment is set
        const assignment = item.dataKey?.settings?.axisAssignment || 'Top';
        return assignment;
      })
      .filter(assignment => Object.prototype.hasOwnProperty.call(axisPositionMap, assignment));
    
    const uniqueAssignments = new Set(axisAssignments);
    
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
    }
    
    // Default new series to OFF (hidden) if not in existing selection
    for (const key of data) {
      if (!(key in selected)) {
        selected[key] = false;
      }
    }
    
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
        confine: true,  // Keep tooltip within chart bounds
        animation: false,
        transitionDuration: 0,
        renderMode: 'html',  // HTML mode for proper formatting
        appendToBody: false,
        enterable: false,
        showDelay: 0,
        hideDelay: 100,
        alwaysShowContent: false,
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
          animation: false,  // Disable axisPointer animation for immediate response
          throttle: 16,  // 60fps throttling for ultra-smooth mouse tracking
          link: [{
            xAxisIndex: 'all'
          }]
        },
        // Smart position function with boundary detection
        position: (point: number[], params: any, dom: HTMLElement, rect: any, size: { contentSize: number[] }) => {
          // Fast grid estimation without expensive containPixel calls
          if (point && this.currentGrids > 1) {
            const normalizedY = point[1] / (this.chart?.getHeight() || 600);
            this.hoveredGridIndex = Math.floor(normalizedY * this.currentGrids);
          }
          
          // Get chart dimensions
          const chartWidth = this.chart?.getWidth() || window.innerWidth;
          const chartHeight = this.chart?.getHeight() || window.innerHeight;
          
          // Tooltip dimensions - with fallback values
          const tooltipWidth = size?.contentSize?.[0] || 200;
          const tooltipHeight = size?.contentSize?.[1] || 100;
          
          // Cursor offset
          const offsetX = 15;
          const offsetY = 15;
          const margin = 10;
          
          // Calculate position - prefer right side, but flip if needed
          let x = point[0] + offsetX;
          let y = point[1] - offsetY;
          
          // Check if tooltip fits on the right
          if (x + tooltipWidth + margin > chartWidth) {
            // Try left side
            x = point[0] - tooltipWidth - offsetX;
            
            // If still doesn't fit, align with right edge
            if (x < margin) {
              x = Math.min(point[0] + offsetX, chartWidth - tooltipWidth - margin);
              if (x < margin) x = margin;
            }
          }
          
          // Vertical boundary check
          if (y < margin) {
            y = point[1] + offsetY;  // Try below cursor
          }
          if (y + tooltipHeight + margin > chartHeight) {
            y = Math.max(margin, chartHeight - tooltipHeight - margin);
          }
          
          return [x, y];
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
              // Format label according to user settings
              const displayName = this.formatTooltipLabel(it.seriesName, val, unit);
              html += `<tr>
                <td style="padding:2px 6px 2px 0;white-space:nowrap">${it.marker} ${displayName}</td>
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
        end: this.zoomEnd,
        filterMode: 'filter'  // Actually filter out non-visible points
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
        filterMode: 'filter',     // Filter out hidden points for performance
        throttle: 50
      }
    ];
  }

  // Utility methods
  private LOG(...args: any[]): void {
    // Logging disabled
  }

  /**
   * Performance-specific logging (independent toggle)
   * 
   * Usage: Set performanceDebug: true in widget settings to enable
   * 
   * Monitors:
   * - ECharts operations (setOption, resize, init)
   * - Update coalescing and throttling
   * - Data processing timing
   * - Memory usage indicators
   * - Rendering performance bottlenecks
   * 
   * Example output:
   * [PERF] 14:30:45.123 (1234.56ms) 📈 ECharts setOption took: 42.30ms (5000 points)
   */
  private PERF_LOG(...args: any[]): void {
    // Performance logging disabled
  }

  /**
   * Apply maximum performance optimizations for ultra-smooth rendering
   */
  private applyMaximumPerformanceSettings(): void {
    // Override performance settings for maximum speed
    const settings = this.ctx.settings || {};
    
    // Create performance-optimized settings object
    const perfSettings = {
      ...settings,
      // Force Canvas renderer for maximum performance
      useCanvasRenderer: true,
      
      // Disable all animations for maximum responsiveness
      enableAnimations: false,
      
      // Enable aggressive data sampling
      enableDataSampling: true,
      maxDataPoints: 1500, // More aggressive than default 5000
      
      // Enable progressive rendering
      enableProgressiveRendering: true,
      
      // Enable all update optimizations
      coalesceRapidUpdates: true,
      optimizeClickHandling: true,
      batchEChartsUpdates: true,
      deferredUIUpdates: true,
      
      // Don't override visual settings - let user control them
      // Keep user's showDataPoints and smooth settings
      
      // Optimize click handling
      clickDebounceMs: 50, // Faster than default 100ms
      
      // Reduce update delays
      echartsUpdateDelay: 16, // 60fps aligned
    };
    
    // Apply the settings (non-destructive override)
    Object.assign(this.ctx.settings || {}, perfSettings);
    
  }

  /**
   * Setup comprehensive mouse interaction and tooltip performance monitoring
   */
  private setupMouseInteractionLogging(): void {
    if (!this.chart) return;

    let lastMouseMoveTime = 0;
    let mouseMoveCount = 0;
    let tooltipActiveTime = 0;
    
    // Monitor mouse movement performance (main cause of tooltip lag)
    this.chart.getZr().on('mousemove', () => {
      const now = performance.now();
      const timeSinceLastMove = now - lastMouseMoveTime;
      mouseMoveCount++;
      
      // Log excessive mouse move frequency (lag indicator)
      if (timeSinceLastMove < 8) { // More than 120fps
      }
      
      // Log every 50th mouse move to avoid spam
      if (mouseMoveCount % 50 === 0) {
      }
      
      lastMouseMoveTime = now;
    });

    // Monitor tooltip show performance - no throttling for smooth native feel
    this.chart.on('showTip', () => {
      const now = performance.now();
      // No throttling - smooth native performance
      tooltipActiveTime = now;
    });

    // Monitor tooltip hide performance  
    this.chart.on('hideTip', () => {
      if (tooltipActiveTime > 0) {
        const tooltipDuration = performance.now() - tooltipActiveTime;
        if (tooltipDuration > 5000) { // Long tooltip display
        }
        tooltipActiveTime = 0;
      }
    });

    // Monitor hover events on series
    this.chart.on('mouseover', (event: any) => {
      const hoverStart = performance.now();
      
      // Track hover processing time
      setTimeout(() => {
        const hoverDuration = performance.now() - hoverStart;
        if (hoverDuration > 16) { // More than one frame at 60fps
        }
      }, 0);
    });

    // Monitor when mouse leaves series
    this.chart.on('mouseout', (event: any) => {
    });

    // Monitor chart canvas events that affect tooltip responsiveness
    this.chart.getZr().on('mouseout', () => {
    });

    // Monitor global mouse down/up for interaction responsiveness
    this.chart.getZr().on('mousedown', () => {
      const interactionStart = performance.now();
      
      // Check responsiveness on next frame
      requestAnimationFrame(() => {
        const responseTime = performance.now() - interactionStart;
        if (responseTime > 32) { // More than 2 frames
        }
      });
    });

    // Monitor chart render performance
    this.chart.on('rendered', () => {
      const renderEnd = performance.now();
      if (this.lastChartRenderStart > 0) {
        const renderDuration = renderEnd - this.lastChartRenderStart;
        if (renderDuration > 100) {
        }
      }
      this.lastChartRenderStart = 0;
    });

    // Monitor data zoom performance
    this.chart.on('datazoom', (event: any) => {
      const zoomStart = performance.now();
      
      // Check zoom response time
      setTimeout(() => {
        const zoomDuration = performance.now() - zoomStart;
        if (zoomDuration > 50) {
        }
      }, 0);
    });

    // Legend event handler removed - already handled above with debouncing

    
    // System performance diagnostics (if needed, will be called elsewhere)
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

    // Initialize plot states for any new labels we haven't seen before
    for (const label of group.data) {
      if (!this.plotLabelStates.has(label)) {
        // Default to visible for new plots
        this.plotLabelStates.set(label, true);
      }
    }

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

      // Use plot state to determine selection, not just the chart legend state
      const plotVisible = this.plotLabelStates.get(label) !== false;
      const chartSelected = group.selected[label] !== false;

      return {
        label,
        color: this.pickRepresentativeColor(label),
        selected: plotVisible && chartSelected,
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
      
      // Account for the extra margin we added for sidebar
      const sidebarExtraMargin = (this.isSidebarVisible && this.ctx.settings?.showEntitySidebar !== false) ? 
        viewportWidth * 0.05 : 0; // 5% extra margin when sidebar is visible
      
      // If paddings seem too small (< 10px total), it might mean percentages haven't resolved
      if (paddingLeft + paddingRight < 10) {
        // Apply a safety margin to prevent clipping
        const safetyMargin = viewportWidth * 0.15 + sidebarExtraMargin; 
        viewportWidth = viewportWidth - safetyMargin;
      } else {
        // Subtract sidebar extra margin from available width
        viewportWidth = viewportWidth - sidebarExtraMargin;
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


    // Toggle the selection
    mainItem.selected = !mainItem.selected;
    item.selected = mainItem.selected;

    // Track the plot state separately
    this.plotLabelStates.set(item.label, mainItem.selected);

    // Perform the toggle with debouncing
    this.debouncedUIUpdate('legend-toggle', () => {
      this.performLegendToggle(item.label, mainItem.selected);
    });
  }
  
  // Helper to toggle all series belonging to a label (kept for compatibility)
  /* private toggleAllSeriesForLabel(label: string, shouldSelect: boolean): void {
    if (!this.chart) return;
    
    
    // Optimistic UI update - legend chips are already updated by the caller
    // This provides immediate visual feedback
    
    // Debounced core logic to avoid rapid-fire legend clicks
    this.debouncedUIUpdate('legend-toggle', () => {
      this.performLegendToggle(label, shouldSelect);
    });
  } */
  
  private performLegendToggle(label: string, shouldSelect: boolean): void {
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
    
    // Dispatch actions for all matching series using batched approach
    keys.forEach(key => {
      this.batchedDispatchAction({ 
        type: action, 
        name: key, 
        legendIndex: 0 
      });
    });
    
    // Optimized post-toggle processing with batched UI updates
    setTimeout(() => {
      // Batch UI updates for better performance
      this.batchUIUpdate('legend-sync', () => {
        this.syncCustomLegendFromChart();
        this.refreshEntityList();
      });
      
      // Check if grid layout needs to change
      this.legendOverridesGrids = true;
      const chartOption: any = this.chart.getOption();
      const legendSelected = (chartOption?.legend?.[0]?.selected) || {};
      const activeSeriesKeys = Object.keys(legendSelected).filter(k => legendSelected[k] !== false);
      
      // Lightweight logging for performance mode
      if (this.shouldOptimizeClicks()) {
      }
      
      const previousGridCount = this.currentGrids;
      
      // Capture scroll position before mode change
      this.captureScrollPosition();
      
      this.setDataGridByNames(activeSeriesKeys);
      
      if (previousGridCount !== this.currentGrids) {
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

  /**
   * System performance diagnostics to identify tooltip lag causes
   * @deprecated Currently not used - can be enabled if needed for debugging
   */
  private logSystemPerformance(): void {
    if (!this.PERF_DEBUG) return;
    
    // Browser performance info
    const nav = navigator as any;
    
    // Performance timing
    const perf = performance as any;
    if (perf.memory) {
      const memMB = (perf.memory.usedJSHeapSize / 1024 / 1024).toFixed(1);
      const limitMB = (perf.memory.totalJSHeapSize / 1024 / 1024).toFixed(1);
    }
    
    // Frame rate detection
    const lastFrameTime = performance.now();
    let frameCount = 0;
    const checkFrameRate = () => {
      const currentTime = performance.now();
      frameCount++;
      if (frameCount === 10) {
        const avgFrameTime = (currentTime - lastFrameTime) / 10;
        const fps = (1000 / avgFrameTime).toFixed(1);
        
        if (parseFloat(fps) < 45) {
        } else if (parseFloat(fps) > 55) {
        }
        return;
      }
      requestAnimationFrame(checkFrameRate);
    };
    requestAnimationFrame(checkFrameRate);
  }
  
  /**
   * Calculate min/max values per grid for visible time range
   * Each grid/subplot gets its own min/max calculation
   */
  private calcPerGridMinMax(series: any[], visibleRange?: { start: number; end: number }): Map<number, { min: number; max: number }> {
    const gridMinMax = new Map<number, { min: number; max: number }>();
    
    if (this.minMaxDebugLogs) {
      console.log(`[MIN/MAX] Starting per-grid min/max calculation for ${series.length} series`);
    }
    
    // Group series by grid
    const seriesByGrid = new Map<number, any[]>();
    
    series.forEach(s => {
      // Ignore helper series we add ourselves
      if (!s.data?.length || /Min Line|Max Line|Alarm Area/.test(s.name)) return;
      
      const gridIndex = s.xAxisIndex || 0;
      if (!seriesByGrid.has(gridIndex)) {
        seriesByGrid.set(gridIndex, []);
      }
      seriesByGrid.get(gridIndex)!.push(s);
    });
    
    if (this.minMaxDebugLogs) {
      console.log(`[MIN/MAX] Found series on ${seriesByGrid.size} grids:`, Array.from(seriesByGrid.keys()));
    }
    
    // Calculate min/max for each grid
    seriesByGrid.forEach((gridSeries, gridIndex) => {
      let gridMin = Number.POSITIVE_INFINITY;
      let gridMax = Number.NEGATIVE_INFINITY;
      let seriesCount = 0;
      let totalPoints = 0;
      
      gridSeries.forEach(s => {
        const values = s.data
          .filter(([t]: [number, number]) => !visibleRange || (t >= visibleRange.start && t <= visibleRange.end))
          .map(([, v]: [number, number]) => v)
          .filter((v: number) => v != null && !isNaN(v));
        
        if (!values.length) return;
        
        const min = Math.min(...values);
        const max = Math.max(...values);
        
        gridMin = Math.min(gridMin, min);
        gridMax = Math.max(gridMax, max);
        seriesCount++;
        totalPoints += values.length;
        
        if (this.minMaxDebugLogs) {
          console.log(`[MIN/MAX] Grid ${gridIndex} - Series "${s.name}": min=${min}, max=${max}, points=${values.length}`);
        }
      });
      
      const result = {
        min: gridMin === Number.POSITIVE_INFINITY ? 0 : gridMin,
        max: gridMax === Number.NEGATIVE_INFINITY ? 100 : gridMax
      };
      
      gridMinMax.set(gridIndex, result);
      
      if (this.minMaxDebugLogs) {
        console.log(`[MIN/MAX] Grid ${gridIndex} calculation complete:`, {
          gridMin: result.min,
          gridMax: result.max,
          seriesAnalyzed: seriesCount,
          totalDataPoints: totalPoints
        });
      }
    });
    
    return gridMinMax;
  }
  
  /**
   * Add min/max reference lines showing per-grid min/max values
   */
  private addMinMaxLines(options: any): void {
    if (!options.series?.length || !this.minMaxVisible) {
      if (this.minMaxDebugLogs && !this.minMaxVisible) {
        console.log('[MIN/MAX] Min/max lines disabled in settings');
      }
      return;
    }
    
    if (this.minMaxDebugLogs) {
      console.log('[MIN/MAX] Starting to add per-grid min/max reference lines');
    }
    
    // Find base series with data for time domain
    const baseSeries = options.series.find((s: any) => s.data?.length && !/Min Line|Max Line|Alarm Area/.test(s.name));
    if (!baseSeries) {
      if (this.minMaxDebugLogs) {
        console.log('[MIN/MAX] No base series found with data');
      }
      return;
    }
    
    const timeDomain = {
      start: baseSeries.data[0][0],
      end: baseSeries.data[baseSeries.data.length - 1][0]
    };
    
    // Get visible range from dataZoom if available
    let visibleRange: { start: number; end: number } | undefined;
    if (this.chart && !this.chart.isDisposed()) {
      try {
        const option = this.chart.getOption() as any;
        if (option?.dataZoom?.[0]) {
          const zoom = option.dataZoom[0];
          const totalRange = timeDomain.end - timeDomain.start;
          visibleRange = {
            start: timeDomain.start + (totalRange * zoom.start / 100),
            end: timeDomain.start + (totalRange * zoom.end / 100)
          };
        }
      } catch (e) {
      }
    }
    
    // Calculate per-grid min/max values
    const gridMinMax = this.calcPerGridMinMax(options.series, visibleRange);
    
    
    if (this.minMaxDebugLogs) {
      console.log(`[MIN/MAX] Adding lines to ${gridMinMax.size} grid(s) with individual min/max values`);
      console.log(`[MIN/MAX] Line style: ${this.minMaxStyle}, width: ${this.minMaxLineWidth}px`);
      console.log(`[MIN/MAX] Colors: min=${this.minColor}, max=${this.maxColor}`);
    }
    
    // Get the full time range across all series for proper line length
    const fullTimeRange = { start: timeDomain.start, end: timeDomain.end };
    options.series.forEach((s: any) => {
      if (s.data?.length && !/Min Line|Max Line|Alarm Area/.test(s.name)) {
        const seriesStart = s.data[0][0];
        const seriesEnd = s.data[s.data.length - 1][0];
        fullTimeRange.start = Math.min(fullTimeRange.start, seriesStart);
        fullTimeRange.end = Math.max(fullTimeRange.end, seriesEnd);
      }
    });
    
    if (this.minMaxDebugLogs) {
      console.log(`[MIN/MAX] Full time range: ${new Date(fullTimeRange.start).toISOString()} to ${new Date(fullTimeRange.end).toISOString()}`);
    }
    
    // Add min/max lines to each grid with their specific min/max values
    let linesAdded = 0;
    gridMinMax.forEach((minMax, gridIndex) => {
      const { min, max } = minMax;
      
      if (this.minMaxDebugLogs) {
        console.log(`[MIN/MAX] Adding lines to grid ${gridIndex}: min=${min} (${this.minColor}), max=${max} (${this.maxColor})`);
      }
      
      // Min line for this specific grid
      options.series.push({
        name: `Min Line ${gridIndex}`,
        type: 'line',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        data: [[fullTimeRange.start, min], [fullTimeRange.end, min]],
        lineStyle: { 
          type: this.minMaxStyle, 
          width: this.minMaxLineWidth,
          color: this.minColor
        },
        symbol: 'none',
        animation: false,
        z: 100,
        emphasis: { disabled: true },
        legendHoverLink: false,
        silent: true,
        tooltip: { show: false }
      });
      
      // Max line for this specific grid
      options.series.push({
        name: `Max Line ${gridIndex}`,
        type: 'line',
        xAxisIndex: gridIndex,
        yAxisIndex: gridIndex,
        data: [[fullTimeRange.start, max], [fullTimeRange.end, max]],
        lineStyle: { 
          type: this.minMaxStyle, 
          width: this.minMaxLineWidth,
          color: this.maxColor
        },
        symbol: 'none',
        animation: false,
        z: 100,
        emphasis: { disabled: true },
        legendHoverLink: false,
        silent: true,
        tooltip: { show: false }
      });
      
      linesAdded += 2;
    });
    
    if (this.minMaxDebugLogs) {
      console.log(`[MIN/MAX] Added ${linesAdded} min/max reference lines (${linesAdded/2} grids)`);
    }
  }
  
  /**
   * Add alarm threshold lines similar to min/max lines
   */
  private addAlarmLines(options: any): void {
    if (!this.alarmLinesVisible || !this.alarmData?.size || !options.series?.length) {
      if (this.alarmDebugLogs && !this.alarmLinesVisible) {
        console.log('[ALARM LINES] Alarm lines disabled in settings');
      }
      return;
    }
    
    if (this.alarmDebugLogs) {
      console.log('[ALARM LINES] Starting to add alarm threshold lines');
    }
    
    // Find base series with data for time domain
    const baseSeries = options.series.find((s: any) => s.data?.length && !/Min Line|Max Line|Alarm/.test(s.name));
    if (!baseSeries) {
      if (this.alarmDebugLogs) {
        console.log('[ALARM LINES] No base series found with data');
      }
      return;
    }
    
    // Get the full time range
    const fullTimeRange = { 
      start: baseSeries.data[0][0], 
      end: baseSeries.data[baseSeries.data.length - 1][0] 
    };
    
    options.series.forEach((s: any) => {
      if (s.data?.length && !/Min Line|Max Line|Alarm/.test(s.name)) {
        const seriesStart = s.data[0][0];
        const seriesEnd = s.data[s.data.length - 1][0];
        fullTimeRange.start = Math.min(fullTimeRange.start, seriesStart);
        fullTimeRange.end = Math.max(fullTimeRange.end, seriesEnd);
      }
    });
    
    // Determine which grids are active
    const gridsToUse = new Set<number>();
    options.series.forEach((s: any) => {
      if (s.data?.length && !/Min Line|Max Line|Alarm/.test(s.name)) {
        gridsToUse.add(s.xAxisIndex || 0);
      }
    });
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM LINES] Active grids: ${Array.from(gridsToUse).join(', ')}`);
      console.log(`[ALARM LINES] Processing ${this.alarmData.size} device alarm configurations`);
    }
    
    // Collect unique alarm thresholds across all devices
    const thresholdsByGrid = new Map<number, Set<{ value: number; type: 'min' | 'max'; severity: string }>>();
    
    // Initialize for each grid
    gridsToUse.forEach(gridIndex => {
      thresholdsByGrid.set(gridIndex, new Set());
    });
    
    // Process alarm data
    this.alarmData.forEach((threshold, deviceId) => {
      // Filter by severity settings
      if (threshold.severity === 'CRITICAL' && !this.alarmShowCritical) return;
      if (threshold.severity === 'WARNING' && !this.alarmShowWarning) return;
      if (threshold.severity === 'INFO' && !this.alarmShowInfo) return;
      
      // Add thresholds to all grids (since alarms apply globally)
      gridsToUse.forEach(gridIndex => {
        const gridThresholds = thresholdsByGrid.get(gridIndex)!;
        
        if (threshold.max != null) {
          gridThresholds.add({ 
            value: threshold.max, 
            type: 'max', 
            severity: threshold.severity || 'CRITICAL' 
          });
        }
        if (threshold.min != null) {
          gridThresholds.add({ 
            value: threshold.min, 
            type: 'min', 
            severity: threshold.severity || 'CRITICAL' 
          });
        }
      });
    });
    
    // Add alarm lines for each grid
    let linesAdded = 0;
    thresholdsByGrid.forEach((thresholds, gridIndex) => {
      // Convert Set to Array and deduplicate by value
      const uniqueThresholds = Array.from(new Map(
        Array.from(thresholds).map(t => [`${t.value}_${t.type}_${t.severity}`, t])
      ).values());
      
      if (this.alarmDebugLogs) {
        console.log(`[ALARM LINES] Grid ${gridIndex}: Adding ${uniqueThresholds.length} alarm lines`);
      }
      
      uniqueThresholds.forEach((threshold, index) => {
        // Determine line color based on threshold type (min or max)
        const lineColor = threshold.type === 'max' ? this.alarmMaxColor : this.alarmMinColor;
        
        const lineName = `Alarm ${threshold.type === 'max' ? 'Max' : 'Min'} ${threshold.severity} ${gridIndex}_${index}`;
        
        options.series.push({
          name: lineName,
          type: 'line',
          xAxisIndex: gridIndex,
          yAxisIndex: gridIndex,
          data: [[fullTimeRange.start, threshold.value], [fullTimeRange.end, threshold.value]],
          lineStyle: {
            type: this.alarmLineStyle,
            width: this.alarmLineWidth,
            color: lineColor,
            opacity: 0.8
          },
          symbol: 'none',
          animation: false,
          z: 99, // Slightly below min/max lines
          emphasis: { disabled: true },
          legendHoverLink: false,
          silent: true,
          tooltip: { show: false }
        });
        
        linesAdded++;
      });
    });
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM LINES] Added ${linesAdded} alarm threshold lines`);
    }
  }
  
  
  /**
   * Fetch alarms for all devices
   */
  private async fetchAlarmsForDevices(): Promise<void> {
    if (this.alarmDebugLogs) {
      console.log('[ALARM] Starting alarm fetch for devices from attributes');
    }
    
    // Check if attributeService is available
    if (!this.ctx.attributeService) {
      if (this.alarmDebugLogs) {
        console.log('[ALARM] AttributeService not available');
      }
      return;
    }
    
    // Get unique devices from datasources
    const devices = new Map<string, any>();
    this.ctx.datasources?.forEach((ds: any) => {
      if (ds.entityId) {
        const entityId = typeof ds.entityId === 'string' 
          ? ds.entityId 
          : ds.entityId.id;
        
        if (entityId) {
          devices.set(entityId, {
            entityType: ds.entityType || 'DEVICE',
            id: entityId,
            name: ds.name || ds.entityName || 'Unknown'
          });
        }
      }
    });
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM] Found ${devices.size} unique devices to fetch alarms for`);
    }
    
    if (devices.size === 0) {
      if (this.alarmDebugLogs) {
        console.log('[ALARM] No devices found in datasources');
      }
      return;
    }
    
    try {
      // Fetch alarms attribute for all devices
      const promises: Promise<any>[] = [];
      const deviceArray: any[] = [];
      
      devices.forEach((device, deviceId) => {
        const entity = {
          entityType: device.entityType,
          id: device.id
        };
        
        deviceArray.push(device);
        promises.push(
          this.ctx.attributeService
            .getEntityAttributes(entity, 'SERVER_SCOPE' as any, ['alarms'])
            .toPromise()
            .catch((error: any) => {
              if (this.alarmDebugLogs) {
                console.log(`[ALARM] Error fetching alarms for device ${deviceId}:`, error);
              }
              return [];
            })
        );
      });
      
      if (this.alarmDebugLogs) {
        console.log(`[ALARM] Fetching alarm attributes from ${promises.length} devices...`);
      }
      
      const responses = await Promise.all(promises);
      this.alarmData = this.processAlarmAttributeResponses(responses, deviceArray);
      
      if (this.alarmDebugLogs) {
        console.log(`[ALARM] Alarm fetch complete. Processed ${this.alarmData?.size || 0} device alarm configurations`);
      }
      
      // Re-render chart with alarm overlays
      this.onDataUpdated();
    } catch (error) {
      if (this.alarmDebugLogs) {
        console.error('[ALARM] Error fetching alarms:', error);
      }
    }
  }
  
  /**
   * Process alarm responses into usable format
   */
  /**
   * Set up monitoring for alarm attribute changes
   * Polls for changes every 5 seconds and updates when detected
   */
  private setupAlarmAttributeMonitoring(): void {
    if (this.alarmDebugLogs) {
      console.log('[ALARM] Setting up alarm attribute monitoring');
    }
    
    // Store the last known alarm values for comparison
    const lastAlarmValues = new Map<string, string>();
    
    // Set up polling interval (every 5 seconds)
    this.alarmUpdateTimer = setInterval(async () => {
      if (!this.ctx.attributeService || !this.ctx.datasources) {
        return;
      }
      
      try {
        // Get unique devices from datasources
        const devices = new Map<string, any>();
        this.ctx.datasources?.forEach((ds: any) => {
          if (ds.entityId) {
            const entityId = typeof ds.entityId === 'string' 
              ? ds.entityId 
              : ds.entityId.id;
            
            if (entityId) {
              devices.set(entityId, {
                entityType: ds.entityType || 'DEVICE',
                id: entityId,
                name: ds.name || ds.entityName || 'Unknown'
              });
            }
          }
        });
        
        // Check each device for alarm changes
        let hasChanges = false;
        const promises: Promise<any>[] = [];
        
        devices.forEach((device) => {
          const entity = {
            entityType: device.entityType,
            id: device.id
          };
          
          promises.push(
            this.ctx.attributeService
              .getEntityAttributes(entity, 'SERVER_SCOPE' as any, ['alarms'])
              .toPromise()
              .then((attrs: any[]) => {
                if (attrs && attrs.length > 0) {
                  const alarmAttr = attrs.find((attr: any) => attr.key === 'alarms');
                  if (alarmAttr) {
                    const currentValue = JSON.stringify(alarmAttr.value);
                    const lastValue = lastAlarmValues.get(device.id);
                    
                    if (lastValue !== currentValue) {
                      hasChanges = true;
                      lastAlarmValues.set(device.id, currentValue);
                      
                      if (this.alarmDebugLogs) {
                        console.log(`[ALARM] Detected alarm change for device ${device.id}`);
                      }
                    }
                  }
                }
              })
              .catch((error: any) => {
                // Ignore individual device errors
                if (this.alarmDebugLogs) {
                  console.log(`[ALARM] Error checking device ${device.id}:`, error);
                }
              })
          );
        });
        
        await Promise.all(promises);
        
        // If changes detected, refresh alarm data
        if (hasChanges) {
          if (this.alarmDebugLogs) {
            console.log('[ALARM] Alarm changes detected, refreshing alarm data');
          }
          
          // Fetch updated alarms
          await this.fetchAlarmsForDevices();
        }
      } catch (error) {
        if (this.alarmDebugLogs) {
          console.error('[ALARM] Error in alarm monitoring:', error);
        }
      }
    }, this.ctx.settings?.alarmUpdateInterval || 5000); // Default 5 seconds, configurable
    
    if (this.alarmDebugLogs) {
      const interval = this.ctx.settings?.alarmUpdateInterval || 5000;
      console.log(`[ALARM] Alarm monitoring started (polling every ${interval/1000} seconds)`);
    }
  }

  private processAlarmAttributeResponses(responses: any[], deviceArray: any[]): Map<string, { min?: number; max?: number; severity?: string }> {
    const alarmMap = new Map<string, { min?: number; max?: number; severity?: string }>();
    let totalAlarms = 0;
    let processedDevices = 0;
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM] Processing ${responses.length} alarm responses from devices`);
    }
    
    // Process attribute responses
    responses.forEach((attributeResponse, responseIndex) => {
      const device = deviceArray[responseIndex];
      const deviceId = device.id;
      
      if (!attributeResponse || !Array.isArray(attributeResponse)) {
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Device ${deviceId} has no alarm attributes`);
        }
        return;
      }
      
      // Find the alarms attribute
      const alarmAttr = attributeResponse.find((attr: any) => attr.key === 'alarms');
      if (!alarmAttr || !alarmAttr.value) {
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Device ${deviceId} has no alarms attribute`);
        }
        return;
      }
      
      // Parse alarms value if it's a string
      let alarmCategories = alarmAttr.value;
      if (typeof alarmCategories === 'string') {
        try {
          alarmCategories = JSON.parse(alarmCategories);
        } catch (e) {
          if (this.alarmDebugLogs) {
            console.log(`[ALARM] Failed to parse alarms for device ${deviceId}:`, e);
          }
          return;
        }
      }
      
      if (!Array.isArray(alarmCategories)) {
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Device ${deviceId} alarms is not an array`);
        }
        return;
      }
      
      if (this.alarmDebugLogs) {
        console.log(`[ALARM] Device ${deviceId} has ${alarmCategories.length} alarm categories`);
      }
      
      // Process alarm categories and extract active thresholds
      let minThreshold: number | undefined;
      let maxThreshold: number | undefined;
      let activeFieldCount = 0;
      
      alarmCategories.forEach((category: any) => {
        if (!category.fields || !Array.isArray(category.fields)) return;
        
        category.fields.forEach((field: any) => {
          if (!field.active || !field.value || !Array.isArray(field.value)) return;
          
          activeFieldCount++;
          const fieldMin = parseFloat(field.value[0]);
          const fieldMax = parseFloat(field.value[1]);
          
          if (isFinite(fieldMin)) {
            minThreshold = minThreshold !== undefined ? Math.min(minThreshold, fieldMin) : fieldMin;
          }
          if (isFinite(fieldMax)) {
            maxThreshold = maxThreshold !== undefined ? Math.max(maxThreshold, fieldMax) : fieldMax;
          }
          
          if (this.alarmDebugLogs) {
            console.log(`[ALARM] Device ${deviceId}, Category: ${category.name}, Field: ${field.name}, Active: true, Min: ${fieldMin}, Max: ${fieldMax}`);
          }
        });
      });
      
      // Store the aggregated thresholds for this device
      if (minThreshold !== undefined || maxThreshold !== undefined) {
        const alarmConfig = {
          min: minThreshold,
          max: maxThreshold,
          severity: 'CRITICAL' // Default severity
        };
        
        alarmMap.set(deviceId, alarmConfig);
        totalAlarms++;
        
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Device ${deviceId}: Aggregated min=${minThreshold}, max=${maxThreshold}, active fields=${activeFieldCount}`);
        }
      }
      
      processedDevices++;
    });
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM] Processing complete: ${totalAlarms} alarms from ${processedDevices} devices, ${alarmMap.size} unique device configurations`);
    }
    
    return alarmMap;
  }
  
  /**
   * Add alarm overlay areas showing ALL device thresholds
   */
  private addAlarmAreas(options: any): void {
    if (!this.alarmStatusVisible || !this.alarmData?.size || !options.series?.length) {
      if (this.alarmDebugLogs) {
        console.log('[ALARM] Skipping alarm areas: alarmStatusVisible=', this.alarmStatusVisible, 'alarmData.size=', this.alarmData?.size, 'series.length=', options.series?.length);
      }
      return;
    }
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM] Adding alarm areas. ${this.alarmData.size} device alarm configurations available`);
    }
    
    // Find base series for time domain
    const baseSeries = options.series.find((s: any) => s.data?.length && !/Min Line|Max Line|Alarm Area/.test(s.name));
    if (!baseSeries) {
      if (this.alarmDebugLogs) {
        console.log('[ALARM] No base series found for time domain');
      }
      return;
    }
    
    const timeDomain = {
      start: baseSeries.data[0][0],
      end: baseSeries.data[baseSeries.data.length - 1][0]
    };
    
    if (this.alarmDebugLogs) {
      console.log('[ALARM] Time domain:', timeDomain);
    }
    
    // Determine which grids are active
    const gridsToUse = new Set<number>();
    options.series.forEach((s: any) => {
      if (s.data?.length && !/Min Line|Max Line|Alarm Area/.test(s.name)) {
        gridsToUse.add(s.xAxisIndex || 0);
      }
    });
    
    if (this.alarmDebugLogs) {
      console.log('[ALARM] Active grids:', Array.from(gridsToUse));
    }
    
    // Collect all unique alarm thresholds across all devices
    const allThresholds: Array<{ value: number; type: 'min' | 'max'; severity: string }> = [];
    let filteredDevices = 0;
    
    this.alarmData.forEach((threshold, deviceId) => {
      // Filter by severity settings
      if (threshold.severity === 'CRITICAL' && !this.alarmShowCritical) {
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Skipping CRITICAL alarm for device ${deviceId} (disabled)`);
        }
        return;
      }
      if (threshold.severity === 'WARNING' && !this.alarmShowWarning) {
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Skipping WARNING alarm for device ${deviceId} (disabled)`);
        }
        return;
      }
      if (threshold.severity === 'INFO' && !this.alarmShowInfo) {
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Skipping INFO alarm for device ${deviceId} (disabled)`);
        }
        return;
      }
      
      filteredDevices++;
      
      if (threshold.max != null) {
        allThresholds.push({ value: threshold.max, type: 'max', severity: threshold.severity || 'CRITICAL' });
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Adding MAX threshold for device ${deviceId}: ${threshold.max} (${threshold.severity})`);
        }
      }
      if (threshold.min != null) {
        allThresholds.push({ value: threshold.min, type: 'min', severity: threshold.severity || 'CRITICAL' });
        if (this.alarmDebugLogs) {
          console.log(`[ALARM] Adding MIN threshold for device ${deviceId}: ${threshold.min} (${threshold.severity})`);
        }
      }
    });
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM] Collected ${allThresholds.length} thresholds from ${filteredDevices} devices after severity filtering`);
    }
    
    // Remove duplicate threshold values
    const uniqueThresholds = Array.from(new Map(
      allThresholds.map(t => [`${t.value}_${t.type}`, t])
    ).values());
    
    if (this.alarmDebugLogs) {
      console.log(`[ALARM] After deduplication: ${uniqueThresholds.length} unique thresholds`);
    }
    
    
    // Add alarm areas for each unique threshold on each grid
    gridsToUse.forEach(gridIndex => {
      uniqueThresholds.forEach((threshold, index) => {
        const alarmColor = threshold.severity === 'CRITICAL' ? 
          `rgba(255, 0, 0, ${this.alarmOpacity})` : 
          threshold.severity === 'WARNING' ? 
          `rgba(255, 165, 0, ${this.alarmOpacity})` : 
          `rgba(0, 122, 255, ${this.alarmOpacity})`;
        
        if (threshold.type === 'max') {
          // Upper threshold band
          const yMax = this.getYAxisMax(options, gridIndex) || threshold.value * 2;
          
          options.series.push({
            name: `Alarm Area MAX ${gridIndex}_${index}`,
            type: 'line',
            xAxisIndex: gridIndex,
            yAxisIndex: gridIndex,
            data: [
              [timeDomain.start, threshold.value],
              [timeDomain.end, threshold.value],
              [timeDomain.end, yMax],
              [timeDomain.start, yMax]
            ],
            areaStyle: {
              opacity: 1, // Opacity is already in the color
              color: alarmColor
            },
            lineStyle: {
              type: 'dashed',
              width: 1,
              color: threshold.severity === 'CRITICAL' ? '#ff3b30' : 
                     threshold.severity === 'WARNING' ? '#ff9500' : '#007aff',
              opacity: 0.5
            },
            symbol: 'none',
            silent: true,
            z: 1,
            legendHoverLink: false,
            tooltip: { show: false },
            animation: false
          });
        } else {
          // Lower threshold band
          const yMin = this.getYAxisMin(options, gridIndex) || 0;
          
          options.series.push({
            name: `Alarm Area MIN ${gridIndex}_${index}`,
            type: 'line',
            xAxisIndex: gridIndex,
            yAxisIndex: gridIndex,
            data: [
              [timeDomain.start, yMin],
              [timeDomain.end, yMin],
              [timeDomain.end, threshold.value],
              [timeDomain.start, threshold.value]
            ],
            areaStyle: {
              opacity: 1, // Opacity is already in the color
              color: alarmColor
            },
            lineStyle: {
              type: 'dashed',
              width: 1,
              color: threshold.severity === 'CRITICAL' ? '#ff3b30' : 
                     threshold.severity === 'WARNING' ? '#ff9500' : '#007aff',
              opacity: 0.5
            },
            symbol: 'none',
            silent: true,
            z: 1,
            legendHoverLink: false,
            tooltip: { show: false },
            animation: false
          });
        }
      });
    });
  }
  
  /**
   * Get Y-axis max value for a grid
   */
  private getYAxisMax(options: any, gridIndex: number): number | null {
    if (!options.yAxis?.[gridIndex]) return null;
    return options.yAxis[gridIndex].max || null;
  }
  
  /**
   * Get Y-axis min value for a grid
   */
  private getYAxisMin(options: any, gridIndex: number): number | null {
    if (!options.yAxis?.[gridIndex]) return null;
    return options.yAxis[gridIndex].min || null;
  }
  
  /**
   * Toggle min/max reference lines visibility
   */
  public toggleMinMaxLines(): void {
    this.minMaxVisible = !this.minMaxVisible;
    
    // Re-render chart
    this.onDataUpdated();
  }
  
  /**
   * Toggle alarm overlay visibility
   */
  public toggleAlarmStatus(): void {
    this.alarmStatusVisible = !this.alarmStatusVisible;
    
    if (this.alarmStatusVisible && !this.alarmData && !this.alarmFetchPromise) {
      // First time - fetch alarms
      this.alarmFetchPromise = this.fetchAlarmsForDevices();
    } else {
      // Just toggle visibility
      this.onDataUpdated();
    }
  }

}