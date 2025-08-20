import { Component } from '@angular/core';
import { FormBuilder, FormGroup, FormArray, Validators } from '@angular/forms';
import { AppState } from '@core/public-api';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';

export interface EchartsLineChartSettings extends WidgetSettings {
  // General Settings
  smooth?: boolean;
  showlegend?: boolean;
  legendcolortext?: string;
  
  // Design Settings
  yAxisLabelLines?: 1 | 2 | 3;  // Number of lines for Y-axis labels
  colorScheme?: 'default' | 'dark' | 'vibrant' | 'pastel' | 'monochrome';
  
  // Y-Axis Settings
  yAxisLeftTitle?: string;
  yAxisLeftUnit?: string;
  yAxisLeftAutoScale?: boolean;
  yAxisLeftMinScale?: number;
  yAxisLeftMaxScale?: number;
  yAxisRightTitle?: string;
  yAxisRightUnit?: string;
  yAxisRightAutoScale?: boolean;
  yAxisRightMinScale?: number;
  yAxisRightMaxScale?: number;
  yAxisRightColorChoser?: string;
  
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
  
  // Debug & Performance
  debugOutput?: boolean;
  useLazyLoading?: boolean;
}

@Component({
  selector: 'tb-echarts-line-chart-settings',
  templateUrl: './echarts-line-chart-settings.component.html',
  styleUrls: ['./echarts-line-chart-settings.component.scss']
})
export class EchartsLineChartSettingsComponent extends WidgetSettingsComponent {

  public echartsLineChartSettingsForm: FormGroup;

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder
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
      yAxisLeftTitle: '',
      yAxisLeftUnit: 'ml',
      yAxisLeftAutoScale: true,
      yAxisLeftMinScale: 0,
      yAxisLeftMaxScale: 100,
      yAxisRightTitle: '',
      yAxisRightUnit: '',
      yAxisRightAutoScale: true,
      yAxisRightMinScale: 0,
      yAxisRightMaxScale: 100,
      yAxisRightColorChoser: '#F44336',
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
      debugOutput: false,
      useLazyLoading: true
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
      
      // Graph Settings
      smooth: [settings.smooth],
      yAxisLeftTitle: [settings.yAxisLeftTitle || ''],
      yAxisLeftUnit: [settings.yAxisLeftUnit || 'ml'],
      yAxisLeftAutoScale: [settings.yAxisLeftAutoScale !== false],
      yAxisLeftMinScale: [settings.yAxisLeftMinScale || 0],
      yAxisLeftMaxScale: [settings.yAxisLeftMaxScale || 100],
      yAxisRightTitle: [settings.yAxisRightTitle || ''],
      yAxisRightUnit: [settings.yAxisRightUnit || ''],
      yAxisRightAutoScale: [settings.yAxisRightAutoScale !== false],
      yAxisRightMinScale: [settings.yAxisRightMinScale || 0],
      yAxisRightMaxScale: [settings.yAxisRightMaxScale || 100],
      yAxisRightColorChoser: [settings.yAxisRightColorChoser || '#F44336'],
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
      
      // Debug & Performance
      debugOutput: [settings.debugOutput],
      useLazyLoading: [settings.useLazyLoading !== false]
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
}