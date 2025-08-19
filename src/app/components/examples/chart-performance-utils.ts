/**
 * Performance utilities for ECharts optimization
 * Implements best practices for ultra-smooth chart rendering
 */

export interface PerformanceConfig {
  // Progressive rendering for large datasets
  progressiveThreshold: number;
  progressive: number;
  // Animation control
  animationThreshold: number;
  animationDuration: number;
  // Large mode thresholds
  largeThreshold: number;
  // Sampling strategy
  sampling: 'lttb' | 'average' | 'max' | 'min' | 'sum' | false;
  // Dirty rectangle rendering
  useDirtyRect: boolean;
  // Symbol optimization
  showSymbolThreshold: number;
  // Timing controls
  tooltipThrottle: number;
  resizeDebounce: number;
  dataUpdateDebounce: number;
  // Advanced features
  useRequestAnimationFrame: boolean;
  useWebWorker: boolean;
  useOffscreenCanvas: boolean;
  // Memory optimization
  disposeThreshold: number;
  reuseSeriesInstances: boolean;
}

export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  progressiveThreshold: 1000,
  progressive: 5000,
  animationThreshold: 2000,
  animationDuration: 300,
  largeThreshold: 2000,
  sampling: 'lttb',
  useDirtyRect: true,
  showSymbolThreshold: 500,
  tooltipThrottle: 16, // ~60fps
  resizeDebounce: 100,
  dataUpdateDebounce: 50,
  useRequestAnimationFrame: true,
  useWebWorker: false,
  useOffscreenCanvas: false,
  disposeThreshold: 10000,
  reuseSeriesInstances: true
};

/**
 * Performance monitor for tracking chart metrics
 */
export class ChartPerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = performance.now();
  private fps = 60;
  private renderTimes: number[] = [];
  private readonly maxSamples = 100;

  public measureFrame(callback: () => void): void {
    const startTime = performance.now();
    callback();
    const endTime = performance.now();
    
    this.trackRenderTime(endTime - startTime);
    this.updateFPS(endTime);
  }

  private trackRenderTime(time: number): void {
    this.renderTimes.push(time);
    if (this.renderTimes.length > this.maxSamples) {
      this.renderTimes.shift();
    }
  }

  private updateFPS(currentTime: number): void {
    this.frameCount++;
    const elapsed = currentTime - this.lastFrameTime;
    
    if (elapsed >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / elapsed);
      this.frameCount = 0;
      this.lastFrameTime = currentTime;
    }
  }

  public getMetrics() {
    const avgRenderTime = this.renderTimes.length > 0
      ? this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length
      : 0;
    
    return {
      fps: this.fps,
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      maxRenderTime: Math.max(...this.renderTimes, 0),
      minRenderTime: Math.min(...this.renderTimes, Infinity)
    };
  }
}

/**
 * Data optimization utilities
 */
export class DataOptimizer {
  /**
   * Implement LTTB (Largest-Triangle-Three-Buckets) downsampling
   * Preserves visual characteristics while reducing data points
   */
  static downsampleLTTB(data: [number, number][], threshold: number): [number, number][] {
    if (data.length <= threshold) {
      return data;
    }

    const sampled: [number, number][] = [];
    const bucketSize = (data.length - 2) / (threshold - 2);
    
    // Always keep first point
    sampled.push(data[0]);
    
    let a = 0;
    for (let i = 0; i < threshold - 2; i++) {
      const avgRangeStart = Math.floor((i + 1) * bucketSize) + 1;
      const avgRangeEnd = Math.floor((i + 2) * bucketSize) + 1;
      const avgRangeEndClamped = Math.min(avgRangeEnd, data.length);
      
      // Calculate average for next bucket
      let avgX = 0;
      let avgY = 0;
      const avgRangeLength = avgRangeEndClamped - avgRangeStart;
      
      for (let j = avgRangeStart; j < avgRangeEndClamped; j++) {
        avgX += data[j][0];
        avgY += data[j][1];
      }
      avgX /= avgRangeLength;
      avgY /= avgRangeLength;
      
      // Find point with largest triangle area
      const rangeStart = Math.floor(i * bucketSize) + 1;
      const rangeEnd = Math.floor((i + 1) * bucketSize) + 1;
      
      let maxArea = -1;
      let maxAreaPoint = -1;
      const pointAX = data[a][0];
      const pointAY = data[a][1];
      
      for (let j = rangeStart; j < rangeEnd; j++) {
        const area = Math.abs(
          (pointAX - avgX) * (data[j][1] - pointAY) -
          (pointAX - data[j][0]) * (avgY - pointAY)
        ) * 0.5;
        
        if (area > maxArea) {
          maxArea = area;
          maxAreaPoint = j;
        }
      }
      
      sampled.push(data[maxAreaPoint]);
      a = maxAreaPoint;
    }
    
    // Always keep last point
    sampled.push(data[data.length - 1]);
    
    return sampled;
  }

  /**
   * Convert arrays to TypedArrays for better memory efficiency
   */
  static toTypedArray(data: number[][]): Float32Array[] {
    return data.map(series => new Float32Array(series));
  }

  /**
   * Implement data windowing for virtual scrolling
   */
  static getDataWindow(
    data: any[],
    startIndex: number,
    endIndex: number,
    paddingRatio = 0.1
  ): any[] {
    const padding = Math.floor((endIndex - startIndex) * paddingRatio);
    const windowStart = Math.max(0, startIndex - padding);
    const windowEnd = Math.min(data.length, endIndex + padding);
    
    return data.slice(windowStart, windowEnd);
  }
}

