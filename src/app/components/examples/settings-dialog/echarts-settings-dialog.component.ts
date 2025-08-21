import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SettingsDialogData {
  colorScheme: string;
  sidebarCollapsedMode: 'hidden' | 'colors';
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
  `]
})
export class EchartsSettingsDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<EchartsSettingsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: SettingsDialogData
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onApply(): void {
    this.dialogRef.close(this.data);
  }
}