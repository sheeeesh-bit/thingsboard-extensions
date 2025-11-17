/**
 * Browser Detection Utility
 * Detects browser type and support status for screenshot functionality
 */

import { BrowserInfo } from '../models/screenshot.models';

const SUPPORTED_BROWSERS = [
  { name: 'Chrome', pattern: 'chrome', exclude: 'edg|opr' },
  { name: 'Edge', pattern: 'edg' },
  { name: 'Brave', pattern: 'brave' },
  { name: 'Arc', pattern: 'arc' },
  { name: 'Helium', pattern: 'helium' }
];

const UNSUPPORTED_BROWSERS = [
  { name: 'Firefox', pattern: 'firefox', reason: 'Requires window sharing instead of tab' },
  { name: 'Opera GX', pattern: 'opr|opera', reason: 'May have compatibility issues' },
  { name: 'Zen Browser', pattern: 'zen', reason: 'Not fully tested' }
];

export class BrowserDetector {

  static detect(): BrowserInfo {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check supported browsers
    for (const browser of SUPPORTED_BROWSERS) {
      if (this.matches(userAgent, browser.pattern, browser.exclude)) {
        return { supported: true, browserName: browser.name, isFirefox: false };
      }
    }

    // Check unsupported browsers
    for (const browser of UNSUPPORTED_BROWSERS) {
      if (new RegExp(browser.pattern, 'i').test(userAgent)) {
        return {
          supported: false,
          browserName: browser.name,
          reason: browser.reason,
          isFirefox: browser.name === 'Firefox'
        };
      }
    }

    // Unknown browser
    return {
      supported: false,
      browserName: 'Unknown Browser',
      reason: 'Browser not tested',
      isFirefox: false
    };
  }

  static isFirefox(): boolean {
    return navigator.userAgent.toLowerCase().includes('firefox');
  }

  private static matches(userAgent: string, pattern: string, exclude?: string): boolean {
    const matchPattern = new RegExp(pattern, 'i');
    if (!matchPattern.test(userAgent)) {
      return false;
    }

    if (exclude) {
      const excludePattern = new RegExp(exclude, 'i');
      if (excludePattern.test(userAgent)) {
        return false;
      }
    }

    return true;
  }
}
