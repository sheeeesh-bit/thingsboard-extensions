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
      warningMessage: 'Before capturing:\n\n• Move your MOUSE/CURSOR to the edge of the screen or outside the window\n• Please don\'t scroll or use your keyboard during capture\n• Disable rotation for 3D widgets (use stop rotation button)\n• Make sure all animations are paused\n• Position widgets as needed\n\nClick "Start Capture" when ready, then keep your mouse still at the edge!'
    };
  }

  protected onSettingsSet(settings: WidgetSettings) {
    this.screenshotWidgetSettingsForm = this.fb.group({
      widgetTitle: [settings.widgetTitle, []],
      showDebugInfo: [settings.showDebugInfo, []],
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
      warningMessage: [settings.warningMessage, []]
    });
  }

  protected doUpdateSettings(settingsForm: UntypedFormGroup, settings: WidgetSettings) {
    settings.widgetTitle = settingsForm.value.widgetTitle;
    settings.showDebugInfo = settingsForm.value.showDebugInfo;
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
    settings.warningMessage = settingsForm.value.warningMessage;
    return settings;
  }
}
