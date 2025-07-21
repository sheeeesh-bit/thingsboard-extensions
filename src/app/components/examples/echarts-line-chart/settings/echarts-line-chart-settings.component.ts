import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AppState } from '@core/public-api';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';

export interface EchartsLineChartSettings extends WidgetSettings {
  title?: string;
  smooth?: boolean;
  enableDataZoom?: boolean;
  showDebugInfo?: boolean;
  numberOfPlots?: number;
  plot1Title?: string;
  plot2Title?: string;
  plot3Title?: string;
  plot4Title?: string;
  plot5Title?: string;
  plot6Title?: string;
  plot7Title?: string;
  
  // Alarm & Threshold Settings
  showAlarmViolationAreas?: boolean;
  alarmAreaOpacity?: number;
  alarmAreaColor?: string;
  showAlarmThresholdLines?: boolean;
  alarmLineStyle?: 'solid' | 'dashed' | 'dotted';
  
  // Statistics Settings
  showInlineStats?: boolean;
  statsPosition?: 'top' | 'bottom' | 'left' | 'right';
  statsCards?: {
    showMin?: boolean;
    showMax?: boolean;
    showAverage?: boolean;
    showCurrent?: boolean;
    showStdDev?: boolean;
  };
  
  // Visual Enhancement Settings
  showMinMaxLines?: boolean;
  minMaxLineStyle?: 'solid' | 'dashed' | 'dotted';
  minMaxLineOpacity?: number;
  showDataPoints?: boolean;
  animationDuration?: number;
  
  // Export Settings
  enableImageExport?: boolean;
  exportFormat?: 'png' | 'jpeg' | 'svg';
  exportQuality?: number;
  
  // Grid & Layout Settings
  showGridLines?: boolean;
  gridOpacity?: number;
  chartMargins?: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
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
      title: 'Time Series Chart',
      smooth: true,
      enableDataZoom: true,
      showDebugInfo: false,
      numberOfPlots: 1,
      plot1Title: 'Plot 1',
      plot2Title: 'Plot 2',
      plot3Title: 'Plot 3',
      plot4Title: 'Plot 4',
      plot5Title: 'Plot 5',
      plot6Title: 'Plot 6',
      plot7Title: 'Plot 7',
      
      // Alarm & Threshold Settings
      showAlarmViolationAreas: false,
      alarmAreaOpacity: 0.3,
      alarmAreaColor: 'rgba(255, 0, 0, 0.1)',
      showAlarmThresholdLines: false,
      alarmLineStyle: 'dashed',
      
      // Statistics Settings
      showInlineStats: true,
      statsPosition: 'right',
      statsCards: {
        showMin: true,
        showMax: true,
        showAverage: true,
        showCurrent: true,
        showStdDev: false
      },
      
      // Visual Enhancement Settings
      showMinMaxLines: false,
      minMaxLineStyle: 'dashed',
      minMaxLineOpacity: 0.5,
      showDataPoints: false,
      animationDuration: 300,
      
      // Export Settings
      enableImageExport: true,
      exportFormat: 'png',
      exportQuality: 0.92,
      
      // Grid & Layout Settings
      showGridLines: true,
      gridOpacity: 0.1,
      chartMargins: {
        top: 60,
        right: 80,
        bottom: 60,
        left: 80
      }
    };
  }

  protected onSettingsSet(settings: EchartsLineChartSettings): void {
    this.echartsLineChartSettingsForm = this.fb.group({
      title: [settings.title, []],
      smooth: [settings.smooth, []],
      enableDataZoom: [settings.enableDataZoom, []],
      showDebugInfo: [settings.showDebugInfo, []],
      numberOfPlots: [settings.numberOfPlots, [Validators.required, Validators.min(1), Validators.max(7)]],
      plot1Title: [settings.plot1Title, []],
      plot2Title: [settings.plot2Title, []],
      plot3Title: [settings.plot3Title, []],
      plot4Title: [settings.plot4Title, []],
      plot5Title: [settings.plot5Title, []],
      plot6Title: [settings.plot6Title, []],
      plot7Title: [settings.plot7Title, []],
      
      // Alarm & Threshold Settings
      showAlarmViolationAreas: [settings.showAlarmViolationAreas, []],
      alarmAreaOpacity: [settings.alarmAreaOpacity, [Validators.min(0), Validators.max(1)]],
      alarmAreaColor: [settings.alarmAreaColor, []],
      showAlarmThresholdLines: [settings.showAlarmThresholdLines, []],
      alarmLineStyle: [settings.alarmLineStyle, []],
      
      // Statistics Settings
      showInlineStats: [settings.showInlineStats, []],
      statsPosition: [settings.statsPosition, []],
      statsCards: this.fb.group({
        showMin: [settings.statsCards?.showMin ?? true, []],
        showMax: [settings.statsCards?.showMax ?? true, []],
        showAverage: [settings.statsCards?.showAverage ?? true, []],
        showCurrent: [settings.statsCards?.showCurrent ?? true, []],
        showStdDev: [settings.statsCards?.showStdDev ?? false, []]
      }),
      
      // Visual Enhancement Settings
      showMinMaxLines: [settings.showMinMaxLines, []],
      minMaxLineStyle: [settings.minMaxLineStyle, []],
      minMaxLineOpacity: [settings.minMaxLineOpacity, [Validators.min(0), Validators.max(1)]],
      showDataPoints: [settings.showDataPoints, []],
      animationDuration: [settings.animationDuration, [Validators.min(0)]],
      
      // Export Settings
      enableImageExport: [settings.enableImageExport, []],
      exportFormat: [settings.exportFormat, []],
      exportQuality: [settings.exportQuality, [Validators.min(0), Validators.max(1)]],
      
      // Grid & Layout Settings
      showGridLines: [settings.showGridLines, []],
      gridOpacity: [settings.gridOpacity, [Validators.min(0), Validators.max(1)]],
      chartMargins: this.fb.group({
        top: [settings.chartMargins?.top ?? 60, [Validators.min(0)]],
        right: [settings.chartMargins?.right ?? 80, [Validators.min(0)]],
        bottom: [settings.chartMargins?.bottom ?? 60, [Validators.min(0)]],
        left: [settings.chartMargins?.left ?? 80, [Validators.min(0)]]
      })
    });
  }

  protected settingsForm(): FormGroup {
    return this.echartsLineChartSettingsForm;
  }

  get numberOfPlots(): number {
    return this.echartsLineChartSettingsForm.get('numberOfPlots')?.value || 1;
  }
}