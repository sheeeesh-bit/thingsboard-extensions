import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnInit,
  ViewChild,
  OnDestroy,
  ChangeDetectorRef
} from '@angular/core';
import * as echarts from 'echarts/core';
import { WidgetContext } from '@home/models/widget-component.models';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

// Services
import { ChartManagementService } from '../../services/chart-management.service';
import { DataProcessingService } from '../../services/data-processing.service';
import { ExportService } from '../../services/export.service';
import { ErrorHandlingService } from '../../services/error-handling.service';

// Interfaces
import {
  ChartDimensions,
  SeriesData,
  EntityInfo,
  LegendState,
  ChartState,
  ComponentState,
  ChartError,
  ExportFormat,
  PerformanceMetrics
} from '../../interfaces/chart.interfaces';

// Settings Dialog
import { EchartsSettingsDialogComponent } from './settings-dialog/echarts-settings-dialog.component';

@Component({
  selector: 'tb-echarts-line-chart-refactored',
  templateUrl: './echarts-line-chart.component.html',
  styleUrls: ['./echarts-line-chart.component.scss']
})
export class EchartsLineChartRefactoredComponent implements OnInit, AfterViewInit, OnDestroy {
  
  @Input() ctx: WidgetContext;
  @ViewChild('chartContainer', { static: true }) chartContainer: ElementRef<HTMLElement>;
  @ViewChild('legendOverlay', { static: false }) legendOverlay: ElementRef<HTMLElement>;
  @ViewChild('zoomOverlay', { static: false }) zoomOverlay: ElementRef<HTMLElement>;

  // Component state
  componentState: ComponentState = {
    chartState: {
      isInitialized: false,
      isLoading: false,
      hasData: false,
      currentGridCount: 1,
      containerSize: 'small'
    },
    legendState: {
      currentPage: 0,
      totalPages: 1,
      itemsPerPage: 10,
      needsPagination: false,
      hasMorePages: false,
      items: [],
      pageItems: []
    },
    entityList: [],
    selectedSeries: new Set<string>(),
    performanceMetrics: {
      totalDataPoints: 0,
      renderTime: 0,
      interactionTime: 0
    },
    errors: []
  };

  // UI state
  isSidebarVisible = true;
  sidebarWidth = 250;
  sidebarDisplayMode: 'full' | 'compact' | 'colors' = 'full';
  sidebarCollapsedMode: 'hidden' | 'colors' = 'colors';
  showExportOptions = false;
  isExporting = false;
  lastPulsedEntity: string | null = null;
  lastPulsedLabel: string | null = null;

  // Subscriptions
  private subscriptions = new Subscription();
  private resizeObserver: ResizeObserver | null = null;

  constructor(
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef,
    private chartService: ChartManagementService,
    private dataService: DataProcessingService,
    private exportService: ExportService,
    private errorService: ErrorHandlingService
  ) {
    // Register error boundary
    this.errorService.registerErrorBoundary('EchartsLineChartComponent');
  }

  ngOnInit(): void {
    try {
      this.initializeComponent();
    } catch (error) {
      this.handleError('initialization', 'Component initialization failed', error);
    }
  }

  ngAfterViewInit(): void {
    try {
      // Check lazy loading setting
      const useLazyLoading = this.ctx.settings?.useLazyLoading !== false;
      
      if (useLazyLoading) {
        this.initializeLazyLoading();
      } else {
        this.initializeImmediate();
      }
      
      this.setupFullscreenListener();
    } catch (error) {
      this.handleError('initialization', 'AfterViewInit failed', error);
    }
  }

