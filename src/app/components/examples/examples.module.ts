import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SharedModule } from '@shared/public-api';
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule
} from '@home/components/public-api';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialogModule } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { EchartsLineChartComponent } from './echarts-line-chart.component';
import { EchartsLineChartSettingsComponent } from './settings/echarts-line-chart-settings.component';
import { EchartsLineChartDataKeySettingsComponent } from './data-key-settings/echarts-line-chart-data-key-settings.component';
import { EchartsSettingsDialogComponent } from './settings-dialog/echarts-settings-dialog.component';

@NgModule({
  declarations: [
    EchartsLineChartComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent,
    EchartsSettingsDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule,
    MatMenuModule,
    MatDialogModule,
    MatRadioModule
  ],
  exports: [
    EchartsLineChartComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent
  ]
})

export class ExamplesModule {
}
