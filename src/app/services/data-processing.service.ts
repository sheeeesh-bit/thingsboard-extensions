import { Injectable } from '@angular/core';
import { 
  SeriesData, 
  EntityInfo, 
  ChartDataPoint,
  ChartGridConfig,
  ExtendedWidgetContext,
  ChartError,
  PerformanceMetrics
} from '../interfaces/chart.interfaces';
import { WidgetContext } from '@home/models/widget-component.models';

@Injectable({
  providedIn: 'root'
})
export class DataProcessingService {

  private readonly DEBUG = false;
  private readonly PERFORMANCE_THRESHOLD = {
    LARGE_DATASET: 10000,
    CRITICAL_DATASET: 50000
  };

  /**
   * Process widget context data into chart series format
   */
  processWidgetData(ctx: WidgetContext): SeriesData[] {
    const startTime = performance.now();
    
    try {
      if (!ctx.data || !Array.isArray(ctx.data)) {
        this.logDebug('No data available in context');
        return [];
      }

      const series: SeriesData[] = [];
      let yAxisIndex = 0;
      const entityColorMap = new Map<string, string>();
      const entityLabelMap = new Map<string, string>();

      // Process each datasource
      ctx.data.forEach((datasource, dsIndex) => {
        if (!datasource.data || !Array.isArray(datasource.data)) {
          return;
        }

        // Group data by entity
        const entityDataMap = this.groupDataByEntity(datasource.data as unknown as ChartDataPoint[]);

        // Create series for each entity
        entityDataMap.forEach((entityData, entityName) => {
          const color = this.getEntityColor(entityName, entityColorMap, dsIndex);
          const label = this.getEntityLabel(entityName, entityLabelMap, datasource);
          
          // Process data points
          const processedData = this.processDataPoints(entityData);
          
          if (processedData.length > 0) {
            series.push({
              name: label || entityName,
              data: processedData,
              yAxisIndex: yAxisIndex,
              color: color,
              lineWidth: this.calculateLineWidth(processedData.length),
              symbolSize: this.calculateSymbolSize(ctx.settings?.symbolSize_data || 5)
            });
          }
        });

        yAxisIndex++;
      });

      const processingTime = performance.now() - startTime;
      const totalPoints = series.reduce((sum, s) => sum + s.data.length, 0);
      
      this.logPerformanceMetrics({
        totalDataPoints: totalPoints,
        renderTime: processingTime,
        interactionTime: 0,
        memoryUsage: this.estimateMemoryUsage(series)
      });

      this.logDebug('Data processing completed', {
        seriesCount: series.length,
        totalPoints,
        processingTime: `${processingTime.toFixed(2)}ms`
      });

      return series;

    } catch (error) {
      const chartError: ChartError = {
        type: 'data',
        message: 'Failed to process widget data',
        details: error instanceof Error ? error.message : String(error),
        timestamp: Date.now(),
        recovery: () => this.processWidgetData(ctx)
      };
      throw chartError;
    }
  }

  /**
   * Group data points by entity name
   */
  private groupDataByEntity(data: ChartDataPoint[]): Map<string, ChartDataPoint[]> {
    const entityMap = new Map<string, ChartDataPoint[]>();

    data.forEach(point => {
      if (!point.entityName) return;

      if (!entityMap.has(point.entityName)) {
        entityMap.set(point.entityName, []);
      }
      entityMap.get(point.entityName)!.push(point);
    });

    return entityMap;
  }

  /**
   * Get or assign color for entity
   */
  private getEntityColor(
    entityName: string, 
    colorMap: Map<string, string>, 
    datasourceIndex: number
  ): string {
    if (colorMap.has(entityName)) {
      return colorMap.get(entityName)!;
    }

    // Generate consistent color based on entity name and datasource
    const colors = [
      '#1976d2', '#dc004e', '#388e3c', '#f57c00', 
      '#7b1fa2', '#00796b', '#c2185b', '#5d4037',
      '#455a64', '#e64a19'
    ];
    
    const colorIndex = (entityName.length + datasourceIndex) % colors.length;
    const color = colors[colorIndex];
    colorMap.set(entityName, color);
    
    return color;
  }

