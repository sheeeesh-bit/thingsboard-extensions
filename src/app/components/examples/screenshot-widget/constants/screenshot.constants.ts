/**
 * Screenshot Widget Constants
 * Centralized configuration values
 */

export const SCREENSHOT_CONSTANTS = {
  // Timing
  STREAM_STABILIZE_DELAY: 300,
  SCROLL_SETTLE_DELAY: 500,
  DEFAULT_RENDER_DELAY: 1500,
  CLEANUP_DELAY: 2000,

  // Thresholds
  BROWSER_CHROME_THRESHOLD: 50, // If extra height > 50px, window was shared
  GAP_DETECTION_THRESHOLD: 10,  // Pixels

  // Default Values
  DEFAULT_BOTTOM_COMPENSATION: 95,
  DEFAULT_QUALITY: 0.95,
  DEFAULT_FORMAT: 'png' as const,

  // Video Capture
  IDEAL_VIDEO_RESOLUTION: 4096,

  // Element Detection
  TOP_HEADER_MAX_TOP: 150,
  TOP_HEADER_MIN_WIDTH_RATIO: 0.5,
  TOP_HEADER_MAX_HEIGHT: 200,

  // UI
  BLOCKER_Z_INDEX: 999999,
  DIALOG_Z_INDEX: 999998,

  // IDs
  INPUT_BLOCKER_ID: 'screenshot-input-blocker',
  STYLE_BLOCKER_ID: 'screenshot-hide-cursor-tooltips'
} as const;

export const TRANSPARENT_CURSOR_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
