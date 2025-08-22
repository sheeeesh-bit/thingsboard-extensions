import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AppState } from '@core/public-api';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { MatDialog } from '@angular/material/dialog';
import { DebugLoggingDialogComponent, DebugLoggingDialogData } from '../debug-dialog/debug-logging-dialog.component';

export interface EchartsLineChartSettings extends WidgetSettings {
  // General Settings
  smooth?: boolean;
  showlegend?: boolean;
  legendcolortext?: string;
  
  // Design Settings
  yAxisLabelLines?: 1 | 2 | 3;  // Number of lines for Y-axis labels
  colorScheme?: 'default' | 'dark' | 'vibrant' | 'pastel' | 'monochrome';
  
  // Entity Display Settings
  entityDisplayAttribute?: 'label' | 'deviceName' | 'name' | 'custom';  // Which attribute to show for entities
  customEntityAttribute?: string;  // Custom attribute name if 'custom' is selected
  sidebarDisplayMode?: 'full' | 'compact' | 'colors';  // How to display the sidebar
  
  
  // Data Point Settings
  showDataPoints?: boolean;
  symbolSize_data?: number;
  
  // Export Settings
  exportDecimals?: number;
  
  // Multiple Devices Mode
  multipleDevices?: boolean;
  
  // Pan and Zoom
  showPanZoomTool?: boolean;
  
  // Grid Layout
  grid_layout_right?: number;
  grid_layout_left?: number;
  grid_layout_top?: number;
  grid_layout_bottom?: number;
  markline_layout_left_or_right?: number;
  scrollingStartsAfter?: number;  // Number of plots after which scrolling starts (default: 3)
  
  // Annotations
  annotations?: Array<{
    annotationsType: 'Fixed' | 'Attribute';
    fixedNumber?: number;
    attribute?: string;
    description?: string;
    color: 'Red' | 'Green' | 'Blue' | 'Yellow';
    attributeType: 'Client' | 'Server';
    axisAssignment: 'Left' | 'Right';
  }>;
  
  // Tooltip Settings
  tooltipOnlyHoveredGrid?: boolean;
  tooltipMaxItems?: number;
  tooltipShowAllIfSeriesCountLTE?: number;
  
  // Features - UI Element Visibility
  showImageButton?: boolean;
  showExportButton?: boolean;
  showResetZoomButton?: boolean;
  showEntitySidebar?: boolean;
  showCustomLegend?: boolean;
  showZoomControls?: boolean;
  
  // Min/Max Reference Lines
  minMaxVisible?: boolean;
  minMaxStyle?: 'dashed' | 'solid' | 'dotted';
  minMaxColor?: string;
  minColor?: string;
  maxColor?: string;
  minMaxLineWidth?: number;
  showMinMaxInDialog?: boolean;
  
  // Alarm Overlays
  alarmStatusVisible?: boolean;
  alarmOpacity?: number;
  alarmShowCritical?: boolean;
  alarmShowWarning?: boolean;
  alarmShowInfo?: boolean;
  showAlarmOverlayInDialog?: boolean;
  showAlarmLinesInDialog?: boolean;
  
  // Debug & Performance
  debugOutput?: boolean;
  useLazyLoading?: boolean;
  enableAnimations?: boolean;
  useCanvasRenderer?: boolean;
  enableDataSampling?: boolean;
  maxDataPoints?: number;
  enableProgressiveRendering?: boolean;
  optimizeClickHandling?: boolean;
  deferredUIUpdates?: boolean;
  clickDebounceMs?: number;
  batchEChartsUpdates?: boolean;
  echartsUpdateDelay?: number;
  disableChartAnimationsDuringInteraction?: boolean;
  
  // Debug Logging Settings
  debugNormalLogs?: boolean;
  debugPerformanceLogs?: boolean;
  debugMinMaxLogs?: boolean;
  debugAlarmLogs?: boolean;
}

@Component({
  selector: 'tb-echarts-line-chart-settings',
  templateUrl: './echarts-line-chart-settings.component.html',
  styleUrls: ['./echarts-line-chart-settings.component.scss']
})
export class EchartsLineChartSettingsComponent extends WidgetSettingsComponent {

  public echartsLineChartSettingsForm: FormGroup;
  public Math = Math; // Make Math available in template
  
