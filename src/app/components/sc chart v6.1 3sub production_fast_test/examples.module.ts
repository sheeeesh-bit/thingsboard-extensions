import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/public-api';
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule
} from '@home/components/public-api';
import { EchartsLineChartComponent } from './echarts-line-chart/echarts-line-chart.component';
import { EchartsLineChartSettingsComponent } from './echarts-line-chart/settings/echarts-line-chart-settings.component';
import { EchartsLineChartDataKeySettingsComponent } from './echarts-line-chart/data-key-settings/echarts-line-chart-data-key-settings.component';

@NgModule({
  declarations: [
    EchartsLineChartComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule
  ],
  exports: [
    EchartsLineChartComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent
  ]
})

export class ExamplesModule {
}
