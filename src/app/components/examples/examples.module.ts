import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '@shared/public-api';
import {
  BasicWidgetConfigModule,
  HomeComponentsModule,
  WidgetConfigComponentsModule
} from '@home/components/public-api';
import { ScreenshotWidgetComponent } from './screenshot-widget/screenshot-widget.component';
import { ScreenshotWidgetSettingsComponent } from './screenshot-widget/settings/screenshot-widget-settings.component';

@NgModule({
  declarations: [
    ScreenshotWidgetComponent,
    ScreenshotWidgetSettingsComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    HomeComponentsModule,
    BasicWidgetConfigModule,
    WidgetConfigComponentsModule
  ],
  exports: [
    ScreenshotWidgetComponent,
    ScreenshotWidgetSettingsComponent
  ]
})

export class ExamplesModule {
}
