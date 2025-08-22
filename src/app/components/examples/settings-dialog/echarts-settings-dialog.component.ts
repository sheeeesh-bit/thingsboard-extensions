import { Component, Inject, AfterViewInit, OnDestroy } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

// Declare Coloris as global variable (loaded from CDN)
declare const Coloris: any;

export interface SettingsDialogData {
  colorScheme: string;
  sidebarCollapsedMode: 'hidden' | 'colors';
  minMaxVisible?: boolean;
  minMaxStyle?: 'dashed' | 'solid' | 'dotted';
  minMaxColor?: string;
  minColor?: string;
  maxColor?: string;
  minMaxLineWidth?: number;
  alarmStatusVisible?: boolean;
  alarmOpacity?: number;
  alarmShowCritical?: boolean;
  alarmShowWarning?: boolean;
  alarmShowInfo?: boolean;
  alarmLinesVisible?: boolean;
  alarmLineStyle?: 'dashed' | 'solid' | 'dotted';
  alarmLineWidth?: number;
  alarmMinColor?: string;
  alarmMaxColor?: string;
  showAlarmOverlayInDialog?: boolean;
  showAlarmLinesInDialog?: boolean;
  showMinMaxInDialog?: boolean;
}

@Component({
  selector: 'tb-echarts-settings-dialog',
  template: `
    <div class="apple-dialog">
      <div class="dialog-header">
        <h2 class="dialog-title">Settings</h2>
        <button class="close-btn" (click)="onCancel()" 
                aria-label="Close dialog"
                title="Close without saving">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
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
          
          <div class="color-scheme-selector">
            <div class="color-option" 
                 [class.selected]="data.colorScheme === 'default'"
                 (click)="data.colorScheme = 'default'">
              <div class="color-preview">
                <span class="color-dot" style="background: #007aff"></span>
                <span class="color-dot" style="background: #ff9500"></span>
                <span class="color-dot" style="background: #34c759"></span>
              </div>
              <span class="color-name">Default</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'dark'"
                 (click)="data.colorScheme = 'dark'">
              <div class="color-preview">
                <span class="color-dot" style="background: #1e3a8a"></span>
                <span class="color-dot" style="background: #7c2d12"></span>
                <span class="color-dot" style="background: #14532d"></span>
              </div>
              <span class="color-name">Dark</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'vibrant'"
                 (click)="data.colorScheme = 'vibrant'">
              <div class="color-preview">
                <span class="color-dot" style="background: #ff006e"></span>
                <span class="color-dot" style="background: #fb5607"></span>
                <span class="color-dot" style="background: #ffbe0b"></span>
              </div>
              <span class="color-name">Vibrant</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'pastel'"
                 (click)="data.colorScheme = 'pastel'">
              <div class="color-preview">
                <span class="color-dot" style="background: #ffd6ff"></span>
                <span class="color-dot" style="background: #e7c6ff"></span>
                <span class="color-dot" style="background: #c8b6ff"></span>
              </div>
              <span class="color-name">Pastel</span>
            </div>
            
            <div class="color-option"
                 [class.selected]="data.colorScheme === 'monochrome'"
                 (click)="data.colorScheme = 'monochrome'">
              <div class="color-preview">
                <span class="color-dot" style="background: #001f3f"></span>
                <span class="color-dot" style="background: #003366"></span>
                <span class="color-dot" style="background: #004080"></span>
              </div>
              <span class="color-name">Mono</span>
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
          
          <div class="modern-sidebar-options">
            <button type="button" 
                    class="sidebar-mode-btn"
                    [class.active]="data.sidebarCollapsedMode === 'hidden'"
                    (click)="data.sidebarCollapsedMode = 'hidden'">
              <div class="mode-preview">
                <div class="preview-sidebar hidden">
                  <div class="sidebar-indicator"></div>
                </div>
                <div class="preview-content">
                  <div class="content-line"></div>
                  <div class="content-line short"></div>
                  <div class="content-line"></div>
                </div>
              </div>
              <span class="mode-label">Hidden</span>
              <span class="mode-description">Completely hide sidebar</span>
            </button>
            
            <button type="button"
                    class="sidebar-mode-btn"
                    [class.active]="data.sidebarCollapsedMode === 'colors'"
                    (click)="data.sidebarCollapsedMode = 'colors'">
              <div class="mode-preview">
                <div class="preview-sidebar colors">
                  <div class="color-dot" style="background: #007aff"></div>
                  <div class="color-dot" style="background: #ff9500"></div>
                  <div class="color-dot" style="background: #34c759"></div>
                </div>
                <div class="preview-content">
                  <div class="content-line"></div>
                  <div class="content-line short"></div>
                  <div class="content-line"></div>
                </div>
              </div>
              <span class="mode-label">Color Strip</span>
              <span class="mode-description">Show only color indicators</span>
            </button>
          </div>
        </div>
        
        <!-- Min/Max Lines Section -->
        <div class="settings-card" *ngIf="data.showMinMaxInDialog !== false">
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
                  <svg width="16" height="2" viewBox="0 0 16 2">
                    <path d="M0 1H3 M5 1H8 M10 1H13 M15 1H16" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Dashed</span>
                </button>
                <button class="segment"
                        [class.active]="data.minMaxStyle === 'solid'"
                        (click)="data.minMaxStyle = 'solid'">
                  <svg width="16" height="2" viewBox="0 0 16 2">
                    <path d="M0 1H16" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Solid</span>
                </button>
                <button class="segment"
                        [class.active]="data.minMaxStyle === 'dotted'"
                        (click)="data.minMaxStyle = 'dotted'">
                  <svg width="16" height="2" viewBox="0 0 16 2">
                    <path d="M0 1H1 M3 1H4 M6 1H7 M9 1H10 M12 1H13 M15 1H16" stroke="currentColor" stroke-width="1.5"/>
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
            
            <div class="control-group" *ngIf="data.minMaxVisible">
              <label class="control-label">Line Colors</label>
              <div class="modern-color-picker-group">
                <div class="color-picker-item">
                  <div class="color-swatch" [style.background]="data.minColor"></div>
                  <div class="color-info">
                    <span class="color-label">Minimum</span>
                    <input type="text" 
                           [(ngModel)]="data.minColor"
                           class="coloris-input"
                           data-coloris>
                  </div>
                </div>
                
                <div class="color-picker-item">
                  <div class="color-swatch" [style.background]="data.maxColor"></div>
                  <div class="color-info">
                    <span class="color-label">Maximum</span>
                    <input type="text" 
                           [(ngModel)]="data.maxColor"
                           class="coloris-input"
                           data-coloris>
                  </div>
                </div>
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
            <div class="toggle-row" *ngIf="data.showAlarmOverlayInDialog !== false">
              <label class="toggle-label">Show Alarm Overlays</label>
              <label class="apple-switch">
                <input type="checkbox" [(ngModel)]="data.alarmStatusVisible">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="control-group" *ngIf="data.alarmStatusVisible && data.showAlarmOverlayInDialog !== false">
              <label class="control-label">Overlay Opacity</label>
              <div class="slider-control">
                <input type="range" min="5" max="30" step="1" 
                       [(ngModel)]="opacityPercent"
                       (input)="onOpacityChange()"
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
            
            <!-- Alarm Lines Section -->
            <div *ngIf="data.showAlarmLinesInDialog !== false">
              <div class="divider-line"></div>
              
              <div class="toggle-row">
              <label class="toggle-label">Show Alarm Lines</label>
              <label class="apple-switch">
                <input type="checkbox" [(ngModel)]="data.alarmLinesVisible">
                <span class="slider"></span>
              </label>
            </div>
            
            <div class="control-group" *ngIf="data.alarmLinesVisible">
              <label class="control-label">Line Style</label>
              <div class="segmented-control">
                <button class="segment" 
                        [class.active]="data.alarmLineStyle === 'dashed'"
                        (click)="data.alarmLineStyle = 'dashed'">
                  <svg width="16" height="2" viewBox="0 0 16 2">
                    <path d="M0 1H3 M5 1H8 M10 1H13 M15 1H16" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Dashed</span>
                </button>
                <button class="segment"
                        [class.active]="data.alarmLineStyle === 'solid'"
                        (click)="data.alarmLineStyle = 'solid'">
                  <svg width="16" height="2" viewBox="0 0 16 2">
                    <path d="M0 1H16" stroke="currentColor" stroke-width="2"/>
                  </svg>
                  <span>Solid</span>
                </button>
                <button class="segment"
                        [class.active]="data.alarmLineStyle === 'dotted'"
                        (click)="data.alarmLineStyle = 'dotted'">
                  <svg width="16" height="2" viewBox="0 0 16 2">
                    <path d="M0 1H1 M3 1H4 M6 1H7 M9 1H10 M12 1H13 M15 1H16" stroke="currentColor" stroke-width="1.5"/>
                  </svg>
                  <span>Dotted</span>
                </button>
              </div>
            </div>
            
            <div class="control-group" *ngIf="data.alarmLinesVisible">
              <label class="control-label">Line Width</label>
              <div class="slider-control">
                <input type="range" min="1" max="5" step="1" 
                       [(ngModel)]="data.alarmLineWidth"
                       class="apple-slider">
                <span class="slider-value">{{data.alarmLineWidth || 2}}px</span>
              </div>
            </div>
            
            <div class="control-group" *ngIf="data.alarmLinesVisible">
              <label class="control-label">Alarm Line Colors</label>
              <div class="modern-color-picker-group">
                <div class="color-picker-item">
                  <div class="color-swatch" [style.background]="data.alarmMinColor"></div>
                  <div class="color-info">
                    <span class="color-label">Min Threshold</span>
                    <input type="text" 
                           [(ngModel)]="data.alarmMinColor"
                           class="coloris-input"
                           data-coloris>
                  </div>
                </div>
                
                <div class="color-picker-item">
                  <div class="color-swatch" [style.background]="data.alarmMaxColor"></div>
                  <div class="color-info">
                    <span class="color-label">Max Threshold</span>
                    <input type="text" 
                           [(ngModel)]="data.alarmMaxColor"
                           class="coloris-input"
                           data-coloris>
                  </div>
                </div>
              </div>
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
      overflow-x: hidden;
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
    
    /* Color Scheme Selector */
    .color-scheme-selector {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .color-option {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      border: 2px solid transparent;
      background: #f5f5f7;
      justify-content: space-between;
    }
    
    .color-option:hover {
      background: #ebebed;
      transform: translateY(-1px);
    }
    
    .color-option.selected {
      background: white;
      border-color: #007aff;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    
    .color-option.selected .color-name {
      color: #007aff;
      font-weight: 600;
    }
    
    .color-option .color-preview {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    
    .color-dot {
      display: inline-block;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
      transition: transform 0.2s ease;
      flex-shrink: 0;
      border: 1px solid rgba(0, 0, 0, 0.08);
    }
    
    .color-option:hover .color-dot {
      transform: scale(1.05);
    }
    
    .color-name {
      font-size: 14px;
      font-weight: 500;
      color: #1d1d1f;
      margin-left: 12px;
    }
    
    /* Sidebar Options */
    /* Modern Sidebar Options */
    .modern-sidebar-options {
      display: flex;
      gap: 12px;
      padding: 12px 0;
    }
    
    .sidebar-mode-btn {
      flex: 1;
      padding: 16px;
      background: linear-gradient(180deg, #ffffff 0%, #f9f9fb 100%);
      border: 2px solid #e5e5e7;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    
    .sidebar-mode-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      border-color: #007aff;
    }
    
    .sidebar-mode-btn.active {
      background: linear-gradient(180deg, #007aff 0%, #0051d5 100%);
      border-color: #0051d5;
      box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
    }
    
    .sidebar-mode-btn.active .mode-label,
    .sidebar-mode-btn.active .mode-description {
      color: white;
    }
    
    .mode-preview {
      width: 100%;
      height: 60px;
      background: #f5f5f7;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      gap: 6px;
      position: relative;
    }
    
    .sidebar-mode-btn.active .mode-preview {
      background: rgba(255, 255, 255, 0.2);
    }
    
    .preview-sidebar {
      width: 20px;
      border-radius: 4px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    
    .preview-sidebar.hidden {
      border: 2px dashed rgba(0, 0, 0, 0.2);
      opacity: 0.3;
    }
    
    .preview-sidebar.colors {
      background: white;
      padding: 4px;
    }
    
    .preview-sidebar .color-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
    }
    
    .preview-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      gap: 4px;
      padding: 0 4px;
    }
    
    .content-line {
      height: 3px;
      background: rgba(0, 0, 0, 0.15);
      border-radius: 2px;
    }
    
    .content-line.short {
      width: 60%;
    }
    
    .mode-label {
      font-size: 14px;
      font-weight: 600;
      color: #1d1d1f;
    }
    
    .mode-description {
      font-size: 11px;
      color: #86868b;
      text-align: center;
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
    .dialog-content::-webkit-scrollbar,
    .color-scheme-selector::-webkit-scrollbar {
      width: 6px;
    }
    
    .dialog-content::-webkit-scrollbar-track,
    .color-scheme-selector::-webkit-scrollbar-track {
      background: transparent;
    }
    
    .dialog-content::-webkit-scrollbar-thumb,
    .color-scheme-selector::-webkit-scrollbar-thumb {
      background: #c4c4c6;
      border-radius: 3px;
    }
    
    .dialog-content::-webkit-scrollbar-thumb:hover,
    .color-scheme-selector::-webkit-scrollbar-thumb:hover {
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
      min-width: 70px;
      padding: 6px 8px;
      border: none;
      background: transparent;
      border-radius: 7px;
      font-size: 11px;
      font-weight: 500;
      color: #1d1d1f;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      white-space: nowrap;
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
    
    /* Enhanced Apple Styling */
    .settings-card {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    .settings-card:hover {
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transform: translateY(-2px);
    }
    
    .icon-wrapper {
      position: relative;
      overflow: hidden;
    }
    
    .icon-wrapper::after {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent);
      transform: rotate(45deg);
      transition: all 0.6s;
      opacity: 0;
    }
    
    .settings-card:hover .icon-wrapper::after {
      animation: shimmer 0.6s ease-in-out;
    }
    
    @keyframes shimmer {
      0% {
        transform: translateX(-100%) translateY(-100%) rotate(45deg);
        opacity: 0;
      }
      50% {
        opacity: 1;
      }
      100% {
        transform: translateX(100%) translateY(100%) rotate(45deg);
        opacity: 0;
      }
    }
    
    /* Smooth transitions for all interactive elements */
    .color-option, .sidebar-option .option-content, .segment, .apple-switch .slider,
    .apple-slider::-webkit-slider-thumb, .checkbox-box, .btn {
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    
    /* Focus states */
    .segment:focus-visible,
    .btn:focus-visible {
      outline: 2px solid #007aff;
      outline-offset: 2px;
    }
    
    .apple-slider:focus-visible {
      background: linear-gradient(90deg, #007aff 0%, #007aff var(--value, 0%), #e5e5e7 var(--value, 0%), #e5e5e7 100%);
    }
    
    /* Color Picker Controls */
    /* Modern Color Picker */
    .modern-color-picker-group {
      display: flex;
      gap: 12px;
      padding: 8px 0;
    }
    
    .color-picker-item {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px;
      background: linear-gradient(180deg, #ffffff 0%, #f9f9fb 100%);
      border: 1px solid #e5e5e7;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .color-picker-item:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      border-color: #007aff;
    }
    
    .color-swatch {
      width: 40px;
      height: 40px;
      border-radius: 8px;
      box-shadow: 
        0 2px 8px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    
    .color-icon {
      opacity: 0.8;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
    }
    
    .color-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }
    
    .color-label {
      font-size: 13px;
      font-weight: 600;
      color: #1d1d1f;
    }
    
    .color-value {
      font-size: 11px;
      color: #86868b;
      font-family: 'SF Mono', Monaco, monospace;
      text-transform: uppercase;
    }
    
    .coloris-input {
      width: 100%;
      padding: 4px 8px;
      font-size: 11px;
      font-family: 'SF Mono', Monaco, monospace;
      border: 1px solid #e5e5e7;
      border-radius: 6px;
      background: white;
      color: #1d1d1f;
      text-transform: uppercase;
      transition: all 0.2s ease;
      cursor: pointer;
      margin-top: 4px;
    }
    
    .coloris-input:hover {
      border-color: #007aff;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
    }
    
    .coloris-input:focus {
      outline: none;
      border-color: #007aff;
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
    }
    
    /* Coloris picker customizations */
    :global(.clr-picker) {
      border-radius: 12px !important;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15) !important;
    }
    
    :global(.clr-picker.clr-large) {
      width: 280px !important;
    }
    
    :global(.clr-swatches) {
      padding: 12px !important;
    }
    
    :global(.clr-swatch) {
      width: 28px !important;
      height: 28px !important;
      border-radius: 6px !important;
      margin: 4px !important;
    }
    
    .hidden-color-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }
    
    /* Legacy color picker - hide it */
    .color-picker-control {
      display: none;
    }
    
    .apple-color-picker {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      overflow: hidden;
      background: none;
      outline: none;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
    }
    
    .apple-color-picker:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .apple-color-picker:focus {
      box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.2);
    }
    
    /* Removed old color-preview style that was creating phantom boxes */
    
    .color-picker-label {
      font-size: 13px;
      font-weight: 500;
      color: #1d1d1f;
      flex: 1;
    }
    
    .divider-line {
      height: 1px;
      background: #e5e5e7;
      margin: 20px 0;
    }
    
    /* Hide Coloris trigger button that appears on first load */
    button[aria-labelledby="clr-open-label"] {
      display: none !important;
      width: 0 !important;
      height: 0 !important;
      opacity: 0 !important;
      pointer-events: none !important;
    }
    
    /* Also hide the Coloris color preview square that might appear */
    .clr-field button {
      display: none !important;
    }
    
    /* Ensure Coloris wrapper doesn't create extra space */
    .clr-field {
      display: contents;
    }
  `]
})
export class EchartsSettingsDialogComponent implements AfterViewInit, OnDestroy {
  opacityPercent: number;
  hasChanges = false;
  
