import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { AppState } from '@core/core.state';

export interface EchartsLineChartDataKeySettings {
  chartType?: string;
  showAverage?: boolean;
  showMinValue?: boolean;
  showMaxValue?: boolean;
  gradientColor1?: string;
  gradientColor2?: string;
  fillOpacity?: number;
  grid_layout_right?: number;
  grid_layout_left?: number;
  markline_layout_left_or_right?: number;
  fillChart?: boolean;
  axisAssignment?: string;
  numberOfDigits?: number;
  bottomPlotAssigment?: string;
}

@Component({
  selector: 'tb-echarts-line-chart-data-key-settings',
  templateUrl: './echarts-line-chart-data-key-settings.component.html',
  styleUrls: ['./echarts-line-chart-data-key-settings.component.scss']
})
export class EchartsLineChartDataKeySettingsComponent extends WidgetSettingsComponent {

  public dataKeySettingsForm: FormGroup;

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder
  ) {
    super(store);
  }

  protected defaultSettings(): WidgetSettings {
    return {
      chartType: 'Line',
      showAverage: false,
      showMinValue: false,
      showMaxValue: false,
      gradientColor1: '#008a00',
      gradientColor2: '#008a00',
      fillOpacity: 0.5,
      grid_layout_right: 40,
      grid_layout_left: 130,
      markline_layout_left_or_right: 285,
      fillChart: false,
      axisAssignment: 'Top',
      numberOfDigits: 1,
      bottomPlotAssigment: 'S-100'
    };
  }

  protected onSettingsSet(settings: EchartsLineChartDataKeySettings): void {
    this.dataKeySettingsForm = this.fb.group({
      chartType: [settings.chartType || 'Line', [Validators.required]],
      showAverage: [settings.showAverage || false],
      showMinValue: [settings.showMinValue || false],
      showMaxValue: [settings.showMaxValue || false],
      gradientColor1: [settings.gradientColor1 || '#008a00'],
      gradientColor2: [settings.gradientColor2 || '#008a00'],
      fillOpacity: [settings.fillOpacity || 0.5, [Validators.min(0), Validators.max(1)]],
      grid_layout_right: [settings.grid_layout_right || 40],
      grid_layout_left: [settings.grid_layout_left || 130],
      markline_layout_left_or_right: [settings.markline_layout_left_or_right || 285],
      fillChart: [settings.fillChart || false],
      axisAssignment: [settings.axisAssignment || 'Top', [Validators.required]],
      numberOfDigits: [settings.numberOfDigits || 1, [Validators.required]],
      bottomPlotAssigment: [settings.bottomPlotAssigment || 'S-100', [Validators.required]]
    });
  }

  protected settingsForm(): FormGroup {
    return this.dataKeySettingsForm;
  }
}