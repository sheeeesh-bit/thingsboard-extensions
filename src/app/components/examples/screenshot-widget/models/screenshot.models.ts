/**
 * Core interfaces and types for screenshot functionality
 */

export interface VideoDimensions {
  width: number;
  height: number;
  dpr: number;
}

export interface ViewportDimensions {
  scrollHeight: number;
  clientHeight: number;
  scrollWidth: number;
  clientWidth: number;
}

export interface CaptureMetrics {
  notificationHeight: number;
  browserChromeHeight: number;
  headerHeight: number;
  dpr: number;
  hasBrowserChrome: boolean;
}

export interface CapturedPiece {
  canvas: HTMLCanvasElement;
  pieceIndex: number;
  cropTop: number;
  cropBottom: number;
}

export interface BrowserInfo {
  supported: boolean;
  browserName: string;
  reason?: string;
  isFirefox: boolean;
}

export interface ScreenshotSettings {
  renderDelay?: number;
  blockInput?: boolean;
  bottomCompensation?: number;
  showDebugInfo?: boolean;
  logContext?: boolean;
  scrollPreview?: boolean;
  downloadIndividual?: boolean;
  showWarningDialog?: boolean;
  useDefaultWarning?: boolean;
  warningMessage?: string;
}
