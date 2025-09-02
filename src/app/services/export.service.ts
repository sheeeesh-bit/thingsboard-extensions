import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { 
  ExportData, 
  ExportFormat, 
  ExportMetadata,
  ChartError,
  ExtendedWidgetContext
} from '../interfaces/chart.interfaces';
import { WidgetContext } from '@home/models/widget-component.models';

@Injectable({
  providedIn: 'root'
})
export class ExportService {

  private readonly DEBUG = false;
  private readonly EXPORT_TIMEOUT = 30000; // 30 seconds

  /**
   * Export data to CSV format
   */
  async exportToCSV(data: ExportData): Promise<void> {
    try {
      this.logDebug('Starting CSV export', { rows: data.rows.length });

      // Create CSV content with semicolon separator (ThingsBoard standard)
      let csvContent = data.headers.join(';') + '\n';
      
      data.rows.forEach(row => {
        const formattedRow = row.map(cell => {
          if (typeof cell === 'number') {
            // Format numbers and remove trailing zeros
            return Number(cell.toFixed(6)).toString();
          }
          // Escape semicolons in string values
          return String(cell).replace(/;/g, ',');
        });
        csvContent += formattedRow.join(';') + '\n';
      });

      // Create and trigger download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const filename = `${data.metadata.filename}.csv`;
      
      await this.triggerDownload(blob, filename);
      
      this.logDebug('CSV export completed successfully', { filename });

    } catch (error) {
      const exportError: ChartError = {
        type: 'export',
        message: 'CSV export failed',
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recovery: () => this.exportToCSV(data)
      };
      throw exportError;
    }
  }

