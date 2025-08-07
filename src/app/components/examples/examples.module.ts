import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/public-api';
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule
} from '@home/components/public-api';
import { MatMenuModule } from '@angular/material/menu';
import { EchartsLineChartComponent } from './echarts-line-chart.component';
import { EchartsLineChartSettingsComponent } from './settings/echarts-line-chart-settings.component';
import { EchartsLineChartDataKeySettingsComponent } from './data-key-settings/echarts-line-chart-data-key-settings.component';

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
    WidgetConfigComponentsModule,
    MatMenuModule
  ],
  exports: [
    EchartsLineChartComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent
  ]
})

export class ExamplesModule {
}
