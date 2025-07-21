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
      plot7Title: 'Plot 7'
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
      plot7Title: [settings.plot7Title, []]
    });
  }

  protected settingsForm(): FormGroup {
    return this.echartsLineChartSettingsForm;
  }

  get numberOfPlots(): number {
    return this.echartsLineChartSettingsForm.get('numberOfPlots')?.value || 1;
  }
}