///
/// Copyright © 2023 ThingsBoard, Inc.
///

import { NgModule } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import addCustomWidgetLocale from './locale/custom-widget-locale.constant';
import { CommonModule } from '@angular/common';
import { WidgetsModule } from './components/widgets/widgets.module';
import { addLibraryStyles } from './scss/lib-styles';

@NgModule({
  declarations: [],
  imports: [
    CommonModule
  ],
  exports: [
    WidgetsModule
  ]
})
export class ThingsboardExtensionWidgetsModule {

  constructor(translate: TranslateService) {
    addCustomWidgetLocale(translate);
    addLibraryStyles('tb-extension-css');
  }

}