  constructor(
    public dialogRef: MatDialogRef<EchartsSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SettingsDialogData
  ) {
    // Initialize default values if not provided
    this.data.minMaxVisible = this.data.minMaxVisible ?? false;
    this.data.minMaxStyle = this.data.minMaxStyle ?? 'dashed';
    this.data.minMaxColor = this.validateColor(this.data.minMaxColor) ?? 'rgba(128, 128, 128, 0.5)';
    this.data.minColor = this.validateColor(this.data.minColor) ?? '#ff4757';
    this.data.maxColor = this.validateColor(this.data.maxColor) ?? '#5352ed';
    this.data.minMaxLineWidth = this.clampValue(this.data.minMaxLineWidth ?? 2, 1, 5);
    
    this.data.alarmStatusVisible = this.data.alarmStatusVisible ?? false;
    this.data.alarmOpacity = this.clampValue(this.data.alarmOpacity ?? 0.12, 0, 1);
    this.data.alarmShowCritical = this.data.alarmShowCritical ?? true;
    this.data.alarmShowWarning = this.data.alarmShowWarning ?? true;
    this.data.alarmShowInfo = this.data.alarmShowInfo ?? false;
    
    // Initialize alarm lines settings
    this.data.alarmLinesVisible = this.data.alarmLinesVisible ?? false;
    this.data.alarmLineStyle = this.data.alarmLineStyle ?? 'dashed';
    this.data.alarmLineWidth = this.clampValue(this.data.alarmLineWidth ?? 2, 1, 5);
    this.data.alarmMinColor = this.validateColor(this.data.alarmMinColor) ?? '#ff9500';
    this.data.alarmMaxColor = this.validateColor(this.data.alarmMaxColor) ?? '#ff3b30';
    
    // Convert opacity to percentage for slider
    this.opacityPercent = Math.round((this.data.alarmOpacity ?? 0.12) * 100);
  }
  
