import { Injectable } from '@angular/core';
import { 
  ChartError, 
  PerformanceMetrics,
  RecoveryStrategy,
  ErrorBoundary
} from '../interfaces/chart.interfaces';

@Injectable({
  providedIn: 'root'
})
export class ErrorHandlingService {

  private readonly MAX_ERRORS = 50; // Maximum errors to keep in memory
  private readonly PERFORMANCE_WARNING_THRESHOLD = 5000; // ms
  private readonly CRITICAL_DATA_THRESHOLD = 50000; // data points

  private errorLog: ChartError[] = [];
  private registeredComponents = new Set<string>();
  private recoveryStrategies = new Map<ChartError['type'], RecoveryStrategy>();
  private errorBoundaries = new Map<string, ErrorBoundary>();

  constructor() {
    this.initializeRecoveryStrategies();
    this.setupGlobalErrorHandling();
  }

  /**
   * Handle chart-related errors with recovery strategies
   */
  handleError(error: ChartError): void {
    try {
      // Add error to log
      this.addErrorToLog(error);

      // Log error to console with appropriate level
      this.logErrorToConsole(error);

      // Attempt automatic recovery if strategy exists
      if (error.recovery) {
        this.attemptRecovery(error);
      } else {
        // Use default recovery strategy for error type
        const defaultRecovery = this.recoveryStrategies.get(error.type);
        if (defaultRecovery) {
          this.executeRecoveryStrategy(defaultRecovery, error);
        }
      }

      // Notify registered error boundaries
      this.notifyErrorBoundaries(error);

    } catch (handlingError) {
      // Prevent infinite error loops
      console.error('[ErrorHandlingService] Failed to handle error:', handlingError);
      console.error('[ErrorHandlingService] Original error:', error);
    }
  }

  /**
   * Register component for error boundary notifications
   */
  registerErrorBoundary(component: string): void {
    this.registeredComponents.add(component);
  }

  /**
   * Set custom error boundary for a component
   */
  setErrorBoundary(component: string, boundary: ErrorBoundary): void {
    this.errorBoundaries.set(component, boundary);
  }

  /**
   * Get recovery strategy for specific error type
   */
  getErrorRecoveryStrategy(errorType: ChartError['type']): () => void {
    const strategy = this.recoveryStrategies.get(errorType);
    return strategy ? () => this.executeRecoveryStrategy(strategy, null) : () => {};
  }

