import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface MarkerData {
  id: string;
  name: string;
  timestamp: number;
  gridIndex: number;
  color: string;
  plotName: string;
}

export interface MarkerDialogData {
  markers: MarkerData[];
}

@Component({
  selector: 'tb-marker-management-dialog',
  templateUrl: './marker-management-dialog.component.html',
  styleUrls: ['./marker-management-dialog.component.scss']
})
export class MarkerManagementDialogComponent {

  public searchText = '';
  public filteredMarkers: MarkerData[] = [];
  public markersToDelete: Set<string> = new Set();

  constructor(
    public dialogRef: MatDialogRef<MarkerManagementDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: MarkerDialogData
  ) {
    this.filteredMarkers = [...this.data.markers];
  }

  /**
   * Filter markers based on search text
   */
  public filterMarkers(): void {
    const search = this.searchText.toLowerCase().trim();

    if (!search) {
      this.filteredMarkers = [...this.data.markers];
      return;
    }

    this.filteredMarkers = this.data.markers.filter(marker =>
      marker.name.toLowerCase().includes(search) ||
      marker.plotName.toLowerCase().includes(search) ||
      this.formatTimestamp(marker.timestamp).toLowerCase().includes(search)
    );
  }

  /**
   * Format timestamp for display
   */
  public formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Toggle marker for deletion
   */
  public toggleMarkerForDeletion(markerId: string): void {
    if (this.markersToDelete.has(markerId)) {
      this.markersToDelete.delete(markerId);
    } else {
      this.markersToDelete.add(markerId);
    }
  }

  /**
   * Check if marker is selected for deletion
   */
  public isMarkedForDeletion(markerId: string): boolean {
    return this.markersToDelete.has(markerId);
  }

  /**
   * Delete selected markers
   */
  public deleteSelectedMarkers(): void {
    if (this.markersToDelete.size === 0) {
      return;
    }

    if (confirm(`Delete ${this.markersToDelete.size} marker(s)?`)) {
      this.dialogRef.close({
        action: 'delete',
        markerIds: Array.from(this.markersToDelete)
      });
    }
  }

  /**
   * Delete single marker
   */
  public deleteMarker(markerId: string): void {
    if (confirm('Delete this marker?')) {
      this.dialogRef.close({
        action: 'delete',
        markerIds: [markerId]
      });
    }
  }

  /**
   * Close dialog without changes
   */
  public close(): void {
    this.dialogRef.close();
  }

  /**
   * Clear all markers
   */
  public clearAllMarkers(): void {
    if (confirm(`Delete all ${this.data.markers.length} markers?`)) {
      this.dialogRef.close({
        action: 'deleteAll'
      });
    }
  }
}
