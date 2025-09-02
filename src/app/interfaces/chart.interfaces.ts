/**
 * Chart Widget Interfaces and Types
 * Defines proper TypeScript types for the ECharts Line Chart component
 */

import { Observable, Subscription } from 'rxjs';
import * as echarts from 'echarts/core';
import { WidgetContext } from '@home/models/widget-component.models';

// Chart Configuration Types
export interface ChartDimensions {
  width: number;
  height: number;
  availableHeight: number;
}

export interface ChartGridConfig {
  top: string;
  height: string;
  bottom?: string;
}

export interface GridConfiguration {
  small: ChartGridConfig[];
  large: ChartGridConfig[];
  huge: ChartGridConfig[];
}

export interface GridConfigurations {
  singleGrid: GridConfiguration;
  doubleGrid: GridConfiguration;
  tripleGrid: GridConfiguration;
}

// Entity and Data Types
export interface EntityInfo {
  name: string;
  label: string;
  displayName: string;
  deviceName?: string;
  visible: boolean;
  color: string;
  count: number;
  dataPoints: number;
}

export interface SeriesData {
  name: string;
  data: [number, number][];
  yAxisIndex: number;
  color: string;
  lineWidth: number;
  symbolSize: number;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  entityName: string;
  entityLabel?: string;
}

// Settings Types
export interface ChartSettings {
  showImageButton?: boolean;
  showExportButton?: boolean;
  showResetZoomButton?: boolean;
  showEntitySidebar?: boolean;
  showCustomLegend?: boolean;
  showZoomControls?: boolean;
  symbolSize_data?: number;
  exportDecimals?: number;
  useLazyLoading?: boolean;
  debugOutput?: boolean;
  multipleDevices?: boolean;
}

// Export Types
export interface ExportMetadata {
  label: string;
  deviceName: string;
  filename: string;
}

export type ExportFormat = 'csv' | 'xls' | 'xlsx';

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  metadata: ExportMetadata;
}

// Chart State Management
export interface ChartState {
  isInitialized: boolean;
  isLoading: boolean;
  hasData: boolean;
  currentGridCount: number;
  containerSize: 'small' | 'large' | 'huge';
  zoomRange?: [number, number];
}

// Legend Management
export interface LegendItem {
  label: string;
  plotNumber: string;
  selected: boolean;
  color: string;
}

export interface LegendState {
  currentPage: number;
  totalPages: number;
  itemsPerPage: number;
  needsPagination: boolean;
  hasMorePages: boolean;
  items: LegendItem[];
  pageItems: LegendItem[];
}

// Performance Monitoring
export interface PerformanceMetrics {
  totalDataPoints: number;
  renderTime: number;
  interactionTime: number;
  memoryUsage?: number;
}

// Error Types
export interface ChartError {
  type: 'initialization' | 'data' | 'rendering' | 'export' | 'resize';
  message: string;
  details?: string;
  timestamp: number;
  recovery?: () => void;
}

// Service Interfaces
export interface ChartManagementService {
  initializeChart(container: HTMLElement, ctx: WidgetContext): echarts.ECharts;
  updateChartData(chart: echarts.ECharts, data: SeriesData[]): void;
  resizeChart(chart: echarts.ECharts): void;
  resetZoom(chart: echarts.ECharts): void;
  disposeChart(chart: echarts.ECharts): void;
}

export interface DataProcessingService {
  processWidgetData(ctx: WidgetContext): SeriesData[];
  calculateGridConfiguration(dataCount: number, containerSize: string): ChartGridConfig[];
  extractEntityInfo(ctx: WidgetContext): EntityInfo[];
  validateDataIntegrity(data: SeriesData[]): boolean;
}

export interface ExportService {
  exportToCSV(data: ExportData): Promise<void>;
  exportToExcel(data: ExportData, format: 'xls' | 'xlsx'): Promise<void>;
  generateExportData(ctx: WidgetContext, selectedSeries?: string[]): Promise<ExportData>;
  getExportMetadata(ctx: WidgetContext): Observable<ExportMetadata>;
}

export interface ErrorHandlingService {
  handleError(error: ChartError): void;
  registerErrorBoundary(component: string): void;
  getErrorRecoveryStrategy(errorType: ChartError['type']): () => void;
  logPerformanceWarning(metrics: PerformanceMetrics): void;
}

// Widget Context Extensions
export interface ExtendedWidgetContext {
  settings: ChartSettings;
  height: number;
  width: number;
  data: Array<{
    data: ChartDataPoint[];
    dataKeys?: Array<{
      name: string;
      label?: string;
      color?: string;
    }>;
  }>;
  datasources?: Array<{
    entityName?: string;
    entityType?: string;
    entityId?: string;
    entity?: {
      id: string;
    };
  }>;
  attributeService?: {
    getEntityAttributes: (entity: unknown, scope: string, keys: string[]) => import('rxjs').Observable<Array<{ key: string; value: string }>>;
  };
  $scope?: {
    echartsLineChartComponent?: unknown;
    componentReady?: () => void;
  };
}

// Component State
export interface ComponentState {
  chart?: echarts.ECharts;
  chartState: ChartState;
  legendState: LegendState;
  entityList: EntityInfo[];
  selectedSeries: Set<string>;
  performanceMetrics: PerformanceMetrics;
  errors: ChartError[];
}

// Event Types
export interface ChartEvent {
  type: 'legendSelect' | 'dataZoom' | 'resize' | 'hover' | 'click';
  data: Record<string, unknown>;
  timestamp: number;
}

// Utility Types
export type ChartEventHandler<T = Record<string, unknown>> = (event: T) => void;
export type ErrorBoundary = (error: Error, errorInfo: { componentStack: string }) => void;
export type RecoveryStrategy = () => Promise<boolean>;