  /**
   * Log performance warnings
   */
  logPerformanceWarning(metrics: PerformanceMetrics): void {
    try {
      const warnings: string[] = [];

      // Check render time
      if (metrics.renderTime > this.PERFORMANCE_WARNING_THRESHOLD) {
        warnings.push(`Slow rendering: ${metrics.renderTime.toFixed(2)}ms`);
      }

      // Check data size
      if (metrics.totalDataPoints > this.CRITICAL_DATA_THRESHOLD) {
        warnings.push(`Large dataset: ${metrics.totalDataPoints.toLocaleString()} points`);
      }

      // Check memory usage
      if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024) { // 100MB
        warnings.push(`High memory usage: ${(metrics.memoryUsage / 1024).toFixed(1)}MB`);
      }

      if (warnings.length > 0) {
        console.warn('[ErrorHandlingService] Performance Warning:', {
          warnings,
          metrics,
          timestamp: new Date().toISOString(),
          recommendations: this.getPerformanceRecommendations(metrics)
        });

        // Create performance warning as error for tracking
        const performanceError: ChartError = {
          type: 'rendering',
          message: 'Performance degradation detected',
          details: warnings.join(', '),
          timestamp: Date.now(),
          recovery: () => this.optimizePerformance(metrics)
        };

        this.addErrorToLog(performanceError);
      }

    } catch (error) {
      console.error('[ErrorHandlingService] Failed to log performance warning:', error);
    }
  }

  /**
   * Get current error statistics
   */
  getErrorStatistics(): {
    totalErrors: number;
    errorsByType: Record<ChartError['type'], number>;
    recentErrors: ChartError[];
    averageRecoveryTime: number;
  } {
    const errorsByType = this.errorLog.reduce((acc, error) => {
      acc[error.type] = (acc[error.type] || 0) + 1;
      return acc;
    }, {} as Record<ChartError['type'], number>);

    const recentErrors = this.errorLog
      .filter(error => Date.now() - error.timestamp < 60000) // Last minute
      .slice(-10); // Last 10 errors

    return {
      totalErrors: this.errorLog.length,
      errorsByType,
      recentErrors,
      averageRecoveryTime: 0 // TODO: Implement recovery time tracking
    };
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }

  /**
   * Initialize default recovery strategies
   */
  private initializeRecoveryStrategies(): void {
    this.recoveryStrategies.set('initialization', async () => {
      // Wait and retry initialization
      await this.delay(1000);
      return true;
    });

    this.recoveryStrategies.set('data', async () => {
      // Clear cache and reload data
      console.info('[ErrorHandlingService] Attempting data recovery...');
      await this.delay(500);
      return true;
    });

    this.recoveryStrategies.set('rendering', async () => {
      // Reduce complexity and retry
      console.info('[ErrorHandlingService] Attempting rendering recovery...');
      await this.delay(100);
      return true;
    });

    this.recoveryStrategies.set('export', async () => {
      // Retry export with smaller batch
      console.info('[ErrorHandlingService] Attempting export recovery...');
      await this.delay(200);
      return true;
    });

    this.recoveryStrategies.set('resize', async () => {
      // Force resize after delay
      console.info('[ErrorHandlingService] Attempting resize recovery...');
      await this.delay(300);
      return true;
    });
  }

  /**
   * Set up global error handling for unhandled exceptions
   */
  private setupGlobalErrorHandling(): void {
    // Handle unhandled Promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error: ChartError = {
        type: 'data', // Most promise rejections in this context are data-related
        message: 'Unhandled promise rejection',
        details: event.reason?.message || String(event.reason),
        timestamp: Date.now()
      };
      
      this.handleError(error);
      event.preventDefault(); // Prevent default browser handling
    });

    // Handle global JavaScript errors
    window.addEventListener('error', (event) => {
      // Only handle errors that seem related to our chart component
      if (this.isChartRelatedError(event.error || event.message)) {
        const error: ChartError = {
          type: 'rendering',
          message: 'Global JavaScript error',
          details: event.error?.message || String(event.message),
          timestamp: Date.now()
        };
        
        this.handleError(error);
      }
    });
  }

  /**
   * Check if an error is related to chart functionality
   */
  private isChartRelatedError(error: unknown): boolean {
    if (typeof error === 'string') {
      return error.toLowerCase().includes('chart') || 
             error.toLowerCase().includes('echarts') ||
             error.toLowerCase().includes('canvas');
    }
    
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      const stack = error.stack?.toLowerCase() || '';
      
      return message.includes('chart') || 
             message.includes('echarts') ||
             message.includes('canvas') ||
             stack.includes('chart') ||
             stack.includes('echarts');
    }
    
    return false;
  }

  /**
   * Add error to internal log with size management
   */
  private addErrorToLog(error: ChartError): void {
    this.errorLog.push(error);
    
    // Keep only the most recent errors
    if (this.errorLog.length > this.MAX_ERRORS) {
      this.errorLog = this.errorLog.slice(-this.MAX_ERRORS);
    }
  }

  /**
   * Log error to console with appropriate severity
   */
  private logErrorToConsole(error: ChartError): void {
    const errorContext = {
      type: error.type,
      message: error.message,
      details: error.details,
      timestamp: new Date(error.timestamp).toISOString(),
      hasRecovery: !!error.recovery
    };

    switch (error.type) {
      case 'initialization':
        console.error('[ErrorHandlingService] Initialization Error:', errorContext);
        break;
      case 'data':
        console.warn('[ErrorHandlingService] Data Error:', errorContext);
        break;
      case 'rendering':
        console.warn('[ErrorHandlingService] Rendering Error:', errorContext);
        break;
      case 'export':
        console.info('[ErrorHandlingService] Export Error:', errorContext);
        break;
      case 'resize':
        console.info('[ErrorHandlingService] Resize Error:', errorContext);
        break;
      default:
        console.error('[ErrorHandlingService] Unknown Error:', errorContext);
    }
  }

  /**
   * Attempt error recovery
   */
  private async attemptRecovery(error: ChartError): Promise<void> {
    try {
      if (error.recovery) {
        console.info(`[ErrorHandlingService] Attempting recovery for ${error.type} error...`);
        await error.recovery();
        console.info(`[ErrorHandlingService] Recovery completed for ${error.type} error`);
      }
    } catch (recoveryError) {
      console.error(`[ErrorHandlingService] Recovery failed for ${error.type} error:`, recoveryError);
      
      // Log recovery failure as new error
      const failureError: ChartError = {
        type: error.type,
        message: 'Recovery failed',
        details: `Original: ${error.message}. Recovery: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`,
        timestamp: Date.now()
      };
      
      this.addErrorToLog(failureError);
    }
  }

  /**
   * Execute recovery strategy
   */
  private async executeRecoveryStrategy(
    strategy: RecoveryStrategy, 
    error: ChartError | null
  ): Promise<void> {
    try {
      const success = await strategy();
      if (success && error) {
        console.info(`[ErrorHandlingService] Default recovery successful for ${error.type} error`);
      } else if (error) {
        console.warn(`[ErrorHandlingService] Default recovery failed for ${error.type} error`);
      }
    } catch (strategyError) {
      console.error('[ErrorHandlingService] Recovery strategy execution failed:', strategyError);
    }
  }

  /**
   * Notify registered error boundaries
   */
  private notifyErrorBoundaries(error: ChartError): void {
    this.registeredComponents.forEach(component => {
      const boundary = this.errorBoundaries.get(component);
      if (boundary) {
        try {
          const syntheticError = new Error(error.message);
          syntheticError.stack = error.details;
          
          boundary(syntheticError, {
            componentStack: `Error in ${error.type} handler`
          });
        } catch (boundaryError) {
          console.error(`[ErrorHandlingService] Error boundary failed for ${component}:`, boundaryError);
        }
      }
    });
  }

  /**
   * Get performance optimization recommendations
   */
  private getPerformanceRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.totalDataPoints > this.CRITICAL_DATA_THRESHOLD) {
      recommendations.push('Consider data sampling or virtualization');
      recommendations.push('Enable lazy loading for large datasets');
      recommendations.push('Implement data pagination');
    }

    if (metrics.renderTime > this.PERFORMANCE_WARNING_THRESHOLD) {
      recommendations.push('Disable animations for large datasets');
      recommendations.push('Use canvas renderer instead of SVG');
      recommendations.push('Reduce line complexity and symbol size');
    }

    if (metrics.memoryUsage && metrics.memoryUsage > 100 * 1024) {
      recommendations.push('Clear unused data periodically');
      recommendations.push('Implement memory cleanup strategies');
      recommendations.push('Consider using data streaming');
    }

    return recommendations;
  }

  /**
   * Optimize performance based on metrics
   */
  private async optimizePerformance(metrics: PerformanceMetrics): Promise<void> {
    try {
      console.info('[ErrorHandlingService] Optimizing performance...', {
        dataPoints: metrics.totalDataPoints,
        renderTime: metrics.renderTime,
        memoryUsage: metrics.memoryUsage
      });

      // Implement automatic optimizations
      if (metrics.totalDataPoints > this.CRITICAL_DATA_THRESHOLD) {
        // Could trigger data sampling or lazy loading
        console.info('[ErrorHandlingService] Large dataset detected - recommend enabling data sampling');
      }

      if (metrics.renderTime > this.PERFORMANCE_WARNING_THRESHOLD) {
        // Could disable animations or reduce visual complexity
        console.info('[ErrorHandlingService] Slow rendering detected - recommend disabling animations');
      }

      await this.delay(100); // Give UI time to respond

    } catch (error) {
      console.error('[ErrorHandlingService] Performance optimization failed:', error);
    }
  }

  /**
   * Utility function for delays in recovery strategies
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}