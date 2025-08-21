import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SettingsDialogData {
  colorScheme: string;
  sidebarCollapsedMode: 'hidden' | 'colors';
  minMaxVisible?: boolean;
  minMaxStyle?: 'dashed' | 'solid' | 'dotted';
  minMaxColor?: string;
  minMaxLineWidth?: number;
  alarmStatusVisible?: boolean;
  alarmOpacity?: number;
  alarmShowCritical?: boolean;
  alarmShowWarning?: boolean;
  alarmShowInfo?: boolean;
}

@Component({
  selector: 'tb-echarts-settings-dialog',
  template: `
    <div class="apple-dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">Settings</h2>
        <button class="close-btn" (click)="onCancel()">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1L13 13M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      
      <div class="dialog-content">
        <!-- Color Scheme Section -->
        <div class="settings-card">
          <div class="card-header">
            <div class="icon-wrapper color-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.19 0 2.34-.21 3.41-.6.3-.11.49-.4.49-.72 0-.43-.35-.78-.78-.78-.17 0-.33.06-.46.11-.91.32-1.85.49-2.66.49-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8c0 .81-.17 1.75-.49 2.66-.05.13-.11.29-.11.46 0 .43.35.78.78.78.32 0 .61-.19.72-.49.39-1.07.6-2.22.6-3.41 0-5.52-4.48-10-10-10z" fill="currentColor"/>
                <circle cx="8" cy="12" r="2" fill="#FF6B6B"/>
                <circle cx="12" cy="8" r="2" fill="#4ECDC4"/>
                <circle cx="16" cy="12" r="2" fill="#45B7D1"/>
                <circle cx="12" cy="16" r="2" fill="#96CEB4"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">Color Scheme</h3>
              <p class="card-subtitle">Choose your preferred color palette</p>
            </div>
          </div>
          
          <div class="color-options">
            <div class="color-option" 
                 [class.selected]="data.colorScheme === 'default'"
                 (click)="data.colorScheme = 'default'">
              <div class="color-preview">
                <span class="color-dot" style="background: #007aff"></span>
                <span class="color-dot" style="background: #ff9500"></span>
                <span class="color-dot" style="background: #34c759"></span>
                <span class="color-dot" style="background: #5856d6"></span>
              </div>
              <span class="color-label">Default</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'dark'"
                 (click)="data.colorScheme = 'dark'">
              <div class="color-preview">
                <span class="color-dot" style="background: #1e3a8a"></span>
                <span class="color-dot" style="background: #7c2d12"></span>
                <span class="color-dot" style="background: #14532d"></span>
                <span class="color-dot" style="background: #581c87"></span>
              </div>
              <span class="color-label">Dark</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'vibrant'"
                 (click)="data.colorScheme = 'vibrant'">
              <div class="color-preview">
                <span class="color-dot" style="background: #ff006e"></span>
                <span class="color-dot" style="background: #fb5607"></span>
                <span class="color-dot" style="background: #ffbe0b"></span>
                <span class="color-dot" style="background: #8338ec"></span>
              </div>
              <span class="color-label">Vibrant</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'pastel'"
                 (click)="data.colorScheme = 'pastel'">
              <div class="color-preview">
                <span class="color-dot" style="background: #ffd6ff"></span>
                <span class="color-dot" style="background: #e7c6ff"></span>
                <span class="color-dot" style="background: #c8b6ff"></span>
                <span class="color-dot" style="background: #b8c0ff"></span>
              </div>
              <span class="color-label">Pastel</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'monochrome'"
                 (click)="data.colorScheme = 'monochrome'">
              <div class="color-preview">
                <span class="color-dot" style="background: #001f3f"></span>
                <span class="color-dot" style="background: #003366"></span>
                <span class="color-dot" style="background: #004080"></span>
                <span class="color-dot" style="background: #0059b3"></span>
              </div>
              <span class="color-label">Monochrome</span>
            </div>
          </div>
        </div>
        
        <!-- Sidebar Mode Section -->
        <div class="settings-card">
          <div class="card-header">
            <div class="icon-wrapper sidebar-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" stroke-width="2"/>
                <line x1="9" y1="3" x2="9" y2="21" stroke="currentColor" stroke-width="2"/>
                <circle cx="6" cy="7" r="1" fill="#007aff"/>
                <circle cx="6" cy="10" r="1" fill="#ff9500"/>
                <circle cx="6" cy="13" r="1" fill="#34c759"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">Sidebar When Collapsed</h3>
              <p class="card-subtitle">How the sidebar appears when minimized</p>
            </div>
          </div>
          
          <div class="sidebar-options">
            <label class="sidebar-option" [class.selected]="data.sidebarCollapsedMode === 'hidden'">
              <input type="radio" name="sidebarMode" value="hidden" 
                     [(ngModel)]="data.sidebarCollapsedMode">
              <div class="option-content">
                <div class="option-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="2" y="4" width="28" height="24" rx="2" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2 2" opacity="0.3"/>
                    <path d="M12 16L20 16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    <path d="M16 12L16 20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  </svg>
                </div>
                <span class="option-label">Hidden</span>
              </div>
            </label>
            
            <label class="sidebar-option" [class.selected]="data.sidebarCollapsedMode === 'colors'">
              <input type="radio" name="sidebarMode" value="colors" 
                     [(ngModel)]="data.sidebarCollapsedMode">
              <div class="option-content">
                <div class="option-icon">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                    <rect x="2" y="4" width="6" height="24" rx="1" fill="#f0f0f0"/>
                    <circle cx="5" cy="8" r="2" fill="#007aff"/>
                    <circle cx="5" cy="14" r="2" fill="#ff9500"/>
                    <circle cx="5" cy="20" r="2" fill="#34c759"/>
                    <rect x="10" y="4" width="20" height="24" rx="2" stroke="currentColor" stroke-width="1.5" opacity="0.3"/>
                  </svg>
                </div>
                <span class="option-label">Colors</span>
              </div>
            </label>
            
          </div>
        </div>
        
        <!-- Min/Max Lines Section -->
        <div class="settings-card">
          <div class="card-header">
            <div class="icon-wrapper minmax-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-dasharray="4 2"/>
                <path d="M3 6H21" stroke="#007aff" stroke-width="2" stroke-linecap="round"/>
                <path d="M3 18H21" stroke="#ff3b30" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">Min/Max Reference Lines</h3>
              <p class="card-subtitle">Show minimum and maximum values across all devices</p>
            </div>
          </div>
          
          <div class="settings-controls">
            <div class="toggle-row">
              <label class="toggle-label">Show Min/Max Lines</label>
              <label class="apple-switch">
                <input type="checkbox" [(ngModel)]="data.minMaxVisible">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="control-group" *ngIf="data.minMaxVisible">
              <label class="control-label">Line Style</label>
              <div class="segmented-control">
                <button class="segment" 
                        [class.active]="data.minMaxStyle === 'dashed'"
                        (click)="data.minMaxStyle = 'dashed'">
                  <svg width="24" height="2" viewBox="0 0 24 2">
                    <path d="M0 1H5 M8 1H13 M16 1H21 M24 1H29" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Dashed</span>
                </button>
                <button class="segment"
                        [class.active]="data.minMaxStyle === 'solid'"
                        (click)="data.minMaxStyle = 'solid'">
                  <svg width="24" height="2" viewBox="0 0 24 2">
                    <path d="M0 1H24" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Solid</span>
                </button>
                <button class="segment"
                        [class.active]="data.minMaxStyle === 'dotted'"
                        (click)="data.minMaxStyle = 'dotted'">
                  <svg width="24" height="2" viewBox="0 0 24 2">
                    <path d="M0 1H1 M3 1H4 M6 1H7 M9 1H10 M12 1H13 M15 1H16 M18 1H19 M21 1H22" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Dotted</span>
                </button>
              </div>
            </div>
            
            <div class="control-group" *ngIf="data.minMaxVisible">
              <label class="control-label">Line Width</label>
              <div class="slider-control">
                <input type="range" min="1" max="5" step="1" 
                       [(ngModel)]="data.minMaxLineWidth"
                       class="apple-slider">
                <span class="slider-value">{{data.minMaxLineWidth || 2}}px</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Alarm Overlays Section -->
        <div class="settings-card">
          <div class="card-header">
            <div class="icon-wrapper alarm-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7V11C2 16.55 5.84 21.74 11 22.95C16.16 21.74 22 16.55 22 11V7L12 2Z" 
                      fill="#ff3b30" opacity="0.2"/>
                <path d="M12 9V13M12 17H12.01" stroke="#ff3b30" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <div>
              <h3 class="card-title">Alarm Overlays</h3>
              <p class="card-subtitle">Display alarm thresholds for all devices</p>
            </div>
          </div>
          
          <div class="settings-controls">
            <div class="toggle-row">
              <label class="toggle-label">Show Alarm Overlays</label>
              <label class="apple-switch">
                <input type="checkbox" [(ngModel)]="data.alarmStatusVisible">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="control-group" *ngIf="data.alarmStatusVisible">
              <label class="control-label">Overlay Opacity</label>
              <div class="slider-control">
                <input type="range" min="5" max="30" step="1" 
                       [(ngModel)]="opacityPercent"
                       (input)="data.alarmOpacity = opacityPercent / 100"
                       class="apple-slider">
                <span class="slider-value">{{opacityPercent}}%</span>
              </div>
            </div>
            
            <div class="control-group" *ngIf="data.alarmStatusVisible">
              <label class="control-label">Alarm Severity Levels</label>
              <div class="checkbox-group">
                <label class="apple-checkbox">
                  <input type="checkbox" [(ngModel)]="data.alarmShowCritical">
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">
                    <span class="severity-dot critical"></span>
                    Critical
                  </span>
                </label>
                <label class="apple-checkbox">
                  <input type="checkbox" [(ngModel)]="data.alarmShowWarning">
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">
                    <span class="severity-dot warning"></span>
                    Warning
                  </span>
                </label>
                <label class="apple-checkbox">
                  <input type="checkbox" [(ngModel)]="data.alarmShowInfo">
                  <span class="checkbox-box"></span>
                  <span class="checkbox-label">
                    <span class="severity-dot info"></span>
                    Info
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div class="dialog-footer">
        <button class="btn btn-secondary" (click)="onCancel()">Cancel</button>
        <button class="btn btn-primary" (click)="onApply()">Apply</button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    
    .apple-dialog {
      font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Helvetica Neue", sans-serif;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
    }
    
    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e5e7;
      background: linear-gradient(180deg, #ffffff 0%, #fafafa 100%);
    }
    
    .dialog-title {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
      color: #1d1d1f;
      letter-spacing: -0.01em;
    }
    
    .close-btn {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      color: #86868b;
    }
    
    .close-btn:hover {
      background: #f0f0f0;
      color: #1d1d1f;
    }
    
    .dialog-content {
      padding: 24px;
      max-height: 60vh;
      overflow-y: auto;
      background: #f5f5f7;
    }
    
    .settings-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 16px;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
    
    .settings-card:last-child {
      margin-bottom: 0;
    }
    
    .card-header {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
      align-items: flex-start;
    }
    
    .icon-wrapper {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .color-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    
    .sidebar-icon {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }
    
    .card-title {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1d1d1f;
      letter-spacing: -0.01em;
    }
    
    .card-subtitle {
      margin: 0;
      font-size: 13px;
      color: #86868b;
      line-height: 1.4;
    }
    
    /* Color Options */
    .color-options {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 12px;
    }
    
    .color-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 12px 8px;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      background: #f5f5f7;
    }
    
    .color-option:hover {
      background: #ebebed;
      transform: translateY(-2px);
    }
    
    .color-option.selected {
      background: white;
      border-color: #007aff;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    
    .color-preview {
      display: flex;
      gap: 4px;
    }
    
    .color-dot {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: transform 0.2s ease;
    }
    
    .color-option:hover .color-dot {
      transform: scale(1.1);
    }
    
    .color-label {
      font-size: 12px;
      font-weight: 500;
      color: #1d1d1f;
      text-align: center;
    }
    
    /* Sidebar Options */
    .sidebar-options {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
    }
    
    .sidebar-option {
      position: relative;
      cursor: pointer;
    }
    
    .sidebar-option input[type="radio"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    
    .option-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 16px 8px;
      border-radius: 10px;
      border: 2px solid transparent;
      background: #f5f5f7;
      transition: all 0.2s ease;
    }
    
    .sidebar-option:hover .option-content {
      background: #ebebed;
      transform: translateY(-2px);
    }
    
    .sidebar-option.selected .option-content {
      background: white;
      border-color: #007aff;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    
    .option-icon {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .option-label {
      font-size: 12px;
      font-weight: 500;
      color: #1d1d1f;
    }
    
    /* Footer */
    .dialog-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px;
      background: white;
      border-top: 1px solid #e5e5e7;
    }
    
    .btn {
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      border: none;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: inherit;
      letter-spacing: -0.01em;
    }
    
    .btn-secondary {
      background: #f5f5f7;
      color: #1d1d1f;
    }
    
    .btn-secondary:hover {
      background: #e8e8ea;
    }
    
    .btn-primary {
      background: #007aff;
      color: white;
    }
    
    .btn-primary:hover {
      background: #0051d5;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    }
    
    /* Scrollbar Styling */
    .dialog-content::-webkit-scrollbar {
      width: 6px;
    }
    
    .dialog-content::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .dialog-content::-webkit-scrollbar-thumb {
      background: #c4c4c6;
      border-radius: 3px;
    }
    
    .dialog-content::-webkit-scrollbar-thumb:hover {
      background: #86868b;
    }
    
    /* New Apple-style Controls */
    .minmax-icon {
      background: linear-gradient(135deg, #007aff, #5856d6);
      color: white;
    }
    
    .alarm-icon {
      background: linear-gradient(135deg, #ff3b30, #ff6482);
      color: white;
    }
    
    .settings-controls {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }
    
    .toggle-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 0;
      border-bottom: 1px solid #e5e5e7;
    }
    
    .toggle-label {
      font-size: 14px;
      font-weight: 500;
      color: #1d1d1f;
    }
    
    /* Apple-style toggle switch */
    .apple-switch {
      position: relative;
      display: inline-block;
      width: 51px;
      height: 31px;
    }
    
    .apple-switch input {
      opacity: 0;
      width: 0;
      height: 0;
    }
    
    .apple-switch .slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: #c7c7cc;
      transition: .3s;
      border-radius: 31px;
    }
    
    .apple-switch .slider:before {
      position: absolute;
      content: "";
      height: 27px;
      width: 27px;
      left: 2px;
      bottom: 2px;
      background-color: white;
      transition: .3s;
      border-radius: 50%;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .apple-switch input:checked + .slider {
      background-color: #34c759;
    }
    
    .apple-switch input:checked + .slider:before {
      transform: translateX(20px);
    }
    
    .control-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .control-label {
      font-size: 13px;
      font-weight: 600;
      color: #86868b;
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    
    /* Segmented Control */
    .segmented-control {
      display: flex;
      background: #f2f2f7;
      border-radius: 9px;
      padding: 2px;
      gap: 2px;
    }
    
    .segment {
      flex: 1;
      padding: 8px 12px;
      border: none;
      background: transparent;
      border-radius: 7px;
      font-size: 13px;
      font-weight: 500;
      color: #1d1d1f;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
    }
    
    .segment:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    
    .segment.active {
      background: white;
      box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
    }
    
    .segment svg {
      height: 12px;
      width: auto;
    }
    
    /* Slider Control */
    .slider-control {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .apple-slider {
      flex: 1;
      -webkit-appearance: none;
      appearance: none;
      height: 6px;
      background: #e5e5e7;
      border-radius: 3px;
      outline: none;
    }
    
    .apple-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }
    
    .apple-slider::-webkit-slider-thumb:hover {
      transform: scale(1.1);
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
    }
    
    .apple-slider::-moz-range-thumb {
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      transition: all 0.2s ease;
    }
    
    .slider-value {
      min-width: 40px;
      font-size: 13px;
      font-weight: 500;
      color: #1d1d1f;
      text-align: right;
    }
    
    /* Checkbox Group */
    .checkbox-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .apple-checkbox {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      position: relative;
    }
    
    .apple-checkbox input[type="checkbox"] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    
    .checkbox-box {
      width: 22px;
      height: 22px;
      border: 2px solid #c7c7cc;
      border-radius: 6px;
      background: white;
      transition: all 0.2s ease;
      position: relative;
    }
    
    .apple-checkbox input:checked ~ .checkbox-box {
      background: #007aff;
      border-color: #007aff;
    }
    
    .apple-checkbox input:checked ~ .checkbox-box:after {
      content: '';
      position: absolute;
      left: 7px;
      top: 3px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    
    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 500;
      color: #1d1d1f;
    }
    
    .severity-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    
    .severity-dot.critical {
      background: #ff3b30;
    }
    
    .severity-dot.warning {
      background: #ff9500;
    }
    
    .severity-dot.info {
      background: #007aff;
    }
  `]
})
export class EchartsSettingsDialogComponent {
  opacityPercent: number;
  
  constructor(
    public dialogRef: MatDialogRef<EchartsSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SettingsDialogData
  ) {
    // Initialize default values if not provided
    this.data.minMaxVisible = this.data.minMaxVisible ?? false;
    this.data.minMaxStyle = this.data.minMaxStyle ?? 'dashed';
    this.data.minMaxColor = this.data.minMaxColor ?? 'rgba(128, 128, 128, 0.5)';
    this.data.minMaxLineWidth = this.data.minMaxLineWidth ?? 2;
    
    this.data.alarmStatusVisible = this.data.alarmStatusVisible ?? false;
    this.data.alarmOpacity = this.data.alarmOpacity ?? 0.12;
    this.data.alarmShowCritical = this.data.alarmShowCritical ?? true;
    this.data.alarmShowWarning = this.data.alarmShowWarning ?? true;
    this.data.alarmShowInfo = this.data.alarmShowInfo ?? false;
    
    // Convert opacity to percentage for slider
    this.opacityPercent = Math.round((this.data.alarmOpacity ?? 0.12) * 100);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    this.dialogRef.close(this.data);
  }
}