  private validateColor(color: string | undefined): string | undefined {
    if (!color) return undefined;
    // Basic color validation - check if it's a valid hex or rgba color
    const hexRegex = /^#([0-9A-Fa-f]{3}){1,2}$/;
    const rgbaRegex = /^rgba?\([\d\s,\.]+\)$/;
    if (hexRegex.test(color) || rgbaRegex.test(color)) {
      return color;
    }
    return undefined;
  }
  
  private clampValue(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  onOpacityChange(): void {
    // Convert percentage back to decimal with validation
    const clampedPercent = this.clampValue(this.opacityPercent || 12, 5, 30);
    this.opacityPercent = clampedPercent;
    this.data.alarmOpacity = clampedPercent / 100;
    this.hasChanges = true;
  }
  
  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    // Validate all values before applying
    this.data.minMaxLineWidth = this.clampValue(this.data.minMaxLineWidth || 2, 1, 5);
    this.data.alarmLineWidth = this.clampValue(this.data.alarmLineWidth || 2, 1, 5);
    this.data.alarmOpacity = this.clampValue(this.data.alarmOpacity || 0.12, 0.05, 0.3);
    
    this.dialogRef.close(this.data);
  }
  
  ngAfterViewInit(): void {
    // Load Coloris from CDN with fallback
    setTimeout(() => {
      this.loadColoris();
    }, 100);
  }

