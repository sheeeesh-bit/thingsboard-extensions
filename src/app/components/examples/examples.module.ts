import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
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
import { EchartsLineChartRefactoredComponent } from './echarts-line-chart-refactored.component';
import { EchartsLineChartSettingsComponent } from './settings/echarts-line-chart-settings.component';
import { EchartsLineChartDataKeySettingsComponent } from './data-key-settings/echarts-line-chart-data-key-settings.component';
import { EchartsSettingsDialogComponent } from './settings-dialog/echarts-settings-dialog.component';
import { DebugLoggingDialogComponent } from './debug-dialog/debug-logging-dialog.component';

// Import services
import { ChartManagementService } from '../../services/chart-management.service';
import { DataProcessingService } from '../../services/data-processing.service';
import { ExportService } from '../../services/export.service';
import { ErrorHandlingService } from '../../services/error-handling.service';

@NgModule({
  declarations: [
    EchartsLineChartComponent,
    EchartsLineChartRefactoredComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent,
    EchartsSettingsDialogComponent,
    DebugLoggingDialogComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
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
    EchartsLineChartRefactoredComponent,
    EchartsLineChartSettingsComponent,
    EchartsLineChartDataKeySettingsComponent
  ],
  providers: [
    ChartManagementService,
    DataProcessingService,
    ExportService,
    ErrorHandlingService
  ]
})

export class ExamplesModule {
}
