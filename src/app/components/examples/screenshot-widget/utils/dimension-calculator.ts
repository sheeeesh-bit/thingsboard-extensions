/**
 * Dimension Calculator Utility
 * Handles all dimension calculations for screenshot capture
 * Uses dynamic measurement approach inspired by Chrome extension
 */

import { VideoDimensions, ViewportDimensions, CaptureMetrics } from '../models/screenshot.models';

export class DimensionCalculator {

  /**
   * Measures element dimensions from multiple sources and returns maximum
   * More reliable than single source, especially with browser zoom
   */
  static measureElement(element: HTMLElement): ViewportDimensions {
    const body = document.body;

    const heights = [
      document.documentElement.clientHeight,
      body?.scrollHeight || 0,
      document.documentElement.scrollHeight,
      body?.offsetHeight || 0,
      document.documentElement.offsetHeight,
      element.scrollHeight,
      element.offsetHeight
    ].filter(h => h > 0);

    const widths = [
      document.documentElement.clientWidth,
      body?.scrollWidth || 0,
      document.documentElement.scrollWidth,
      body?.offsetWidth || 0,
      document.documentElement.offsetWidth,
      element.scrollWidth,
      element.offsetWidth
    ].filter(w => w > 0);

    return {
      scrollHeight: Math.max(...heights),
      clientHeight: element.clientHeight,
      scrollWidth: Math.max(...widths),
      clientWidth: element.clientWidth
    };
  }

  /**
   * Calculates actual DPR from video dimensions vs window dimensions
   * More accurate than window.devicePixelRatio (handles zoom, etc.)
   */
  static calculateDPR(videoWidth: number, windowWidth: number): number {
    return videoWidth / windowWidth;
  }

  /**
   * Detects notification height by comparing viewport before/after sharing
   */
  static detectNotificationHeight(
    beforeHeight: number,
    afterHeight: number,
    dpr: number
  ): number {
    const cssHeight = beforeHeight - afterHeight;
    return Math.ceil(cssHeight * dpr);
  }

  /**
   * Detects browser chrome (tabs, address bar) when window is shared
   * Returns height in video pixels
   */
  static detectBrowserChrome(
    videoHeight: number,
    windowHeight: number,
    dpr: number
  ): number {
    const expectedVideoHeight = windowHeight * dpr;
    const extraHeight = videoHeight - expectedVideoHeight;
    return Math.max(0, extraHeight);
  }

  /**
   * Calculates sticky header height with correct DPR
   */
  static calculateHeaderHeight(cssHeight: number, dpr: number): number {
    return Math.ceil(cssHeight * dpr);
  }

  /**
   * Calculates number of pieces needed to capture full content
   */
  static calculatePieceCount(
    totalHeight: number,
    piece1Content: number,
    middlePieceContent: number
  ): number {
    const remainingAfterPiece1 = totalHeight - piece1Content;
    const additionalPieces = Math.ceil(remainingAfterPiece1 / middlePieceContent);
    return 1 + additionalPieces;
  }

  /**
   * Detects if there's a gap between last middle piece and final piece
   * Returns gap size in CSS pixels
   */
  static detectGap(
    piece1End: number,
    scrollIncrement: number,
    additionalPieces: number,
    lastPieceStart: number,
    clientHeight: number
  ): number {
    const secondToLastScroll = piece1End + ((additionalPieces - 2) * scrollIncrement);
    const secondToLastEnd = secondToLastScroll + clientHeight;
    return lastPieceStart - secondToLastEnd;
  }
}