  private loadColoris(): void {
    // Check if Coloris is already loaded
    if (typeof Coloris !== 'undefined' && Coloris) {
      this.initializeColoris();
      return;
    }

    // Add Coloris CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://cdn.jsdelivr.net/gh/mdbassit/Coloris@latest/dist/coloris.min.css';
    document.head.appendChild(cssLink);

    // Add Coloris JS
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/gh/mdbassit/Coloris@latest/dist/coloris.min.js';
    script.onload = () => {
      // Wait a bit for Coloris to fully initialize
      setTimeout(() => {
        if (typeof Coloris !== 'undefined' && Coloris) {
          this.initializeColoris();
        } else {
          console.warn('Coloris loaded but not available');
          this.setupFallbackColorInputs();
        }
      }, 100);
    };
    script.onerror = () => {
      console.warn('Failed to load Coloris from CDN, falling back to native color inputs');
      this.setupFallbackColorInputs();
    };
    document.head.appendChild(script);
  }

  private initializeColoris(): void {
    if (typeof Coloris === 'undefined') {
      this.setupFallbackColorInputs();
      return;
    }

    try {
      // Wait a bit more for DOM to be fully ready
      setTimeout(() => {
        // Initialize all visible color inputs
        const allInputs = document.querySelectorAll('.coloris-input') as NodeListOf<HTMLInputElement>;
        
        allInputs.forEach((input) => {
          // Check if input is visible
          const isVisible = input.offsetParent !== null;
          
          if (isVisible) {
            // Initialize Coloris for this specific input
            Coloris({
              el: input,
              theme: 'large',
              themeMode: 'light',
              alpha: true,
              format: 'hex',
              wrap: false,  // Prevent creating wrapper elements
              swatches: [
                '#007aff',
                '#ff3b30',
                '#ff9500',
                '#34c759',
                '#5352ed',
                '#ff4757',
                '#ffa502',
                '#2ed573',
                '#747d8c',
                '#57606f'
              ],
              closeButton: true,
              clearButton: false
            });
            
            // Mark as initialized
            input.setAttribute('data-coloris-initialized', 'true');
            
            // Add change listener
            const changeHandler = () => {
              const parent = input.closest('.color-picker-item');
              if (parent) {
                const swatch = parent.querySelector('.color-swatch') as HTMLElement;
                if (swatch && input.value) {
                  swatch.style.background = input.value;
                }
              }
              this.hasChanges = true;
            };
            
            input.removeEventListener('change', changeHandler);
            input.addEventListener('change', changeHandler);
            
            // Also listen for the Coloris-specific event
            input.removeEventListener('input', changeHandler);
            input.addEventListener('input', changeHandler);
          }
        });
        
        // Re-initialize Coloris when visibility changes to catch dynamically shown inputs
        this.setupVisibilityObserver();
      }, 200);
    } catch (error) {
      console.warn('Error initializing Coloris:', error);
      this.setupFallbackColorInputs();
    }
  }

