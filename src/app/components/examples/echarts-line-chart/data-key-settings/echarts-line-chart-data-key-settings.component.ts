import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';
import { AppState } from '@core/core.state';

export interface EchartsLineChartDataKeySettings {
  plotIndex?: number;
}

@Component({
  selector: 'tb-echarts-line-chart-data-key-settings',
  templateUrl: './echarts-line-chart-data-key-settings.component.html',
  styleUrls: ['./echarts-line-chart-data-key-settings.component.scss']
})
export class EchartsLineChartDataKeySettingsComponent extends WidgetSettingsComponent {

  public dataKeySettingsForm: FormGroup;
  public plotOptions: Array<{value: number, name: string}> = [];

  constructor(
    protected store: Store<AppState>,
    private fb: FormBuilder
  ) {
    super(store);
  }

  protected defaultSettings(): WidgetSettings {
    return {
      plotIndex: 1
    };
  }

  protected onSettingsSet(settings: EchartsLineChartDataKeySettings): void {
    this.dataKeySettingsForm = this.fb.group({
      plotIndex: [settings.plotIndex || 1, [Validators.required, Validators.min(1), Validators.max(7)]]
    });
    
    // Generate plot options once when settings are set
    this.updatePlotOptions();
  }

  protected settingsForm(): FormGroup {
    return this.dataKeySettingsForm;
  }

  private updatePlotOptions(): void {
    const numberOfPlots = this.widgetConfig?.config?.settings?.numberOfPlots || 1;
    this.plotOptions = [];
    for (let i = 1; i <= Math.min(numberOfPlots, 7); i++) {
      const plotTitle = this.widgetConfig?.config?.settings?.[`plot${i}Title`] || `Plot ${i}`;
      this.plotOptions.push({
        value: i,
        name: plotTitle
      });
    }
  }

  public getPlotIcon(plotNumber: number): string {
    const icons = ['', 'looks_one', 'looks_two', 'looks_3', 'looks_4', 'looks_5', 'looks_6', 'filter_7'];
    return icons[plotNumber] || 'looks_one';
  }

  public getSelectedPlotName(): string {
    const plotIndex = this.dataKeySettingsForm?.get('plotIndex')?.value;
    const selected = this.plotOptions.find(opt => opt.value === plotIndex);
    return selected ? selected.name : 'Select a plot';
  }

  public selectPlot(plotIndex: number): void {
    this.dataKeySettingsForm.patchValue({ plotIndex });
  }
}