  /**
   * Get entity label from datasource or use name
   */
  private getEntityLabel(
    entityName: string, 
    labelMap: Map<string, string>, 
    datasource: unknown
  ): string {
    if (labelMap.has(entityName)) {
      return labelMap.get(entityName)!;
    }

    // Try to extract label from datasource configuration
    let label = entityName;
    
    try {
      const ds = datasource as { 
        dataKeys?: Array<{ name: string; label?: string }>;
        entityName?: string;
      };
      
      if (ds.dataKeys) {
        const dataKey = ds.dataKeys.find(dk => dk.name === entityName);
        if (dataKey?.label) {
          label = dataKey.label;
        }
      } else if (ds.entityName) {
        label = ds.entityName;
      }
    } catch (error) {
      this.logDebug('Failed to extract entity label:', error);
    }

    labelMap.set(entityName, label);
    return label;
  }

  /**
   * Process and validate data points
   */
  private processDataPoints(data: ChartDataPoint[]): [number, number][] {
    const processedData: [number, number][] = [];
    
    data.forEach(point => {
      // Validate data point
      if (!this.isValidDataPoint(point)) {
        return;
      }

      // Convert to ECharts format [timestamp, value]
      processedData.push([point.timestamp, point.value]);
    });

    // Sort by timestamp for proper line rendering
    processedData.sort((a, b) => a[0] - b[0]);

    // Remove duplicates and invalid points
    return this.removeDuplicatePoints(processedData);
  }

  /**
   * Validate individual data point
   */
  private isValidDataPoint(point: ChartDataPoint): boolean {
    return !!(
      point &&
      typeof point.timestamp === 'number' &&
      !isNaN(point.timestamp) &&
      point.timestamp > 0 &&
      typeof point.value === 'number' &&
      !isNaN(point.value) &&
      isFinite(point.value)
    );
  }

  /**
   * Remove duplicate points at same timestamp
   */
  private removeDuplicatePoints(data: [number, number][]): [number, number][] {
    if (data.length <= 1) return data;

    const unique: [number, number][] = [data[0]];
    
    for (let i = 1; i < data.length; i++) {
      const current = data[i];
      const previous = data[i - 1];
      
      // Keep points with different timestamps or significantly different values
      if (current[0] !== previous[0] || Math.abs(current[1] - previous[1]) > 0.0001) {
        unique.push(current);
      }
    }

    return unique;
  }

  /**
   * Calculate appropriate line width based on data density
   */
  private calculateLineWidth(pointCount: number): number {
    if (pointCount > 5000) return 2; // Thin lines for dense data
    if (pointCount > 1000) return 3; // Medium lines
    return 4; // Thick lines for sparse data
  }

  /**
   * Calculate symbol size with proper scaling
   */
  private calculateSymbolSize(baseSizeFromSettings: number): number {
    // Apply 2.5x multiplier as per original implementation
    return baseSizeFromSettings * 2.5;
  }

  /**
   * Extract entity information for sidebar and legend
   */
  extractEntityInfo(ctx: WidgetContext): EntityInfo[] {
    try {
      const entities: EntityInfo[] = [];
      
      if (!ctx.data || !Array.isArray(ctx.data)) {
        return entities;
      }

      const entityMap = new Map<string, {
        count: number;
        dataPoints: number;
        label?: string;
        deviceName?: string;
      }>();

      // Collect entity information
      ctx.data.forEach((datasource, index) => {
        if (!datasource.data || !Array.isArray(datasource.data)) {
          return;
        }

        (datasource.data as unknown as ChartDataPoint[]).forEach((point: ChartDataPoint) => {
          if (!point.entityName) return;

          if (!entityMap.has(point.entityName)) {
            entityMap.set(point.entityName, {
              count: 0,
              dataPoints: 0,
              label: point.entityLabel || point.entityName
            });
          }

          const entity = entityMap.get(point.entityName)!;
          entity.count++;
          entity.dataPoints++;
        });
      });

      // Convert to EntityInfo array
      entityMap.forEach((info, entityName) => {
        entities.push({
          name: entityName,
          label: info.label || entityName,
          displayName: this.truncateDisplayName(info.label || entityName),
          deviceName: info.deviceName,
          visible: true, // Default to visible
          color: this.getEntityColor(entityName, new Map(), 0),
          count: info.count,
          dataPoints: info.dataPoints
        });
      });

      // Sort entities by data point count (most data first)
      entities.sort((a, b) => b.dataPoints - a.dataPoints);

      this.logDebug('Extracted entity information', { 
        entityCount: entities.length,
        totalDataPoints: entities.reduce((sum, e) => sum + e.dataPoints, 0)
      });

      return entities;

    } catch (error) {
      this.logDebug('Failed to extract entity info:', error);
      return [];
    }
  }