  private setupVisibilityObserver(): void {
    // Create a MutationObserver to watch for visibility changes
    const observer = new MutationObserver(() => {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Re-initialize Coloris for any newly visible inputs
        if (typeof Coloris !== 'undefined') {
          const inputs = document.querySelectorAll('.coloris-input:not([data-coloris-initialized])') as NodeListOf<HTMLInputElement>;
          
          inputs.forEach(input => {
            // Check if input is actually visible
            const isVisible = input.offsetParent !== null;
            
            if (isVisible) {
              // Initialize Coloris for this specific input
              Coloris({
                el: input,
                theme: 'large',
                themeMode: 'light',
                alpha: true,
                format: 'hex',
                wrap: false,  // Prevent creating wrapper elements
                swatches: [
                  '#007aff',
                  '#ff3b30',
                  '#ff9500',
                  '#34c759',
                  '#5352ed',
                  '#ff4757',
                  '#ffa502',
                  '#2ed573',
                  '#747d8c',
                  '#57606f'
                ],
                closeButton: true,
                clearButton: false
              });
              
              // Mark as initialized
              input.setAttribute('data-coloris-initialized', 'true');
              
              // Add change listener for new inputs
              const changeHandler = () => {
                const parent = input.closest('.color-picker-item');
                if (parent) {
                  const swatch = parent.querySelector('.color-swatch') as HTMLElement;
                  if (swatch && input.value) {
                    swatch.style.background = input.value;
                  }
                }
                this.hasChanges = true;
              };
              
              input.removeEventListener('change', changeHandler);
              input.addEventListener('change', changeHandler);
              input.removeEventListener('input', changeHandler);
              input.addEventListener('input', changeHandler);
            }
          });
        }
      }, 50);
    });

    // Observe the dialog content for changes
    const dialogContent = document.querySelector('.dialog-content');
    if (dialogContent) {
      observer.observe(dialogContent, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class']
      });

      // Store observer for cleanup
      (this as any).visibilityObserver = observer;
    }
  }

  private setupFallbackColorInputs(): void {
    // Convert text inputs to native color inputs as fallback
    const inputs = document.querySelectorAll('.coloris-input:not([data-fallback-initialized])') as NodeListOf<HTMLInputElement>;
    inputs.forEach((input) => {
      // Check if input is visible
      const isVisible = input.offsetParent !== null;
      
      if (isVisible) {
        // Mark as initialized to prevent double initialization
        input.setAttribute('data-fallback-initialized', 'true');
        
        // Create a native color input
        const colorInput = document.createElement('input');
        colorInput.type = 'color';
        colorInput.value = this.convertToHex(input.value) || '#000000';
        colorInput.className = 'native-color-input';
        colorInput.style.width = '100%';
        colorInput.style.height = '32px';
        colorInput.style.border = '1px solid #e5e5e7';
        colorInput.style.borderRadius = '6px';
        colorInput.style.cursor = 'pointer';
        colorInput.style.marginTop = '4px';
        
        // Add change handler
        colorInput.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          input.value = target.value;
          
          const parent = input.closest('.color-picker-item');
          if (parent) {
            const swatch = parent.querySelector('.color-swatch') as HTMLElement;
            if (swatch) {
              swatch.style.background = target.value;
            }
          }
          
          // Update the data model
          const inputName = input.getAttribute('ng-reflect-name');
          if (inputName && this.data[inputName as keyof SettingsDialogData] !== undefined) {
            (this.data as any)[inputName] = target.value;
          }
          
          this.hasChanges = true;
        });
        
        // Replace text input with color input
        input.style.display = 'none';
        input.parentNode?.insertBefore(colorInput, input.nextSibling);
      }
    });
  }

  private convertToHex(color: string): string | null {
    if (!color) return null;
    
    // If already hex, return as is
    if (color.startsWith('#')) {
      return color.length === 7 ? color : null;
    }
    
    // Convert rgba to hex (simplified, doesn't handle alpha)
    if (color.startsWith('rgba') || color.startsWith('rgb')) {
      const matches = color.match(/\d+/g);
      if (matches && matches.length >= 3) {
        const r = parseInt(matches[0]).toString(16).padStart(2, '0');
        const g = parseInt(matches[1]).toString(16).padStart(2, '0');
        const b = parseInt(matches[2]).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    }
    
    return null;
  }
  
  ngOnDestroy(): void {
    // Clean up MutationObserver
    if ((this as any).visibilityObserver) {
      (this as any).visibilityObserver.disconnect();
    }
    
    // Clean up Coloris if available
    try {
      if (typeof Coloris !== 'undefined') {
        Coloris.close();
      }
    } catch {
      // Coloris not available
    }
  }
}