  ngOnDestroy(): void {
    try {
      this.cleanup();
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  }

  /**
   * Initialize component state
   */
  private initializeComponent(): void {
    // Extract entity information
    this.componentState.entityList = this.dataService.extractEntityInfo(this.ctx);
    
    // Initialize selected series (all visible by default)
    this.componentState.entityList.forEach(entity => {
      if (entity.visible) {
        this.componentState.selectedSeries.add(entity.name);
      }
    });

    // Set up error boundary
    this.errorService.setErrorBoundary('EchartsLineChartComponent', (error, errorInfo) => {
      this.handleError('rendering', 'Error boundary caught error', error);
    });
  }

  /**
   * Initialize with lazy loading
   */
  private initializeLazyLoading(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            observer.disconnect();
            this.initializeImmediate();
          }
        });
      }, {
        root: null,
        rootMargin: '50px',
        threshold: 0.1
      });
      
      observer.observe(this.chartContainer.nativeElement);
    } else {
      this.initializeImmediate();
    }
  }

  /**
   * Initialize immediately
   */
  private initializeImmediate(): void {
    setTimeout(() => {
      try {
        this.initChart();
        this.setupResizeObserver();
        this.updateZoomOverlay();
        this.exposeToThingsBoard();
        
        this.componentState.chartState.isInitialized = true;
      } catch (error) {
        this.handleError('initialization', 'Immediate initialization failed', error);
      }
    }, 100);
  }

  /**
   * Initialize ECharts instance
   */
  private initChart(): void {
    try {
      this.componentState.chart = this.chartService.initializeChart(
        this.chartContainer.nativeElement,
        this.ctx
      );

      // Set up chart event listeners
      this.setupChartEventListeners();
      
      // Load initial data
      this.loadChartData();

    } catch (error) {
      this.handleError('initialization', 'Chart initialization failed', error);
    }
  }

  /**
   * Load and process chart data
   */
  private loadChartData(): void {
    try {
      if (!this.componentState.chart) {
        throw new Error('Chart not initialized');
      }

      const startTime = performance.now();
      
      // Process data using service
      const seriesData = this.dataService.processWidgetData(this.ctx);
      
      // Validate data integrity
      if (!this.dataService.validateDataIntegrity(seriesData)) {
        throw new Error('Data integrity validation failed');
      }

      // Update chart with processed data
      this.chartService.updateChartData(
        this.componentState.chart,
        seriesData,
        this.ctx
      );

      // Update component state
      this.componentState.chartState.hasData = seriesData.length > 0;
      this.componentState.performanceMetrics = {
        totalDataPoints: seriesData.reduce((sum, s) => sum + s.data.length, 0),
        renderTime: performance.now() - startTime,
        interactionTime: 0
      };

      // Log performance metrics
      this.errorService.logPerformanceWarning(this.componentState.performanceMetrics);

      this.cdr.detectChanges();

    } catch (error) {
      this.handleError('data', 'Failed to load chart data', error);
    }
  }

  /**
   * Set up chart event listeners
   */
  private setupChartEventListeners(): void {
    if (!this.componentState.chart) return;

    try {
      // Legend selection events
      this.componentState.chart.on('legendselectchanged', (params: unknown) => {
        this.handleLegendSelectChanged(params);
      });

      // Data zoom events
      this.componentState.chart.on('datazoom', (params: unknown) => {
        this.handleDataZoom(params);
      });

      // Mouse events for interaction logging
      this.componentState.chart.on('click', (params: unknown) => {
        this.handleChartClick(params);
      });

    } catch (error) {
      this.handleError('initialization', 'Failed to setup chart event listeners', error);
    }
  }

  /**
   * Handle legend selection changes
   */
  private handleLegendSelectChanged(params: unknown): void {
    try {
      const p = params as { name: string; selected: Record<string, boolean> };
      
      // Update selected series
      if (p.selected[p.name]) {
        this.componentState.selectedSeries.add(p.name);
      } else {
        this.componentState.selectedSeries.delete(p.name);
      }

      // Update entity visibility
      const entity = this.componentState.entityList.find(e => e.name === p.name);
      if (entity) {
        entity.visible = p.selected[p.name];
      }

      this.cdr.detectChanges();

    } catch (error) {
      this.handleError('rendering', 'Legend selection handling failed', error);
    }
  }

  /**
   * Handle data zoom events
   */
  private handleDataZoom(params: unknown): void {
    try {
      const p = params as { start: number; end: number };
      this.componentState.chartState.zoomRange = [p.start, p.end];
      
      // Update zoom overlay if needed
      this.updateZoomOverlay();

    } catch (error) {
      this.handleError('rendering', 'Data zoom handling failed', error);
    }
  }

  /**
   * Handle chart click events
   */
  private handleChartClick(params: unknown): void {
    try {
      const p = params as { seriesName: string; dataIndex: number };
      console.log('Chart clicked:', { series: p.seriesName, dataIndex: p.dataIndex });

    } catch (error) {
      this.handleError('rendering', 'Chart click handling failed', error);
    }
  }

  /**
   * Set up resize observer
   */
  private setupResizeObserver(): void {
    try {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            this.onResize();
          }
        }
      });
      
      this.resizeObserver.observe(this.chartContainer.nativeElement);

    } catch (error) {
      this.handleError('initialization', 'Resize observer setup failed', error);
    }
  }

  /**
   * Handle resize events
   */
  onResize(): void {
    try {
      if (this.componentState.chart) {
        this.chartService.resizeChart(this.componentState.chart);
      }
      this.updateZoomOverlay();

    } catch (error) {
      this.handleError('resize', 'Resize handling failed', error);
    }
  }

  /**
   * Data update from ThingsBoard
   */
  public onDataUpdated(): void {
    try {
      // Check if we have real data
      const totalDataPoints = this.ctx.data?.reduce((sum, series) => 
        sum + (series.data?.length || 0), 0) || 0;
      
      if (totalDataPoints === 0) {
        if (this.componentState.chart) {
          this.componentState.chart.showLoading({ text: 'Waiting for data...' });
        }
        return;
      }

      // Reload chart data
      this.loadChartData();

    } catch (error) {
      this.handleError('data', 'Data update failed', error);
    }
  }

  /**
   * Export data in specified format
   */
  async exportData(format: ExportFormat): Promise<void> {
    try {
      this.isExporting = true;
      this.cdr.detectChanges();

      // Generate export data
      const exportData = await this.exportService.generateExportData(
        this.ctx,
        Array.from(this.componentState.selectedSeries)
      );

      // Export based on format
      switch (format) {
        case 'csv':
          await this.exportService.exportToCSV(exportData);
          break;
        case 'xls':
        case 'xlsx':
          await this.exportService.exportToExcel(exportData, format);
          break;
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }

    } catch (error) {
      this.handleError('export', `Export to ${format} failed`, error);
    } finally {
      this.isExporting = false;
      this.showExportOptions = false;
      this.cdr.detectChanges();
    }
  }

  /**
   * Reset zoom to show all data
   */
  resetZoom(): void {
    try {
      if (this.componentState.chart) {
        this.chartService.resetZoom(this.componentState.chart);
        this.componentState.chartState.zoomRange = undefined;
      }
    } catch (error) {
      this.handleError('rendering', 'Reset zoom failed', error);
    }
  }

  /**
   * Toggle sidebar visibility
   */
  toggleSidebar(): void {
    try {
      this.isSidebarVisible = !this.isSidebarVisible;
      setTimeout(() => this.onResize(), 100);
    } catch (error) {
      this.handleError('rendering', 'Sidebar toggle failed', error);
    }
  }

  /**
   * Toggle entity visibility
   */
  toggleEntityVisibility(entityName: string): void {
    try {
      const entity = this.componentState.entityList.find(e => e.name === entityName);
      if (!entity) return;

      entity.visible = !entity.visible;
      
      if (entity.visible) {
        this.componentState.selectedSeries.add(entityName);
      } else {
        this.componentState.selectedSeries.delete(entityName);
      }

      // Reload chart data to reflect changes
      this.loadChartData();

    } catch (error) {
      this.handleError('rendering', 'Entity visibility toggle failed', error);
    }
  }

  /**
   * Open settings dialog
   */
  openSettingsDialog(): void {
    try {
      const dialogRef = this.dialog.open(EchartsSettingsDialogComponent, {
        width: '800px',
        data: { settings: this.ctx.settings }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result) {
          // Settings were updated, reload chart
          this.loadChartData();
        }
      });

    } catch (error) {
      this.handleError('rendering', 'Settings dialog failed', error);
    }
  }

  /**
   * Handle menu button actions
   */
  menuButtons(action: string): void {
    try {
      switch (action) {
        case 'genImage':
          this.generateImage();
          break;
        case 'reset':
          this.resetZoom();
          break;
        default:
          console.warn('Unknown menu action:', action);
      }
    } catch (error) {
      this.handleError('rendering', `Menu action ${action} failed`, error);
    }
  }

  /**
   * Generate and download chart image
   */
  private generateImage(): void {
    try {
      if (!this.componentState.chart) return;

      const dataURL = this.componentState.chart.getDataURL({
        type: 'png',
        backgroundColor: '#fff'
      });

      const link = document.createElement('a');
      link.download = 'chart.png';
      link.href = dataURL;
      link.click();

    } catch (error) {
      this.handleError('export', 'Image generation failed', error);
    }
  }

  /**
   * Update zoom overlay position (stub implementation)
   */
  private updateZoomOverlay(): void {
    // TODO: Implement zoom overlay positioning
  }

  /**
   * Setup fullscreen listener (stub implementation) 
   */
  private setupFullscreenListener(): void {
    // TODO: Implement fullscreen change detection
  }

  /**
   * Expose component to ThingsBoard bridge
   */
  private exposeToThingsBoard(): void {
    if (this.ctx.$scope) {
      this.ctx.$scope.echartsLineChartComponent = this;
      
      if (typeof this.ctx.$scope.componentReady === 'function') {
        this.ctx.$scope.componentReady();
      }
    }
  }

  /**
   * Handle errors with recovery strategies
   */
  private handleError(type: ChartError['type'], message: string, error: unknown): void {
    const chartError: ChartError = {
      type,
      message,
      details: error instanceof Error ? error.message : String(error),
      timestamp: Date.now(),
      recovery: () => {
        // Attempt to recover based on error type
        switch (type) {
          case 'initialization':
            this.initializeImmediate();
            break;
          case 'data':
            this.loadChartData();
            break;
          case 'rendering':
            this.onResize();
            break;
          default:
            console.warn('No recovery strategy for error type:', type);
        }
      }
    };

    this.componentState.errors.push(chartError);
    this.errorService.handleError(chartError);
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    // Unsubscribe from all subscriptions
    this.subscriptions.unsubscribe();

    // Cleanup resize observer
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    // Dispose chart
    if (this.componentState.chart) {
      this.chartService.disposeChart(this.componentState.chart);
    }

    // Clean up ThingsBoard scope reference
    if (this.ctx.$scope && this.ctx.$scope.echartsLineChartComponent === this) {
      delete this.ctx.$scope.echartsLineChartComponent;
    }
  }

  // Computed properties for template
  get hasNoVisibleData(): boolean {
    return !this.componentState.chartState.hasData || 
           this.componentState.selectedSeries.size === 0;
  }

  get getSelectedDeviceCount(): () => number {
    return () => this.componentState.entityList.filter(e => e.visible).length;
  }

  get entityList(): EntityInfo[] {
    return this.componentState.entityList;
  }

  get legendPageItems(): never[] {
    // TODO: Implement legend pagination
    return [];
  }

  get legendNeedsPagination(): boolean {
    // TODO: Implement legend pagination logic
    return false;
  }

  get legendHasMorePages(): boolean {
    // TODO: Implement legend pagination logic
    return false;
  }

  get legendCurrentPage(): number {
    return this.componentState.legendState.currentPage;
  }

  // Template methods (stubs for now)
  legendPrevPage(): void {
    // TODO: Implement legend pagination
  }

  legendNextPage(): void {
    // TODO: Implement legend pagination
  }

  toggleLabel(item: unknown): void {
    // TODO: Implement label toggle
  }

  canTurnOff(label: string): boolean {
    // TODO: Implement turn off logic
    return true;
  }

  startDragHandle(event: unknown, type: string): void {
    // TODO: Implement drag handling for zoom
  }
}