import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { Store } from '@ngrx/store';
import { AppState } from '@core/public-api';
import { WidgetSettings, WidgetSettingsComponent } from '@shared/public-api';

@Component({
  selector: 'tb-screenshot-widget-settings',
  templateUrl: './screenshot-widget-settings.component.html',
  styleUrls: ['./screenshot-widget-settings.component.scss']
})
export class ScreenshotWidgetSettingsComponent extends WidgetSettingsComponent {

  screenshotWidgetSettingsForm: UntypedFormGroup;

  constructor(
    protected store: Store<AppState>,
    protected fb: UntypedFormBuilder
  ) {
    super(store);
  }

  protected settingsForm(): UntypedFormGroup {
    return this.screenshotWidgetSettingsForm;
  }

  protected defaultSettings(): WidgetSettings {
    return {
      widgetTitle: 'Screenshot Widget',
      showDebugInfo: false,
      logContext: false,           // Log widget context on init
      captureMode: 'dashboard',
      customSelector: '',
      scrollIncrement: 1000,
      quality: 0.95,
      format: 'png',
      renderDelay: 1500,           // ms to wait after scroll for rendering
      blockInput: true,            // Block user input during capture
      scrollPreview: false,        // Debug mode: scroll only, no capture
      downloadIndividual: false,   // Download each piece separately (debug)
      bottomCompensation: 95,      // Extra pixels to add to bottom piece (video pixels)
      showWarningDialog: true,     // Show warning dialog before capture
      useDefaultWarning: true,     // Use browser-specific default message
      warningMessage: ''           // Custom message (only used if useDefaultWarning is false)
    };
  }

  protected onSettingsSet(settings: WidgetSettings) {
    this.screenshotWidgetSettingsForm = this.fb.group({
      widgetTitle: [settings.widgetTitle, []],
      showDebugInfo: [settings.showDebugInfo, []],
      logContext: [settings.logContext, []],
      captureMode: [settings.captureMode, []],
      customSelector: [settings.customSelector, []],
      scrollIncrement: [settings.scrollIncrement, []],
      quality: [settings.quality, []],
      format: [settings.format, []],
      renderDelay: [settings.renderDelay, []],
      blockInput: [settings.blockInput, []],
      scrollPreview: [settings.scrollPreview, []],
      downloadIndividual: [settings.downloadIndividual, []],
      bottomCompensation: [settings.bottomCompensation, []],
      showWarningDialog: [settings.showWarningDialog, []],
      useDefaultWarning: [settings.useDefaultWarning !== false, []],
      warningMessage: [settings.warningMessage, []]
    });
  }

  protected doUpdateSettings(settingsForm: UntypedFormGroup, settings: WidgetSettings) {
    settings.widgetTitle = settingsForm.value.widgetTitle;
    settings.showDebugInfo = settingsForm.value.showDebugInfo;
    settings.logContext = settingsForm.value.logContext;
    settings.captureMode = settingsForm.value.captureMode;
    settings.customSelector = settingsForm.value.customSelector;
    settings.scrollIncrement = settingsForm.value.scrollIncrement;
    settings.quality = settingsForm.value.quality;
    settings.format = settingsForm.value.format;
    settings.renderDelay = settingsForm.value.renderDelay;
    settings.blockInput = settingsForm.value.blockInput;
    settings.scrollPreview = settingsForm.value.scrollPreview;
    settings.downloadIndividual = settingsForm.value.downloadIndividual;
    settings.bottomCompensation = settingsForm.value.bottomCompensation;
    settings.showWarningDialog = settingsForm.value.showWarningDialog;
    settings.useDefaultWarning = settingsForm.value.useDefaultWarning;
    settings.warningMessage = settingsForm.value.warningMessage;
    return settings;
  }
}