  // Track which sections are expanded
  public expandedSections: { [key: string]: boolean } = {
    design: true,      // Default expanded
    grid: false,
    tooltip: false,
    export: false,
    ui: false,
    performance: false
  };

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    super(store);
  }

  protected defaultSettings(): WidgetSettings {
    return {
      smooth: false,
      showlegend: false,
      legendcolortext: '#000000',
      yAxisLabelLines: 3,  // Default to 3 lines
      colorScheme: 'default',
      entityDisplayAttribute: 'label',  // Default to label attribute
      customEntityAttribute: '',
      sidebarDisplayMode: 'full',  // Default to full table view
      showDataPoints: false,
      symbolSize_data: 5,
      exportDecimals: 6,
      multipleDevices: false,
      showPanZoomTool: true,
      grid_layout_right: 40,
      grid_layout_left: 130,
      grid_layout_top: 40,
      grid_layout_bottom: 240,
      markline_layout_left_or_right: 285,
      scrollingStartsAfter: 3,
      annotations: [],
      tooltipOnlyHoveredGrid: false,
      tooltipMaxItems: 10,
      tooltipShowAllIfSeriesCountLTE: 0,
      // Features - default all to true (visible)
      showImageButton: true,
      showExportButton: true,
      showResetZoomButton: true,
      showEntitySidebar: true,
      showCustomLegend: true,
      showZoomControls: true,
      // Min/Max Reference Lines
      minMaxVisible: false,
      minMaxStyle: 'dashed',
      minMaxColor: 'rgba(128, 128, 128, 0.5)',
      minColor: '#ff4757',
      maxColor: '#5352ed',
      minMaxLineWidth: 2,
      showMinMaxInDialog: true,
      // Alarm Overlays
      alarmStatusVisible: false,
      alarmOpacity: 0.12,
      alarmShowCritical: true,
      alarmShowWarning: true,
      alarmShowInfo: false,
      showAlarmOverlayInDialog: true,
      showAlarmLinesInDialog: true,
      debugOutput: false,
      useLazyLoading: true,
      enableAnimations: true,
      useCanvasRenderer: false,
      enableDataSampling: true,
      maxDataPoints: 10000,
      enableProgressiveRendering: false,
      optimizeClickHandling: true,
      deferredUIUpdates: true,
      clickDebounceMs: 100,
      batchEChartsUpdates: true,
      echartsUpdateDelay: 50,
      disableChartAnimationsDuringInteraction: true,
      debugNormalLogs: false,
      debugPerformanceLogs: false,
      debugMinMaxLogs: false,
      debugAlarmLogs: false
    };
  }

  protected onSettingsSet(settings: EchartsLineChartSettings): void {
    this.echartsLineChartSettingsForm = this.fb.group({
      // Legend Settings
      showlegend: [settings.showlegend],
      legendcolortext: [settings.legendcolortext || '#000000'],
      
      // Design Settings
      yAxisLabelLines: [settings.yAxisLabelLines || 3],
      colorScheme: [settings.colorScheme || 'default'],
      
      // Entity Display Settings
      entityDisplayAttribute: [settings.entityDisplayAttribute || 'label'],
      customEntityAttribute: [settings.customEntityAttribute || ''],
      sidebarDisplayMode: [settings.sidebarDisplayMode || 'full'],
      
      // Graph Settings
      smooth: [settings.smooth],
      showDataPoints: [settings.showDataPoints],
      symbolSize_data: [settings.symbolSize_data || 5],
      exportDecimals: [settings.exportDecimals || 6],
      multipleDevices: [settings.multipleDevices || false],
      showPanZoomTool: [settings.showPanZoomTool !== false],
      grid_layout_right: [settings.grid_layout_right || 40],
      grid_layout_left: [settings.grid_layout_left || 130],
      grid_layout_top: [settings.grid_layout_top || 40],
      grid_layout_bottom: [settings.grid_layout_bottom || 240],
      markline_layout_left_or_right: [settings.markline_layout_left_or_right || 285],
      scrollingStartsAfter: [settings.scrollingStartsAfter || 3],
      
      // Annotations
      annotations: this.fb.array(this.createAnnotations(settings.annotations || [])),
      
      // Tooltip Settings
      tooltipOnlyHoveredGrid: [settings.tooltipOnlyHoveredGrid || false],
      tooltipMaxItems: [settings.tooltipMaxItems || 10],
      tooltipShowAllIfSeriesCountLTE: [settings.tooltipShowAllIfSeriesCountLTE || 0],
      
      // Features - UI Element Visibility
      showImageButton: [settings.showImageButton !== false],
      showExportButton: [settings.showExportButton !== false],
      showResetZoomButton: [settings.showResetZoomButton !== false],
      showEntitySidebar: [settings.showEntitySidebar !== false],
      showCustomLegend: [settings.showCustomLegend !== false],
      showZoomControls: [settings.showZoomControls !== false],
      
      // Min/Max Reference Lines
      minMaxVisible: [settings.minMaxVisible || false],
      minMaxStyle: [settings.minMaxStyle || 'dashed'],
      minMaxColor: [settings.minMaxColor || 'rgba(128, 128, 128, 0.5)'],
      minColor: [settings.minColor || '#ff4757'],
      maxColor: [settings.maxColor || '#5352ed'],
      minMaxLineWidth: [settings.minMaxLineWidth || 2],
      showMinMaxInDialog: [settings.showMinMaxInDialog !== false],
      
      // Alarm Overlays
      alarmStatusVisible: [settings.alarmStatusVisible || false],
      alarmOpacity: [settings.alarmOpacity || 0.12],
      alarmShowCritical: [settings.alarmShowCritical !== false],
      alarmShowWarning: [settings.alarmShowWarning !== false],
      alarmShowInfo: [settings.alarmShowInfo || false],
      showAlarmOverlayInDialog: [settings.showAlarmOverlayInDialog !== false],
      showAlarmLinesInDialog: [settings.showAlarmLinesInDialog !== false],
      
      // Debug & Performance
      debugOutput: [settings.debugOutput],
      useLazyLoading: [settings.useLazyLoading !== false],
      enableAnimations: [settings.enableAnimations !== false],
      useCanvasRenderer: [settings.useCanvasRenderer || false],
      enableDataSampling: [settings.enableDataSampling !== false],
      maxDataPoints: [settings.maxDataPoints || 10000],
      enableProgressiveRendering: [settings.enableProgressiveRendering || false],
      optimizeClickHandling: [settings.optimizeClickHandling !== false],
      deferredUIUpdates: [settings.deferredUIUpdates !== false],
      clickDebounceMs: [settings.clickDebounceMs || 100],
      batchEChartsUpdates: [settings.batchEChartsUpdates !== false],
      echartsUpdateDelay: [settings.echartsUpdateDelay || 50],
      disableChartAnimationsDuringInteraction: [settings.disableChartAnimationsDuringInteraction !== false],
      
      // Debug Logging Settings
      debugNormalLogs: [settings.debugNormalLogs || false],
      debugPerformanceLogs: [settings.debugPerformanceLogs || false],
      debugMinMaxLogs: [settings.debugMinMaxLogs || false],
      debugAlarmLogs: [settings.debugAlarmLogs || false]
    });
  }

  protected settingsForm(): FormGroup {
    return this.echartsLineChartSettingsForm;
  }

  private createAnnotations(annotations: any[]): FormGroup[] {
    return annotations.map(annotation => this.createAnnotation(annotation));
  }

  private createAnnotation(annotation?: any): FormGroup {
    return this.fb.group({
      annotationsType: [annotation?.annotationsType || 'Fixed', [Validators.required]],
      fixedNumber: [annotation?.fixedNumber || 10],
      attribute: [annotation?.attribute || ''],
      description: [annotation?.description || ''],
      color: [annotation?.color || 'Green', [Validators.required]],
      attributeType: [annotation?.attributeType || 'Client'],
      axisAssignment: [annotation?.axisAssignment || 'Left']
    });
  }

  get annotationsFormArray(): FormArray {
    return this.echartsLineChartSettingsForm.get('annotations') as FormArray;
  }

  addAnnotation(): void {
    this.annotationsFormArray.push(this.createAnnotation());
  }

  removeAnnotation(index: number): void {
    this.annotationsFormArray.removeAt(index);
  }
  
  toggleSection(section: string): void {
    this.expandedSections[section] = !this.expandedSections[section];
  }

  openDebugLoggingDialog(): void {
    const dialogData: DebugLoggingDialogData = {
      normalLogs: this.echartsLineChartSettingsForm.get('debugNormalLogs')?.value || false,
      performanceLogs: this.echartsLineChartSettingsForm.get('debugPerformanceLogs')?.value || false,
      minMaxLogs: this.echartsLineChartSettingsForm.get('debugMinMaxLogs')?.value || false,
      alarmLogs: this.echartsLineChartSettingsForm.get('debugAlarmLogs')?.value || false
    };

    const dialogRef = this.dialog.open(DebugLoggingDialogComponent, {
      width: '500px',
      data: dialogData,
      panelClass: 'debug-dialog-panel'
    });

    dialogRef.afterClosed().subscribe((result: DebugLoggingDialogData) => {
      if (result) {
        this.echartsLineChartSettingsForm.patchValue({
          debugNormalLogs: result.normalLogs,
          debugPerformanceLogs: result.performanceLogs,
          debugMinMaxLogs: result.minMaxLogs,
          debugAlarmLogs: result.alarmLogs
        });
      }
    });
  }
}