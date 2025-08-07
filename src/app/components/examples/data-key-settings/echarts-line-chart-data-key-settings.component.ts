import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { AppState } from '@core/core.state';

export interface EchartsLineChartDataKeySettings {
  chartType?: string;
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
      axisAssignment: 'Top',
      numberOfDigits: 1,
      bottomPlotAssigment: 'S-100'
    };
  }

  protected onSettingsSet(settings: EchartsLineChartDataKeySettings): void {
    this.dataKeySettingsForm = this.fb.group({
      chartType: [settings.chartType || 'Line', [Validators.required]],
      axisAssignment: [settings.axisAssignment || 'Top', [Validators.required]],
      numberOfDigits: [settings.numberOfDigits || 1, [Validators.required]],
      bottomPlotAssigment: [settings.bottomPlotAssigment || 'S-100', [Validators.required]]
    });
  }

  protected settingsForm(): FormGroup {
    return this.dataKeySettingsForm;
  }
}