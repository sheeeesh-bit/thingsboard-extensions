/**
 * Screen Capture Service
 * Handles Screen Capture API interactions and video stream management
 */

import { VideoDimensions, CaptureMetrics } from '../models/screenshot.models';
import { DimensionCalculator } from '../utils/dimension-calculator';
import { BrowserDetector } from '../utils/browser-detector';

export class ScreenCaptureService {

  /**
   * Initiates screen capture and returns video element
   */
  static async initiateCapture(): Promise<HTMLVideoElement> {
    const isFirefox = BrowserDetector.isFirefox();

    const options = isFirefox
      ? this.getFirefoxOptions()
      : this.getChromeOptions();

    const stream = await navigator.mediaDevices.getDisplayMedia(options);
    const video = document.createElement('video');
    video.srcObject = stream;
    await video.play();

    // Wait for stream to stabilize
    await this.delay(300);

    return video;
  }

  /**
   * Analyzes video and viewport to extract capture metrics
   */
  static analyzeCaptureMetrics(
    video: HTMLVideoElement,
    targetElement: HTMLElement,
    windowHeightBefore: number
  ): { dimensions: VideoDimensions; metrics: CaptureMetrics } {
    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const windowWidth = window.innerWidth;
    const windowHeightAfter = window.innerHeight;

    // Calculate actual DPR from video capture (more accurate than window.devicePixelRatio)
    const dpr = DimensionCalculator.calculateDPR(videoWidth, windowWidth);

    // Detect notification height
    const notificationHeight = DimensionCalculator.detectNotificationHeight(
      windowHeightBefore,
      windowHeightAfter,
      dpr
    );

    // Detect browser chrome (Firefox window sharing)
    const browserChromeHeight = DimensionCalculator.detectBrowserChrome(
      videoHeight,
      windowHeightAfter,
      dpr
    );

    const hasBrowserChrome = browserChromeHeight > 50;

    return {
      dimensions: { width: videoWidth, height: videoHeight, dpr },
      metrics: {
        notificationHeight,
        browserChromeHeight,
        headerHeight: 0, // Set later after header detection
        dpr,
        hasBrowserChrome
      }
    };
  }

  /**
   * Stops video stream
   */
  static stopStream(video: HTMLVideoElement): void {
    const stream = video.srcObject as MediaStream;
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  }

  private static getChromeOptions(): any {
    return {
      video: {
        displaySurface: 'browser',
        width: { ideal: 4096 },
        height: { ideal: 4096 }
      },
      audio: false,
      preferCurrentTab: true,
      selfBrowserSurface: 'include',
      surfaceSwitching: 'include',
      systemAudio: 'exclude'
    };
  }

  private static getFirefoxOptions(): any {
    return {
      video: {
        mediaSource: 'screen',
        width: { ideal: 4096 },
        height: { ideal: 4096 },
        cursor: 'never'
      },
      audio: false
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