  /**
   * Export data to Excel format (XLS or XLSX)
   */
  async exportToExcel(data: ExportData, format: 'xls' | 'xlsx'): Promise<void> {
    try {
      this.logDebug(`Starting ${format.toUpperCase()} export`, { rows: data.rows.length });

      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      
      // Prepare data for Excel
      const worksheetData = [
        data.headers,
        ...data.rows.map(row => 
          row.map(cell => {
            if (typeof cell === 'number') {
              // Format numbers and remove trailing zeros
              return Number(cell.toFixed(6));
            }
            return cell;
          })
        )
      ];

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply formatting
      this.formatExcelWorksheet(worksheet, data);

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Chart Data');

      // Add metadata sheet
      this.addMetadataSheet(workbook, data.metadata);

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, {
        bookType: format,
        type: 'array',
        compression: true
      });

      // Create blob and trigger download
      const mimeType = format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/vnd.ms-excel';
      
      const blob = new Blob([excelBuffer], { type: mimeType });
      const filename = `${data.metadata.filename}.${format}`;
      
      await this.triggerDownload(blob, filename);
      
      this.logDebug(`${format.toUpperCase()} export completed successfully`, { filename });

    } catch (error) {
      const exportError: ChartError = {
        type: 'export',
        message: `${format.toUpperCase()} export failed`,
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recovery: () => this.exportToExcel(data, format)
      };
      throw exportError;
    }
  }

  /**
   * Format Excel worksheet with proper styling
   */
  private formatExcelWorksheet(worksheet: XLSX.WorkSheet, data: ExportData): void {
    try {
      // Calculate column widths based on content
      const columnWidths: Array<{ wch: number }> = [];
      
      data.headers.forEach((header, index) => {
        let maxWidth = header.length;
        
        // Check data column widths
        data.rows.forEach(row => {
          if (row[index] !== undefined) {
            const cellLength = String(row[index]).length;
            if (cellLength > maxWidth) {
              maxWidth = cellLength;
            }
          }
        });
        
        columnWidths.push({ wch: Math.min(maxWidth + 2, 50) }); // Max width of 50
      });
      
      worksheet['!cols'] = columnWidths;

      // Set header row formatting (if XLSX.utils supports it)
      const headerRange = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
      for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (worksheet[cellAddress]) {
          worksheet[cellAddress].s = {
            font: { bold: true },
            fill: { fgColor: { rgb: "EEEEEE" } },
            alignment: { horizontal: "center" }
          };
        }
      }

    } catch (error) {
      this.logDebug('Failed to format Excel worksheet:', error);
      // Continue without formatting rather than failing the export
    }
  }

  /**
   * Add metadata sheet to workbook
   */
  private addMetadataSheet(workbook: XLSX.WorkBook, metadata: ExportMetadata): void {
    try {
      const metadataData = [
        ['Export Information'],
        [''],
        ['Label', metadata.label],
        ['Device Name', metadata.deviceName],
        ['Filename', metadata.filename],
        ['Export Time', new Date().toLocaleString()],
        ['Generated By', 'ThingsBoard Chart Widget']
      ];

      const metadataSheet = XLSX.utils.aoa_to_sheet(metadataData);
      
      // Set column widths for metadata
      metadataSheet['!cols'] = [
        { wch: 15 }, // Property names
        { wch: 30 }  // Values
      ];

      XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata');

    } catch (error) {
      this.logDebug('Failed to create metadata sheet:', error);
      // Continue without metadata sheet rather than failing
    }
  }

  /**
   * Generate export data from widget context
   */
  async generateExportData(
    ctx: WidgetContext, 
    selectedSeries?: string[]
  ): Promise<ExportData> {
    try {
      this.logDebug('Generating export data', { 
        hasData: !!(ctx.data && ctx.data.length),
        selectedSeriesCount: selectedSeries?.length || 0
      });

      if (!ctx.data || !Array.isArray(ctx.data) || ctx.data.length === 0) {
        throw new Error('No data available for export');
      }

      // Get export metadata
      const metadata = await this.getExportMetadata(ctx).toPromise();
      if (!metadata) {
        throw new Error('Failed to generate export metadata');
      }

      // Collect all data points
      const allDataPoints: Array<{
        timestamp: number;
        value: number;
        entityName: string;
        entityLabel?: string;
      }> = [];

      ctx.data.forEach(datasource => {
        if (datasource.data && Array.isArray(datasource.data)) {
          datasource.data.forEach((point: unknown) => {
            const p = point as {
              timestamp: number;
              value: number;
              entityName: string;
              entityLabel?: string;
            };
            
            // Filter by selected series if specified
            if (selectedSeries && selectedSeries.length > 0) {
              if (!selectedSeries.includes(p.entityName)) {
                return;
              }
            }
            
            if (this.isValidExportPoint(p)) {
              allDataPoints.push(p);
            }
          });
        }
      });

      if (allDataPoints.length === 0) {
        throw new Error('No valid data points found for export');
      }

      // Sort by timestamp
      allDataPoints.sort((a, b) => a.timestamp - b.timestamp);

      // Group by entity for columnar export
      const entityDataMap = new Map<string, Array<{ timestamp: number; value: number }>>();
      const entityLabels = new Map<string, string>();

      allDataPoints.forEach(point => {
        const entityKey = point.entityName;
        const entityLabel = point.entityLabel || point.entityName;
        
        entityLabels.set(entityKey, entityLabel);
        
        if (!entityDataMap.has(entityKey)) {
          entityDataMap.set(entityKey, []);
        }
        
        entityDataMap.get(entityKey)!.push({
          timestamp: point.timestamp,
          value: point.value
        });
      });

      // Create headers
      const headers = ['Timestamp'];
      const entityKeys = Array.from(entityDataMap.keys());
      entityKeys.forEach(key => {
        const label = entityLabels.get(key) || key;
        headers.push(label);
      });

      // Get all unique timestamps
      const allTimestamps = Array.from(new Set(allDataPoints.map(p => p.timestamp)))
        .sort((a, b) => a - b);

      // Create rows
      const rows: (string | number)[][] = [];
      
      allTimestamps.forEach(timestamp => {
        const row: (string | number)[] = [new Date(timestamp).toISOString()];
        
        entityKeys.forEach(entityKey => {
          const entityData = entityDataMap.get(entityKey) || [];
          const dataPoint = entityData.find(p => p.timestamp === timestamp);
          
          if (dataPoint) {
            // Apply export decimal formatting
            const decimals = (ctx.settings as { exportDecimals?: number })?.exportDecimals || 6;
            const formattedValue = Number(dataPoint.value.toFixed(decimals));
            row.push(formattedValue);
          } else {
            row.push(''); // Empty cell for missing data
          }
        });
        
        rows.push(row);
      });

      const exportData: ExportData = {
        headers,
        rows,
        metadata
      };

      this.logDebug('Export data generated successfully', {
        headers: exportData.headers.length,
        rows: exportData.rows.length,
        totalDataPoints: allDataPoints.length
      });

      return exportData;

    } catch (error) {
      const exportError: ChartError = {
        type: 'export',
        message: 'Failed to generate export data',
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recovery: () => this.generateExportData(ctx, selectedSeries)
      };
      throw exportError;
    }
  }

  /**
   * Get export metadata (label and device name) for filename generation
   */
  getExportMetadata(ctx: WidgetContext): Observable<ExportMetadata> {
    if (!ctx.datasources || ctx.datasources.length === 0) {
      return of({
        label: 'sensor',
        deviceName: 'unknown',
        filename: this.generateFilename('sensor', 'unknown')
      });
    }

    const datasource = ctx.datasources[0];
    if (!datasource || !datasource.entity) {
      const entityName = datasource.entityName || 'sensor';
      return of({
        label: entityName,
        deviceName: 'unknown',
        filename: this.generateFilename(entityName, 'unknown')
      });
    }

    const entity = {
      entityType: datasource.entityType,
      id: datasource.entityId
    };

    // Check if attributeService is available
    if (!ctx.attributeService) {
      const entityName = datasource.entityName || 'sensor';
      return of({
        label: entityName,
        deviceName: 'unknown',
        filename: this.generateFilename(entityName, 'unknown')
      });
    }

    return ctx.attributeService
      .getEntityAttributes(entity, 'SERVER_SCOPE' as string, ['label', 'deviceName'])
      .pipe(
        map((attrs: Array<{ key: string; value: string }>) => {
          const labelAttr = attrs.find(a => a.key === 'label');
          const deviceNameAttr = attrs.find(a => a.key === 'deviceName');
          
          const label = labelAttr?.value || datasource.entityName || 'sensor';
          const deviceName = deviceNameAttr?.value || 'unknown';
          
          return {
            label,
            deviceName,
            filename: this.generateFilename(label, deviceName)
          };
        }),
        catchError(() => {
          const entityName = datasource.entityName || 'sensor';
          return of({
            label: entityName,
            deviceName: 'unknown',
            filename: this.generateFilename(entityName, 'unknown')
          });
        })
      );
  }

  /**
   * Generate filename in format: label[deviceName]_YYYY-MM-DD_HH-mm-ss-SSS
   */
  private generateFilename(label: string, deviceName: string): string {
    const now = new Date();
    const timestamp = now.getFullYear() +
      '-' + String(now.getMonth() + 1).padStart(2, '0') +
      '-' + String(now.getDate()).padStart(2, '0') +
      '_' + String(now.getHours()).padStart(2, '0') +
      '-' + String(now.getMinutes()).padStart(2, '0') +
      '-' + String(now.getSeconds()).padStart(2, '0') +
      '-' + String(now.getMilliseconds()).padStart(3, '0');

    // Sanitize filename components
    const sanitizedLabel = this.sanitizeFilename(label);
    const sanitizedDeviceName = this.sanitizeFilename(deviceName);
    
    return `${sanitizedLabel}[${sanitizedDeviceName}]_${timestamp}`;
  }

  /**
   * Sanitize filename to remove invalid characters
   */
  private sanitizeFilename(name: string): string {
    // Replace invalid filename characters with underscores
    return name.replace(/[/\\?*[\]]/g, '_').trim();
  }

  /**
   * Validate export data point
   */
  private isValidExportPoint(point: unknown): boolean {
    const p = point as {
      timestamp?: number;
      value?: number;
      entityName?: string;
    };

    return !!(
      p &&
      typeof p.timestamp === 'number' &&
      !isNaN(p.timestamp) &&
      p.timestamp > 0 &&
      typeof p.value === 'number' &&
      !isNaN(p.value) &&
      isFinite(p.value) &&
      typeof p.entityName === 'string' &&
      p.entityName.trim().length > 0
    );
  }

  /**
   * Trigger file download using browser API
   */
  private async triggerDownload(blob: Blob, filename: string): Promise<void> {
    try {
      // Check if the File System Access API is available (modern browsers)
      if ('showSaveFilePicker' in window) {
        try {
          const fileHandle = await (window as unknown as {
            showSaveFilePicker: (options: { suggestedName: string }) => Promise<FileSystemFileHandle>;
          }).showSaveFilePicker({ suggestedName: filename });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (error) {
          // Fall back to traditional download if user cancels or API fails
          this.logDebug('File System Access API failed, falling back to traditional download:', error);
        }
      }

      // Traditional download method
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up object URL after a delay
      setTimeout(() => URL.revokeObjectURL(url), 1000);

    } catch (error) {
      throw new Error(`Failed to download file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Debug logging utility
   */
  private logDebug(message: string, data?: unknown): void {
    if (this.DEBUG) {
      console.log(`[ExportService] ${message}`, data || '');
    }
  }
}