  /**
   * Truncate display names to prevent UI overflow
   */
  private truncateDisplayName(name: string, maxLength: number = 25): string {
    if (name.length <= maxLength) {
      return name;
    }
    return name.substring(0, maxLength - 3) + '...';
  }

  /**
   * Validate data integrity
   */
  validateDataIntegrity(data: SeriesData[]): boolean {
    try {
      if (!Array.isArray(data)) {
        return false;
      }

      for (const series of data) {
        // Check required properties
        if (!series.name || !Array.isArray(series.data)) {
          return false;
        }

        // Check data point format
        for (const point of series.data) {
          if (!Array.isArray(point) || point.length !== 2) {
            return false;
          }
          
          const [timestamp, value] = point;
          if (typeof timestamp !== 'number' || typeof value !== 'number') {
            return false;
          }
          
          if (!isFinite(timestamp) || !isFinite(value)) {
            return false;
          }
        }
      }

      return true;

    } catch (error) {
      this.logDebug('Data integrity validation failed:', error);
      return false;
    }
  }

  /**
   * Calculate grid configuration based on data characteristics
   */
  calculateGridConfiguration(dataCount: number, containerSize: string): ChartGridConfig[] {
    // Determine number of grids needed
    let gridCount = 1;
    
    if (dataCount > 10) {
      gridCount = 3; // Triple grid for complex data
    } else if (dataCount > 5) {
      gridCount = 2; // Double grid for medium data
    }

    // Return appropriate grid configuration
    // This would typically use the ChartManagementService.getGridConfiguration
    // but we'll provide a simple fallback here
    const configs: Record<string, ChartGridConfig[]> = {
      small: [{ top: "8%", height: "70%", bottom: "2%" }],
      large: [{ top: "5%", height: "75%", bottom: "2%" }],
      huge: [{ top: "5%", height: "75%", bottom: "2%" }]
    };

    return configs[containerSize] || configs.small;
  }

  /**
   * Estimate memory usage for performance monitoring
   */
  private estimateMemoryUsage(series: SeriesData[]): number {
    let totalBytes = 0;
    
    series.forEach(s => {
      // Estimate: each data point = 16 bytes (2 numbers * 8 bytes each)
      // Plus object overhead
      totalBytes += s.data.length * 16;
      totalBytes += s.name.length * 2; // String characters
      totalBytes += 100; // Object overhead
    });

    return Math.round(totalBytes / 1024); // Return KB
  }

  /**
   * Log performance metrics
   */
  private logPerformanceMetrics(metrics: PerformanceMetrics): void {
    if (metrics.totalDataPoints > this.PERFORMANCE_THRESHOLD.CRITICAL_DATASET) {
      console.warn('[DataProcessingService] Critical dataset size detected', {
        dataPoints: metrics.totalDataPoints,
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage
      });
    } else if (metrics.totalDataPoints > this.PERFORMANCE_THRESHOLD.LARGE_DATASET) {
      console.info('[DataProcessingService] Large dataset processing', {
        dataPoints: metrics.totalDataPoints,
        renderTime: metrics.renderTime
      });
    }

    this.logDebug('Performance metrics', metrics);
  }

  /**
   * Debug logging utility
   */
  private logDebug(message: string, data?: unknown): void {
    if (this.DEBUG) {
      console.log(`[DataProcessingService] ${message}`, data || '');
    }
  }
}