/**
 * Animation frame scheduler for smooth updates
 */
export class AnimationFrameScheduler {
  private queue: (() => void)[] = [];
  private isProcessing = false;
  private frameId: number | null = null;
  private lastFrameTime = 0;
  private readonly targetFPS = 60;
  private readonly frameTime = 1000 / this.targetFPS;

  public schedule(callback: () => void): void {
    this.queue.push(callback);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private processQueue = (): void => {
    const now = performance.now();
    const elapsed = now - this.lastFrameTime;
    
    if (elapsed >= this.frameTime && this.queue.length > 0) {
      this.isProcessing = true;
      const callback = this.queue.shift();
      
      if (callback) {
        callback();
      }
      
      this.lastFrameTime = now;
    }
    
    if (this.queue.length > 0) {
      this.frameId = requestAnimationFrame(this.processQueue);
    } else {
      this.isProcessing = false;
    }
  };

  public clear(): void {
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
    this.queue = [];
    this.isProcessing = false;
  }
}

/**
 * Memory management utilities
 */
export class MemoryOptimizer {
  private static readonly CLEANUP_INTERVAL = 30000; // 30 seconds
  private static cleanupTimer: any = null;

  /**
   * Start automatic memory cleanup
   */
  static startAutoCleanup(chart: any): void {
    this.stopAutoCleanup();
    
    this.cleanupTimer = setInterval(() => {
      this.performCleanup(chart);
    }, this.CLEANUP_INTERVAL);
  }

  /**
   * Stop automatic memory cleanup
   */
  static stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Perform memory cleanup
   */
  private static performCleanup(chart: any): void {
    // Clear ECharts internal cache
    if (chart && chart.clear) {
      const currentOption = chart.getOption();
      chart.clear();
      chart.setOption(currentOption);
    }

    // Request garbage collection if available
    if ((global as any).gc) {
      (global as any).gc();
    }
  }

  /**
   * Optimize series data for memory efficiency
   */
  static optimizeSeriesData(series: any[]): any[] {
    return series.map(s => ({
      ...s,
      // Use TypedArrays for numeric data
      data: s.data && Array.isArray(s.data[0]) 
        ? s.data.map((point: number[]) => new Float32Array(point))
        : s.data,
      // Enable incremental rendering
      progressive: s.data?.length > 1000 ? 1000 : undefined,
      progressiveThreshold: 1000,
      // Disable unused features
      emphasis: s.emphasis || { disabled: true },
      blur: s.blur || { disabled: true },
      select: s.select || { disabled: true }
    }));
  }
}

/**
 * Smooth scrolling and zoom utilities
 */
export class SmoothInteraction {
  private static readonly SMOOTH_FACTOR = 0.15;
  private static zoomVelocity = 0;
  private static targetZoom = { start: 0, end: 100 };
  private static currentZoom = { start: 0, end: 100 };
  private static animationId: number | null = null;

  /**
   * Smooth zoom animation
   */
  static smoothZoom(
    chart: any,
    targetStart: number,
    targetEnd: number,
    duration = 300
  ): void {
    const startTime = performance.now();
    const initialStart = this.currentZoom.start;
    const initialEnd = this.currentZoom.end;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      
      this.currentZoom.start = initialStart + (targetStart - initialStart) * eased;
      this.currentZoom.end = initialEnd + (targetEnd - initialEnd) * eased;
      
      chart.dispatchAction({
        type: 'dataZoom',
        start: this.currentZoom.start,
        end: this.currentZoom.end
      });
      
      if (progress < 1) {
        this.animationId = requestAnimationFrame(animate);
      }
    };
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Smooth pan with momentum
   */
  static smoothPan(
    chart: any,
    deltaX: number,
    onComplete?: () => void
  ): void {
    let velocity = deltaX * 0.2;
    let position = 0;
    
    const animate = () => {
      velocity *= 0.95; // Friction
      position += velocity;
      
      if (Math.abs(velocity) > 0.1) {
        chart.dispatchAction({
          type: 'dataZoom',
          startValue: position
        });
        
        requestAnimationFrame(animate);
      } else if (onComplete) {
        onComplete();
      }
    };
    
    requestAnimationFrame(animate);
  }
}

/**
 * Create optimized tooltip formatter
 */
export function createOptimizedTooltipFormatter(decimals = 2): (params: any) => string {
  // Pre-compile template for better performance
  const template = document.createElement('div');
  template.style.minWidth = '200px';
  
  return (params: any) => {
    if (!params || params.length === 0) return '';
    
    // Use DocumentFragment for better performance
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    
    // Add timestamp header
    const header = document.createElement('div');
    header.style.fontWeight = '600';
    header.style.marginBottom = '4px';
    header.textContent = params[0].axisValue;
    container.appendChild(header);
    
    // Add series data
    const table = document.createElement('table');
    table.style.width = '100%';
    
    params.forEach((item: any) => {
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.innerHTML = `${item.marker} ${item.seriesName}`;
      nameCell.style.paddingRight = '10px';
      
      const valueCell = document.createElement('td');
      valueCell.style.textAlign = 'right';
      valueCell.textContent = typeof item.value[1] === 'number' 
        ? item.value[1].toFixed(decimals)
        : item.value[1];
      
      row.appendChild(nameCell);
      row.appendChild(valueCell);
      table.appendChild(row);
    });
    
    container.appendChild(table);
    fragment.appendChild(container);
    
    return container.outerHTML;
  };
}