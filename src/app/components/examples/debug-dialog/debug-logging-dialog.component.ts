import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormGroup } from '@angular/forms';

export interface DebugLoggingDialogData {
  normalLogs: boolean;
  performanceLogs: boolean;
  minMaxLogs: boolean;
  alarmLogs: boolean;
}

@Component({
  selector: 'tb-debug-logging-dialog',
  templateUrl: './debug-logging-dialog.component.html',
  styleUrls: ['./debug-logging-dialog.component.scss']
})
export class DebugLoggingDialogComponent {

  public debugForm: FormGroup;

  constructor(
    public dialogRef: MatDialogRef<DebugLoggingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DebugLoggingDialogData,
    private fb: FormBuilder
  ) {
    this.debugForm = this.fb.group({
      normalLogs: [data.normalLogs || false],
      performanceLogs: [data.performanceLogs || false],
      minMaxLogs: [data.minMaxLogs || false],
      alarmLogs: [data.alarmLogs || false]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    this.dialogRef.close(this.debugForm.value);
  }
}