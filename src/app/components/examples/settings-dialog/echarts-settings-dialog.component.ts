import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface SettingsDialogData {
  colorScheme: string;
  sidebarCollapsedMode: 'hidden' | 'colors' | 'initials';
}

@Component({
  selector: 'tb-echarts-settings-dialog',
  template: `
    <h2 mat-dialog-title>Widget Settings</h2>
    <mat-dialog-content>
      <div class="settings-section">
        <h3>Color Scheme</h3>
        <mat-radio-group [(ngModel)]="data.colorScheme" class="color-scheme-group">
          <mat-radio-button value="default" class="color-scheme-option">
            <span class="scheme-label">Default</span>
            <span class="scheme-preview">
              <span class="color-dot" style="background: #007aff"></span>
              <span class="color-dot" style="background: #ff9500"></span>
              <span class="color-dot" style="background: #34c759"></span>
              <span class="color-dot" style="background: #5856d6"></span>
            </span>
          </mat-radio-button>
          <mat-radio-button value="dark" class="color-scheme-option">
            <span class="scheme-label">Dark</span>
            <span class="scheme-preview">
              <span class="color-dot" style="background: #1e3a8a"></span>
              <span class="color-dot" style="background: #7c2d12"></span>
              <span class="color-dot" style="background: #14532d"></span>
              <span class="color-dot" style="background: #581c87"></span>
            </span>
          </mat-radio-button>
          <mat-radio-button value="vibrant" class="color-scheme-option">
            <span class="scheme-label">Vibrant</span>
            <span class="scheme-preview">
              <span class="color-dot" style="background: #ff006e"></span>
              <span class="color-dot" style="background: #fb5607"></span>
              <span class="color-dot" style="background: #ffbe0b"></span>
              <span class="color-dot" style="background: #8338ec"></span>
            </span>
          </mat-radio-button>
          <mat-radio-button value="pastel" class="color-scheme-option">
            <span class="scheme-label">Pastel</span>
            <span class="scheme-preview">
              <span class="color-dot" style="background: #ffd6ff"></span>
              <span class="color-dot" style="background: #e7c6ff"></span>
              <span class="color-dot" style="background: #c8b6ff"></span>
              <span class="color-dot" style="background: #b8c0ff"></span>
            </span>
          </mat-radio-button>
          <mat-radio-button value="monochrome" class="color-scheme-option">
            <span class="scheme-label">Monochrome</span>
            <span class="scheme-preview">
              <span class="color-dot" style="background: #001f3f"></span>
              <span class="color-dot" style="background: #003366"></span>
              <span class="color-dot" style="background: #004080"></span>
              <span class="color-dot" style="background: #0059b3"></span>
            </span>
          </mat-radio-button>
        </mat-radio-group>
      </div>
      
      <div class="settings-section">
        <h3>Sidebar Collapsed Mode</h3>
        <p class="settings-description">Choose how the sidebar appears when collapsed</p>
        <mat-radio-group [(ngModel)]="data.sidebarCollapsedMode" class="sidebar-mode-group">
          <mat-radio-button value="hidden" class="sidebar-mode-option">
            <span class="mode-label">Completely Hidden</span>
            <span class="mode-description">Sidebar disappears completely when collapsed</span>
          </mat-radio-button>
          <mat-radio-button value="colors" class="sidebar-mode-option">
            <span class="mode-label">Colors Only</span>
            <span class="mode-description">Show only color boxes (minimal space)</span>
          </mat-radio-button>
          <mat-radio-button value="initials" class="sidebar-mode-option">
            <span class="mode-label">Colors with Initials</span>
            <span class="mode-description">Show color boxes with first 3 letters</span>
          </mat-radio-button>
        </mat-radio-group>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onApply()">Apply</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
    }
    mat-dialog-content {
      min-width: 400px;
      padding: 20px 24px;
    }
    .settings-section {
      margin-bottom: 20px;
    }
    .settings-section h3 {
      margin: 0 0 16px 0;
      font-size: 14px;
      font-weight: 500;
      color: rgba(0, 0, 0, 0.87);
    }
    .color-scheme-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .color-scheme-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .color-scheme-option:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    .scheme-label {
      font-size: 14px;
      margin-right: 16px;
      min-width: 100px;
    }
    .scheme-preview {
      display: flex;
      gap: 4px;
      align-items: center;
    }
    .color-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      border: 1px solid rgba(0, 0, 0, 0.12);
    }
    .settings-description {
      margin: 0 0 12px 0;
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
    }
    .sidebar-mode-group {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .sidebar-mode-option {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }
    .sidebar-mode-option:hover {
      background-color: rgba(0, 0, 0, 0.04);
    }
    .mode-label {
      font-size: 14px;
      font-weight: 500;
      margin-bottom: 4px;
    }
    .mode-description {
      font-size: 12px;
      color: rgba(0, 0, 0, 0.6);
      margin-left: 24px;
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