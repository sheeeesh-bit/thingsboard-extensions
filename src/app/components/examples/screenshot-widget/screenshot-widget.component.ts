import {
  AfterViewInit,
  Component,
  Input,
  OnInit,
  OnDestroy
} from '@angular/core';
import { WidgetContext } from '@home/models/widget-component.models';
import html2canvas from 'html2canvas';

interface CaptureOptions {
  scrollIncrement?: number;
  quality?: number;
  format?: 'png' | 'jpeg';
}

// Browser support configuration
// Note: Vivaldi masquerades as Chrome and cannot be reliably detected in web pages
// Since it's Chromium-based, it will be treated as Chrome (which is fine)
const BrowserSupport = {
  supportedBrowsers: [
    { name: 'Chrome', userAgentPattern: 'chrome', excludePattern: 'edg|opr' },
    { name: 'Edge', userAgentPattern: 'edg' },
    { name: 'Brave', userAgentPattern: 'brave' },
    { name: 'Arc', userAgentPattern: 'arc' },
    { name: 'Helium', userAgentPattern: 'helium' }
  ],
  unsupportedBrowsers: [
    { name: 'Firefox', userAgentPattern: 'firefox', reason: 'Firefox requires sharing the entire window instead of individual tabs' },
    { name: 'Opera GX', userAgentPattern: 'opr|opera', reason: 'Opera may have compatibility issues with screen capture' },
    { name: 'Zen Browser', userAgentPattern: 'zen', reason: 'Zen Browser compatibility not fully tested' }
  ],
  messages: {
    supported: {
      title: 'Ready to Capture',
      instructions: [
        'Move your MOUSE/CURSOR to the edge of the screen or outside the window',
        'Please don\'t scroll or use your keyboard during capture',
        'Disable rotation for 3D widgets (use stop rotation button)',
        'Make sure all animations are paused'
      ],
      browserNote: 'The current tab should be pre-selected. Just click "Share" in the picker.',
      action: 'Start Capture'
    },
    unsupported: {
      title: '⚠️ Browser Not Officially Supported',
      warningPrefix: 'This browser is not officially supported for screenshots.',
      recommendation: 'We recommend using Chrome, Edge, Brave, Arc, or Helium for the best experience.',
      instructions: [
        'Move your MOUSE/CURSOR to the edge of the screen or outside the window',
        'Please don\'t scroll or use your keyboard during capture',
        'Disable rotation for 3D widgets (use stop rotation button)',
        'Make sure all animations are paused'
      ],
      action: 'Try Anyway'
    },
    firefox: {
      specificNote: 'In the sharing picker, you must select "Firefox" (entire window) or "Window". Individual tab selection is not available.'
    }
  }
};

@Component({
  selector: 'tb-screenshot-widget',
  templateUrl: './screenshot-widget.component.html',
  styleUrls: ['./screenshot-widget.component.scss']
})
export class ScreenshotWidgetComponent implements OnInit, AfterViewInit, OnDestroy {

  @Input() ctx: WidgetContext;

  public loading = false;
  public error: string | null = null;
  public statusMessage = '';
  private warningDialogElement: HTMLElement | null = null;
  private enableDebugLogs = false; // Set to true to enable detailed console logs

  /**
   * Debug logging helper - only logs if debug is enabled
   */
  private debug(...args: any[]): void {
    if (this.enableDebugLogs || this.ctx?.settings?.showDebugInfo) {
      console.log('[Screenshot Widget]', ...args);
    }
  }

  ngOnInit(): void {
    // Log context only if setting is enabled
    if (this.ctx?.settings?.logContext) {
      console.log('[Screenshot Widget] Widget Context:', this.ctx);
    }
    this.ctx.$scope.screenshotWidgetComponent = this;
  }

  ngAfterViewInit(): void {
    this.debug('AfterViewInit');
    // Initial data load if available
    if (this.ctx.data && this.ctx.data.length > 0) {
      this.onDataUpdated();
    }
  }

  ngOnDestroy(): void {
    this.debug('Component destroyed');
    // Clean up warning dialog if it exists
    this.removeWarningDialog();
  }

  public onDataUpdated(): void {
    this.debug('onDataUpdated called');

    if (!this.ctx.data || this.ctx.data.length === 0) {
      this.debug('No data available');
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
      return;
    }

    this.error = null;

    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }
  }

  public onResize(): void {
    this.debug('onResize called');
  }

  /**
   * Called when user clicks the capture button
   * Shows warning dialog if enabled, otherwise starts capture directly
   */
  public onCaptureClick(): void {
    this.debug(' onCaptureClick called');
    this.debug(' Settings:', this.ctx.settings);

    const shouldShowWarning = this.ctx.settings.showWarningDialog !== false;
    this.debug(' shouldShowWarning:', shouldShowWarning);

    if (shouldShowWarning) {
      this.debug(' Showing warning dialog...');
      this.showWarningDialog();
    } else {
      this.debug(' Skipping warning, starting capture directly...');
      this.captureScreenshot();
    }
  }

  /**
   * Detects browser support status
   */
  private detectBrowserSupport(): { supported: boolean; browserName: string; reason?: string; isFirefox: boolean } {
    const userAgent = navigator.userAgent.toLowerCase();

    // Check supported browsers first
    for (const browser of BrowserSupport.supportedBrowsers) {
      const pattern = new RegExp(browser.userAgentPattern, 'i');
      if (pattern.test(userAgent)) {
        // Check exclusion pattern (e.g., Chrome but not Edge/Opera)
        if (browser.excludePattern) {
          const excludePattern = new RegExp(browser.excludePattern, 'i');
          if (excludePattern.test(userAgent)) {
            continue; // Skip this match
          }
        }
        return { supported: true, browserName: browser.name, isFirefox: false };
      }
    }

    // Check unsupported browsers
    for (const browser of BrowserSupport.unsupportedBrowsers) {
      const pattern = new RegExp(browser.userAgentPattern, 'i');
      if (pattern.test(userAgent)) {
        return {
          supported: false,
          browserName: browser.name,
          reason: browser.reason,
          isFirefox: browser.name === 'Firefox'
        };
      }
    }

    // Unknown browser - treat as unsupported
    return {
      supported: false,
      browserName: 'Unknown Browser',
      reason: 'This browser has not been tested with the screenshot widget',
      isFirefox: false
    };
  }

  /**
   * Shows warning dialog by appending it to document.body (breaks out of widget container)
   */
  private showWarningDialog(): void {
    this.debug(' showWarningDialog() called');

    // Don't create if already exists
    if (this.warningDialogElement) {
      this.debug(' Dialog already exists, skipping');
      return;
    }

    // Check if using default or custom message
    const useDefault = this.ctx.settings.useDefaultWarning !== false;

    let message: string;
    let dialogTitle = 'Prepare for Screenshot';
    let actionButtonText = 'Start Capture';

    if (useDefault) {
      // Detect browser support
      const browserInfo = this.detectBrowserSupport();
      this.debug(' Browser detection:', browserInfo);

      if (browserInfo.supported) {
        // Supported browser - use positive messaging
        dialogTitle = BrowserSupport.messages.supported.title;
        actionButtonText = BrowserSupport.messages.supported.action;

        const instructions = BrowserSupport.messages.supported.instructions.map((i: string) => '• ' + i).join('\n');
        const browserNote = BrowserSupport.messages.supported.browserNote;

        message = `Before capturing:\n\n${instructions}\n\n✅ ${browserInfo.browserName.toUpperCase()}:\n${browserNote}\n\nClick "${actionButtonText}" when ready, then keep your mouse at the edge!`;
      } else {
        // Unsupported browser - show warning but allow trying
        dialogTitle = BrowserSupport.messages.unsupported.title;
        actionButtonText = BrowserSupport.messages.unsupported.action;

        const warningPrefix = BrowserSupport.messages.unsupported.warningPrefix;
        const recommendation = BrowserSupport.messages.unsupported.recommendation;
        const instructions = BrowserSupport.messages.unsupported.instructions.map((i: string) => '• ' + i).join('\n');

        let browserSpecificNote = '';
        if (browserInfo.isFirefox) {
          browserSpecificNote = `\n\n🦊 FIREFOX SPECIFIC:\n${BrowserSupport.messages.firefox.specificNote}`;
        }

        message = `⚠️ ${warningPrefix}\n\n${recommendation}\n\nIf you want to try anyway:\n\n${instructions}${browserSpecificNote}\n\nClick "${actionButtonText}" to proceed at your own risk.`;
      }
    } else {
      // Use custom message from settings
      message = this.ctx.settings.warningMessage || 'Please prepare your dashboard before capturing.\n\nClick "Start Capture" when ready.';
    }

    this.debug(' Creating overlay element...');

    // Create overlay with INLINE styles (component styles don't apply to elements outside component)
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      background-color: rgba(0, 0, 0, 0.6) !important;
      backdrop-filter: blur(8px);
      z-index: 999998 !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      margin: 0 !important;
      padding: 20px;
      box-sizing: border-box;
    `;

    overlay.innerHTML = `
      <div class="screenshot-warning-dialog" style="
        position: relative;
        background: white;
        border-radius: 12px;
        padding: 32px;
        max-width: 600px;
        min-width: 400px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      ">
        <h3 style="
          margin: 0 0 20px 0;
          font-size: 24px;
          font-weight: 600;
          color: #305680;
          text-align: center;
        ">${dialogTitle}</h3>
        <div class="screenshot-warning-message" style="
          margin-bottom: 28px;
          font-size: 15px;
          line-height: 1.6;
          color: #333;
          white-space: pre-line;
          background: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #305680;
        ">${message.replace(/\n/g, '<br>')}</div>
        <div class="screenshot-warning-actions" style="
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        ">
          <button class="screenshot-btn-cancel" style="
            padding: 12px 28px;
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            background: #e0e0e0;
            color: #666;
          ">Cancel</button>
          <button class="screenshot-btn-start" style="
            padding: 12px 28px;
            border: none;
            border-radius: 6px;
            font-size: 15px;
            font-weight: 600;
            cursor: pointer;
            background: #305680;
            color: white;
          ">${actionButtonText}</button>
        </div>
      </div>
    `;

    this.debug(' Overlay created:', overlay);

    // Add event listeners
    const cancelBtn = overlay.querySelector('.screenshot-btn-cancel') as HTMLElement;
    const startBtn = overlay.querySelector('.screenshot-btn-start') as HTMLElement;

    this.debug(' Buttons found:', {cancelBtn, startBtn});

    cancelBtn.addEventListener('click', () => {
      this.debug(' Cancel clicked');
      this.removeWarningDialog();
    });
    startBtn.addEventListener('click', () => {
      this.debug(' Start Capture clicked');
      this.removeWarningDialog();
      this.captureScreenshot();
    });

    // Append to body (breaks out of widget container!)
    this.debug(' Appending to document.body...');
    document.body.appendChild(overlay);
    this.warningDialogElement = overlay;

    this.debug(' Warning dialog shown (appended to document.body)');
    this.debug(' Dialog element in DOM:', document.body.contains(overlay));
  }

  /**
   * Removes the warning dialog from document.body
   */
  private removeWarningDialog(): void {
    if (this.warningDialogElement && this.warningDialogElement.parentNode) {
      this.warningDialogElement.parentNode.removeChild(this.warningDialogElement);
      this.warningDialogElement = null;
      this.debug(' Warning dialog removed');
    }
  }

  /**
   * Captures a full-page screenshot using Screen Capture API + scroll and stitch
   * EXACTLY like the Chrome extension - captures real pixels, scrolls, stitches
   * OR in preview mode: just scrolls to show positions
   */
  private async captureScreenshot(): Promise<void> {
    // Check if scroll preview mode is enabled
    const isPreviewMode = this.ctx.settings.scrollPreview === true;

    if (isPreviewMode) {
      return this.scrollPreviewMode();
    }

    this.debug('captureScreenshot called - using Screen Capture API');
    this.loading = true;
    this.error = null;

    // Get user info and current date/time for display during capture
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();

    // Try to get user name from userService using userId
    let userName = 'User';
    try {
      console.log('[Screenshot Widget] 🔍 USER INFO DEBUG:');
      console.log('[Screenshot Widget] ctx.dashboard:', this.ctx?.dashboard);
      console.log('[Screenshot Widget] ctx.dashboard.authUser:', (this.ctx?.dashboard as any)?.authUser);
      console.log('[Screenshot Widget] ctx.$scope:', this.ctx?.$scope);
      console.log('[Screenshot Widget] ctx.$scope.currentUser:', this.ctx?.$scope?.currentUser);
      console.log('[Screenshot Widget] ctx.userService:', this.ctx?.userService);

      // Try to get userId from various possible locations
      const userIdOption1 = (this.ctx?.dashboard as any)?.authUser?.userId;
      const userIdOption2 = this.ctx?.$scope?.currentUser?.userId;
      const userIdOption3 = this.ctx?.$scope?.currentUser?.id?.id;

      console.log('[Screenshot Widget] userId from dashboard.authUser:', userIdOption1);
      console.log('[Screenshot Widget] userId from $scope.currentUser:', userIdOption2);
      console.log('[Screenshot Widget] userId from $scope.currentUser.id:', userIdOption3);

      const userId = userIdOption1 || userIdOption2 || userIdOption3;
      console.log('[Screenshot Widget] Final userId selected:', userId);

      if (userId && this.ctx?.userService) {
        console.log('[Screenshot Widget] ✅ Attempting to fetch user from userService...');
        // Fetch user details asynchronously
        this.ctx.userService.getUser(userId, {ignoreLoading: true, ignoreErrors: true}).subscribe({
          next: (user) => {
            console.log('[Screenshot Widget] ✅ User fetched successfully:', user);
            if (user) {
              const fullName = user.firstName && user.lastName
                ? `${user.firstName} ${user.lastName}`
                : user.email || 'User';
              console.log('[Screenshot Widget] User full name:', fullName);
              this.statusMessage = `${fullName} | ${dateStr} ${timeStr}`;
              if (this.ctx.detectChanges) {
                this.ctx.detectChanges();
              }
            }
          },
          error: (error) => {
            console.error('[Screenshot Widget] ❌ Failed to load user from userService:', error);
          }
        });
      } else {
        console.log('[Screenshot Widget] ⚠️ No userId or userService available, using fallback');
        // Fallback to simpler methods
        userName = this.ctx?.$scope?.currentUser?.name || this.ctx?.$scope?.currentUser?.email || 'User';
        console.log('[Screenshot Widget] Fallback username:', userName);
      }
    } catch (e) {
      console.error('[Screenshot Widget] ❌ Error getting user info:', e);
      userName = 'User';
    }

    // Set initial status (will be updated if user fetch succeeds)
    this.statusMessage = `${userName} | ${dateStr} ${timeStr}`;

    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }

    let stream: MediaStream | null = null;

    try {
      // Get target element (gridster for dashboard)
      const targetElement = this.getCaptureTarget();
      if (!targetElement) {
        throw new Error('No target element found');
      }

      // DYNAMIC dimension calculation - like Chrome extension!
      // Take MAX of multiple sources for more accurate measurement
      const body = document.body;
      const heights = [
        document.documentElement.clientHeight,
        body ? body.scrollHeight : 0,
        document.documentElement.scrollHeight,
        body ? body.offsetHeight : 0,
        document.documentElement.offsetHeight,
        targetElement.scrollHeight,
        targetElement.offsetHeight
      ];
      const widths = [
        document.documentElement.clientWidth,
        body ? body.scrollWidth : 0,
        document.documentElement.scrollWidth,
        body ? body.offsetWidth : 0,
        document.documentElement.offsetWidth,
        targetElement.scrollWidth,
        targetElement.offsetWidth
      ];

      // Filter out null/undefined and get max
      const maxHeight = Math.max(...heights.filter(x => x));
      const maxWidth = Math.max(...widths.filter(x => x));

      const scrollHeight = targetElement.scrollHeight;
      const clientHeight = targetElement.clientHeight;
      const needsScrolling = scrollHeight > clientHeight + 10;

      this.debug(' Target (single source):', {
        element: targetElement.tagName,
        scrollHeight,
        clientHeight
      });
      this.debug(' Target (dynamic - like Chrome extension):', {
        allHeights: heights,
        allWidths: widths,
        maxHeight,
        maxWidth,
        usingMaxForHeight: maxHeight > scrollHeight
      });
      this.debug(' Will use:', {
        scrollHeight,
        clientHeight,
        needsScrolling
      });

      // Request screen capture permission
      // Different browsers have different options for defaulting to current tab
      const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');

      let displayMediaOptions: any;

      if (isFirefox) {
        // Firefox-specific options
        // NOTE: Firefox may not show individual tabs, only windows/screens
        displayMediaOptions = {
          video: {
            mediaSource: 'screen',        // Firefox: try 'screen' which includes tabs in some versions
            width: { ideal: 4096 },
            height: { ideal: 4096 },
            cursor: 'never'               // Try to exclude cursor (Firefox-specific)
          },
          audio: false
        };

        this.debug(' ⚠️ Firefox Note: You may need to share the entire window instead of just a tab');
      } else {
        // Chrome/Edge options
        displayMediaOptions = {
          video: {
            displaySurface: 'browser',    // Prefer browser tab
            width: { ideal: 4096 },
            height: { ideal: 4096 }
          },
          audio: false,
          preferCurrentTab: true,         // Chrome/Edge: Make current tab the default!
          selfBrowserSurface: 'include',  // Additional Chrome option
          surfaceSwitching: 'include',
          systemAudio: 'exclude'
        };
      }

      this.debug(' Browser:', isFirefox ? 'Firefox' : 'Chrome/Edge');
      this.debug(' Display media options:', displayMediaOptions);

      stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);

      const [track] = stream.getVideoTracks();

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // MEASURE VIEWPORT BEFORE notification fully appears
      const windowHeightBeforeNotification = window.innerHeight;
      const clientHeightBeforeNotification = targetElement.clientHeight;

      // Get actual video dimensions - THIS includes the notification!
      await this.delay(300);
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      // MEASURE VIEWPORT AFTER notification appears
      const windowHeightAfterNotification = window.innerHeight;
      const clientHeightAfterNotification = targetElement.clientHeight;

      // DYNAMIC DPR calculation FIRST - like Chrome extension!
      // Calculate ACTUAL scale based on captured video vs window dimensions
      const windowWidth = window.innerWidth;
      const reportedDpr = window.devicePixelRatio || 1;

      // Calculate actual DPR from video dimensions (using width as it's most reliable)
      const actualDprFromWidth = videoWidth / windowWidth;
      const dpr = actualDprFromWidth;

      // DYNAMIC NOTIFICATION HEIGHT DETECTION!
      // The difference in window height = notification height in CSS pixels
      const notificationHeightCSS = windowHeightBeforeNotification - windowHeightAfterNotification;
      const notificationHeightEstimate = Math.ceil(notificationHeightCSS * dpr);

      // DYNAMIC BROWSER CHROME DETECTION (for Firefox window sharing)!
      // If video is taller than expected, extra height = browser chrome (tabs, address bar, etc.)
      const expectedVideoHeight = windowHeightAfterNotification * dpr;
      const actualVideoHeight = videoHeight;
      const extraHeightInVideo = actualVideoHeight - expectedVideoHeight;
      const browserChromeHeight = Math.max(0, extraHeightInVideo); // Browser UI height in video pixels

      const hasBrowserChrome = browserChromeHeight > 50; // If >50px extra, user shared window not tab

      this.debug(' 🔍 NOTIFICATION DETECTION:', {
        windowHeightBefore: windowHeightBeforeNotification,
        windowHeightAfter: windowHeightAfterNotification,
        notificationCSS: notificationHeightCSS,
        notificationVideoPixels: notificationHeightEstimate,
        browser: isFirefox ? 'Firefox' : 'Chrome/Edge'
      });

      this.debug(' 🖼️ BROWSER CHROME DETECTION:', {
        expectedVideoHeight,
        actualVideoHeight,
        extraHeight: extraHeightInVideo,
        browserChromeHeight,
        hasBrowserChrome,
        note: hasBrowserChrome ? '⚠️ Window shared (includes browser UI)' : '✅ Tab shared (no browser UI)'
      });

      this.debug(' Video dimensions:', {
        videoWidth,
        videoHeight,
        windowWidth,
        windowHeight: windowHeightAfterNotification,
        reportedDpr,
        actualDprFromWidth,
        usingDpr: dpr,
        note: 'DPR calculated dynamically from actual video dimensions!'
      });

      // NOW re-measure scrollHeight AFTER notification appears!
      // DYNAMIC approach like Chrome extension - take MAX of all sources
      const heightsAfter = [
        document.documentElement.clientHeight,
        body ? body.scrollHeight : 0,
        document.documentElement.scrollHeight,
        body ? body.offsetHeight : 0,
        document.documentElement.offsetHeight,
        targetElement.scrollHeight,
        targetElement.offsetHeight
      ];
      const scrollHeightAfterNotification = Math.max(...heightsAfter.filter(x => x));
      // Note: clientHeightAfterNotification already measured above after notification appeared

      this.debug(' Dimensions after notification (dynamic):', {
        before: { scrollHeight, clientHeight },
        after: { scrollHeight: scrollHeightAfterNotification, clientHeight: clientHeightAfterNotification },
        allHeightsAfter: heightsAfter,
        changed: scrollHeightAfterNotification !== scrollHeight || clientHeightAfterNotification !== clientHeight
      });

      // USE THE AFTER VALUES for all calculations!
      const finalScrollHeight = scrollHeightAfterNotification;
      const finalClientHeight = clientHeightAfterNotification;

      // NOW calculate scroll positions based on ACTUAL video height (DPR already calculated above)
      const actualCapturedHeight = videoHeight;

      // Keep showing user info throughout capture
      await this.delay(200);

      if (!needsScrolling) {
        // Single capture - no scrolling needed
        // Status message already shows user/date/time, keep it

        const canvas = await this.captureFrame(video);
        track.stop();

        const url = await this.canvasToUrl(canvas);
        this.downloadScreenshotFromUrl(url);

        this.debug(' Single capture completed');
      } else {
        // Multi-capture - scroll and stitch like Chrome extension!
        this.debug(' Full-page capture - scrolling and stitching');

        const captures: HTMLCanvasElement[] = [];
        const originalScrollTop = targetElement.scrollTop;
        let pieceIndex = 0;

        // Block user input during capture (if enabled in settings)
        const shouldBlockInput = this.ctx.settings.blockInput !== false;
        if (shouldBlockInput) {
          this.blockUserInput(true, targetElement);
        }

        // Scroll to top
        targetElement.scrollTop = 0;
        await this.delay(500);

        // Find sticky/fixed headers - use ACTUAL DPR from video, not window.devicePixelRatio!
        const stickyElements = this.findStickyElements();
        const headerHeight = this.getMaxStickyHeight(stickyElements, dpr);

        // Notification height already detected dynamically above!
        // (notificationHeightEstimate variable is already available from earlier scope)

        // Convert gridster scrollHeight from CSS to video pixels
        // USE THE AFTER-NOTIFICATION VALUES!
        const gridsterHeightInPixels = Math.ceil(finalScrollHeight * dpr);

        // Piece 1: Captures full video height BUT browser chrome takes up space!
        const piece1ContentHeight = actualCapturedHeight;
        // Actual GRIDSTER content in piece 1 (after removing notification AND browser chrome space)
        const piece1GridsterContent = piece1ContentHeight - notificationHeightEstimate - browserChromeHeight;

        // Pieces 2+: Crop header + notification + browser chrome (if present) from middle pieces
        const headerOnlyHeight = headerHeight;
        const piece2PlusContentHeight = actualCapturedHeight - headerOnlyHeight - notificationHeightEstimate - browserChromeHeight;

        // Calculate notification in CSS pixels (needed for gap check)
        const notificationCSS = Math.floor(notificationHeightEstimate / dpr);

        // Calculate total pieces needed - USE piece1GridsterContent (not piece1ContentHeight!)
        const remainingAfterPiece1 = gridsterHeightInPixels - piece1GridsterContent;
        let additionalPieces = Math.ceil(remainingAfterPiece1 / piece2PlusContentHeight);

        // Calculate scroll increment early (needed for gap detection)
        const scrollIncrementCSS = Math.floor(piece2PlusContentHeight / dpr);

        // Check for gap - calculate where the last middle piece will end
        const lastPieceScrollPosition = finalScrollHeight - finalClientHeight;
        const piece1GridsterEnd = Math.floor(finalClientHeight - notificationCSS);
        const piece2ScrollStart = piece1GridsterEnd;

        // Calculate where the second-to-last MIDDLE piece ends
        // Second-to-last middle piece has loop index i = (additionalPieces - 1)
        // Its scroll position formula: piece2ScrollStart + ((i - 1) * scrollIncrementCSS)
        // So: piece2ScrollStart + (((additionalPieces - 1) - 1) * scrollIncrementCSS)
        const secondToLastPieceScroll = piece2ScrollStart + ((additionalPieces - 2) * scrollIncrementCSS);
        const secondToLastPieceEnd = secondToLastPieceScroll + finalClientHeight;
        const gapBeforeLastPiece = lastPieceScrollPosition - secondToLastPieceEnd;

        this.debug(' Gap analysis:', {
          piece1GridsterEnd,
          lastPieceScrollPosition,
          secondToLastPieceScroll,
          secondToLastPieceEnd,
          gapBeforeLastPiece,
          gapInVideoPixels: gapBeforeLastPiece * dpr
        });

        // If there's a significant gap before the last piece, add another middle piece
        if (gapBeforeLastPiece > 10) {
          additionalPieces++;
          this.debug(' ⚠️ Gap detected before last piece! Adding extra middle piece. Gap:', gapBeforeLastPiece, 'px CSS,', (gapBeforeLastPiece * dpr), 'px video');
        }

        const totalPieces = 1 + additionalPieces;

        this.debug(' Scroll positions:', {
          notificationCSS: notificationCSS,
          piece1GridsterEnd: piece1GridsterEnd,
          piece2ScrollStart: piece2ScrollStart,
          scrollIncrementCSS: scrollIncrementCSS,
          explanation: `Piece 1 captures ${piece1GridsterEnd}px of gridster (notification blocks ${notificationCSS}px), piece 2 continues from there`
        });

        this.debug(' ═══════════════════════════════');
        this.debug(' CAPTURE PLAN:');
        this.debug(' ═══════════════════════════════');
        this.debug(' Gridster dimensions (CSS - AFTER notification):', {
          scrollHeight: finalScrollHeight,
          clientHeight: finalClientHeight
        });
        this.debug(' Gridster in video pixels:', {
          totalHeight: gridsterHeightInPixels,
          calculation: `${scrollHeight} CSS × ${dpr} DPR = ${gridsterHeightInPixels}px`
        });
        this.debug(' Video frame size:', {
          width: videoWidth,
          height: videoHeight
        });
        this.debug(' Obstacles to crop:', {
          browserChromeHeight: browserChromeHeight,
          notificationHeight: notificationHeightEstimate,
          headerHeight: headerHeight,
          totalTopCrop: browserChromeHeight + notificationHeightEstimate + headerHeight,
          hasBrowserChrome: hasBrowserChrome,
          note: hasBrowserChrome ? '⚠️ Firefox window mode' : '✅ Tab mode'
        });
        this.debug(' Piece 1 coverage:', {
          totalCaptured: piece1ContentHeight,
          browserChromeInCapture: browserChromeHeight,
          notificationCropped: notificationHeightEstimate,
          actualGridsterContent: piece1GridsterContent,
          calculation: `${piece1ContentHeight} - ${notificationHeightEstimate} notification - ${browserChromeHeight} browser = ${piece1GridsterContent} gridster`,
          note: hasBrowserChrome ? 'Browser chrome takes space but stays in piece 1' : 'Tab mode - no browser chrome'
        });
        this.debug(' Pieces 2+ (middle) coverage:', {
          capturedPixels: actualCapturedHeight,
          cropTop: headerOnlyHeight + notificationHeightEstimate + browserChromeHeight,
          browserChromeCrop: browserChromeHeight,
          headerCrop: headerOnlyHeight,
          notificationCrop: notificationHeightEstimate,
          newContentPerPiece: piece2PlusContentHeight,
          note: 'Browser chrome cropped from pieces 2+ (sticky element)'
        });
        this.debug(' Total pieces calculation:', {
          gridsterTotal: gridsterHeightInPixels,
          piece1GridsterContent: piece1GridsterContent,
          afterPiece1Remaining: remainingAfterPiece1,
          piece2PlusContentPerPiece: piece2PlusContentHeight,
          additionalPiecesNeeded: additionalPieces,
          totalPieces: totalPieces,
          scrollIncrementCSS: scrollIncrementCSS,
          note: hasBrowserChrome ? `Browser chrome (${browserChromeHeight}px) reduces piece 1 gridster content` : 'Normal calculation'
        });
        this.debug(' ═══════════════════════════════');

        // Scroll through and capture each piece
        let totalCapturedContentHeight = 0; // Track how much we've captured

        for (let i = 0; i < totalPieces; i++) {
          pieceIndex = i + 1;
          const isLastPiece = (pieceIndex === totalPieces);

          // Calculate scroll position accounting for notification in piece 1
          let currentScroll: number;
          if (i === 0) {
            currentScroll = 0; // First piece at top
          } else if (isLastPiece) {
            // LAST PIECE: Scroll to position where viewport bottom = gridster bottom
            currentScroll = finalScrollHeight - finalClientHeight;
            this.debug(` Last piece: scrolling to bottom`, {
              scrollTo: currentScroll,
              viewportStart: currentScroll,
              viewportEnd: currentScroll + finalClientHeight,
              gridsterEnd: finalScrollHeight,
              shouldCaptureToEnd: (currentScroll + finalClientHeight) >= finalScrollHeight
            });
          } else {
            // MIDDLE PIECES: First piece (i=1) scrolls to where piece 1 ended
            // Subsequent pieces (i=2+) scroll by the increment
            if (i === 1) {
              currentScroll = piece2ScrollStart;
              this.debug(` Piece 2: scroll adjusted for notification, scrolling to ${currentScroll}px instead of ${scrollIncrementCSS}px`);
            } else {
              currentScroll = piece2ScrollStart + ((i - 1) * scrollIncrementCSS);
            }
          }

          targetElement.scrollTop = currentScroll;

          // Keep showing user/date/time info (no progress updates)
          this.debug(` ╔═══════════════════════════════`);
          this.debug(` ║ PIECE ${pieceIndex}/${totalPieces}`);
          this.debug(` ╠═══════════════════════════════`);
          this.debug(` ║ Scroll position: ${currentScroll}px CSS`);
          this.debug(` ║ Gridster shows: ${currentScroll}px → ${currentScroll + finalClientHeight}px`);
          this.debug(` ║ In video pixels: ${Math.floor(currentScroll * dpr)}px → ${Math.floor((currentScroll + finalClientHeight) * dpr)}px`);
          this.debug(` ╚═══════════════════════════════`);

          // Wait for page to render (configurable in settings)
          const renderDelay = this.ctx.settings.renderDelay || 1500;
          await this.delay(renderDelay);

          // Capture this frame (keep showing user info)

          this.debug(` Capturing frame after ${renderDelay}ms wait...`);
          const canvas = await this.captureFrame(video);

          // Calculate how much of this canvas we actually need
          let cropTop = 0;
          let cropBottom = 0;

          if (pieceIndex === 1) {
            // First piece: KEEP browser chrome (it's the top of the page!), only crop notification
            cropTop = notificationHeightEstimate;
            cropBottom = 0;

            // Browser chrome takes up space in the video but we keep it in piece 1
            // So actual GRIDSTER content = total - notification - browser chrome
            const actualGridsterContent = actualCapturedHeight - notificationHeightEstimate - browserChromeHeight;
            totalCapturedContentHeight = actualGridsterContent;

            this.debug(` Piece 1 cropping:`, {
              totalCaptured: actualCapturedHeight,
              notificationCropped: notificationHeightEstimate,
              browserChromeSpace: browserChromeHeight,
              gridsterContentCaptured: actualGridsterContent,
              calculation: `${actualCapturedHeight} - ${notificationHeightEstimate} notification - ${browserChromeHeight} browser chrome = ${actualGridsterContent}px gridster`,
              note: hasBrowserChrome ? 'Browser chrome KEPT but reduces gridster space' : 'Tab mode'
            });
          } else {
            // Pieces 2+: Figure out how much we need
            const pixelsAlreadyCaptured = totalCapturedContentHeight;
            let stillNeeded = gridsterHeightInPixels - pixelsAlreadyCaptured;

            this.debug(` Piece ${pieceIndex} analysis:`, {
              alreadyCaptured: pixelsAlreadyCaptured,
              gridsterTotal: gridsterHeightInPixels,
              stillNeeded: stillNeeded,
              isLastPiece: isLastPiece
            });

            if (isLastPiece) {
              // LAST PIECE: Sticky header is at top, we want bottom portion
              // Crop: header from top + extra to get to bottom portion we need
              const extraBottomCompensation = this.ctx.settings.bottomCompensation || 95; // Extra pixels in video pixels
              const lastPieceHeight = stillNeeded + extraBottomCompensation;

              // The frame has: [Header 93px][Content 661px]
              // We want to keep: lastPieceHeight from the bottom
              // So crop: total - lastPieceHeight, but that includes the header!
              // Correct: crop (header + top content we don't need)
              const contentAvailable = actualCapturedHeight - headerOnlyHeight; // Content after header
              const topContentToSkip = contentAvailable - lastPieceHeight; // How much top content to skip
              cropTop = headerOnlyHeight + Math.max(0, topContentToSkip); // Header + skip amount
              cropBottom = 0;

              this.debug(` Last piece cropping:`, {
                frameTotal: actualCapturedHeight,
                headerHeight: headerOnlyHeight,
                contentAvailable,
                stillNeeded,
                baseCompensation: extraBottomCompensation,
                lastPieceHeight,
                topContentToSkip,
                cropTop,
                note: 'Cropping header + top content to keep bottom portion'
              });

              totalCapturedContentHeight += lastPieceHeight;
            } else {
              // MIDDLE PIECES: Crop header + notification + browser chrome (if window shared)
              // All these elements are sticky and appear in every piece
              cropTop = headerOnlyHeight + notificationHeightEstimate + browserChromeHeight;
              cropBottom = 0;
              const actualContentAdded = actualCapturedHeight - cropTop;

              this.debug(` Piece ${pieceIndex} middle piece:`, {
                scrollPosition: currentScroll,
                headerHeight: headerOnlyHeight,
                notificationHeight: notificationHeightEstimate,
                browserChromeHeight: browserChromeHeight,
                totalCropTop: cropTop,
                contentAdded: actualContentAdded
              });

              totalCapturedContentHeight += actualContentAdded;
            }
          }

          // Store canvas info for stitching
          captures.push({
            canvas: canvas,
            pieceIndex: pieceIndex,
            cropTop: cropTop,
            cropBottom: cropBottom
          } as any);

          this.debug(` Captured piece ${pieceIndex}: ${canvas.width}x${canvas.height}, cropTop: ${cropTop}, cropBottom: ${cropBottom}`);
        }

        // Stop capture
        track.stop();

        // Restore scroll
        targetElement.scrollTop = originalScrollTop;

        // Unblock user input (if it was blocked)
        if (shouldBlockInput) {
          this.blockUserInput(false, targetElement);
        }

        // Check if we should download individual pieces or stitch them
        const downloadIndividual = this.ctx.settings.downloadIndividual === true;

        if (downloadIndividual) {
          // DEBUG MODE: Download each piece separately (keep showing user/date/time)
          this.debug(' 📦 Downloading individual pieces (debug mode)...');

          for (let i = 0; i < captures.length; i++) {
            const capture = captures[i] as any;
            const cropTop = capture.cropTop || 0;
            const cropBottom = capture.cropBottom || 0;

            // Crop this piece
            const croppedCanvas = this.cropCanvas(
              capture.canvas,
              0,
              cropTop,
              capture.canvas.width,
              capture.canvas.height - cropTop - cropBottom
            );

            // Download it
            const url = await this.canvasToUrl(croppedCanvas);
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
            const link = document.createElement('a');
            link.download = `piece-${i + 1}-of-${captures.length}-${timestamp}.png`;
            link.href = url;
            link.click();

            this.debug(` ✓ Downloaded piece ${i + 1}/${captures.length}:`, {
              size: `${croppedCanvas.width}x${croppedCanvas.height}`,
              cropTop,
              cropBottom
            });

            await this.delay(500); // Small delay between downloads
          }

          this.debug(' ✅ All individual pieces downloaded!');
        } else {
          // NORMAL MODE: Stitch and download final image (keep showing user/date/time)
          this.debug(` Stitching ${captures.length} pieces...`);
          const finalCanvas = await this.stitchFrames(captures, finalScrollHeight);

          // Final summary
          this.debug(' ═══════════════════════════════');
          this.debug(' FINAL RESULT:');
          this.debug(' ═══════════════════════════════');
          this.debug(' Expected gridster height:', gridsterHeightInPixels, 'px');
          this.debug(' Stitched canvas height:', finalCanvas.height, 'px');
          this.debug(' Match:', finalCanvas.height === gridsterHeightInPixels ? '✅ PERFECT!' : '❌ MISMATCH!');
          this.debug(' Difference:', finalCanvas.height - gridsterHeightInPixels, 'px');
          this.debug(' Total captured:', totalCapturedContentHeight, 'px');
          this.debug(' Pieces used:', captures.length);
          this.debug(' ═══════════════════════════════');

          const url = await this.canvasToUrl(finalCanvas);
          this.downloadScreenshotFromUrl(url);

          this.debug(' Full-page capture completed');
        }
      }

    } catch (err) {
      console.error('[Screenshot Widget] Error:', err);
      if (err.name === 'NotAllowedError') {
        this.error = 'Permission denied. Click "Share" to allow.';
      } else if (err.name === 'NotSupportedError') {
        this.error = 'Screen Capture not supported in this browser.';
      } else {
        this.error = err.message || 'Failed to capture screenshot';
      }
    } finally {
      // Clean up stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      // Always unblock input (if it was enabled) - use gridster as target
      const shouldBlock = this.ctx.settings.blockInput !== false;
      if (shouldBlock) {
        const gridster = document.querySelector('gridster') as HTMLElement;
        this.blockUserInput(false, gridster);
      }

      setTimeout(() => {
        this.loading = false;
        // Keep showing user/date/time after capture completes
        if (!this.error) {
          this.error = null;
        }
        if (this.ctx.detectChanges) {
          this.ctx.detectChanges();
        }
      }, 2000);
    }
  }

  /**
   * Captures a single frame from video stream
   */
  private async captureFrame(video: HTMLVideoElement): Promise<HTMLCanvasElement> {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    ctx.drawImage(video, 0, 0);
    return canvas;
  }

  /**
   * Stitches multiple video frames into one tall image
   * Crops headers from pieces 2+ like Chrome extension does!
   */
  private async stitchFrames(captures: any[], totalHeight: number): Promise<HTMLCanvasElement> {
    if (captures.length === 0) {
      throw new Error('No frames to stitch');
    }

    const firstCapture = captures[0];
    const width = firstCapture.canvas.width;

    this.debug(' Stitching:', {
      pieces: captures.length,
      width
    });

    // Calculate total height after cropping ALL pieces (including piece 1)
    let totalStitchedHeight = 0;
    for (let i = 0; i < captures.length; i++) {
      const cropTop = captures[i].cropTop || 0;
      const cropBottom = captures[i].cropBottom || 0;
      totalStitchedHeight += (captures[i].canvas.height - cropTop - cropBottom);
    }

    // Create final canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = totalStitchedHeight;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw each piece
    let yOffset = 0;
    for (let i = 0; i < captures.length; i++) {
      const capture = captures[i];
      const sourceCanvas = capture.canvas;
      const cropTop = capture.cropTop || 0;
      const cropBottom = capture.cropBottom || 0;

      // Calculate final height after cropping
      const finalHeight = sourceCanvas.height - cropTop - cropBottom;

      this.debug(` Drawing piece ${i + 1}/${captures.length}:`, {
        sourceSize: `${sourceCanvas.width}x${sourceCanvas.height}`,
        cropTop,
        cropBottom,
        finalHeight,
        yOffset
      });

      // Draw the cropped portion
      ctx.drawImage(
        sourceCanvas,
        0, cropTop,                    // Source: start after cropTop
        sourceCanvas.width, finalHeight,  // Source: width and final height
        0, yOffset,                    // Dest: position
        sourceCanvas.width, finalHeight   // Dest: size
      );

      yOffset += finalHeight;
    }

    this.debug(' Stitched final size:', {
      width: finalCanvas.width,
      height: finalCanvas.height
    });

    return finalCanvas;
  }

  /**
   * Converts canvas to blob URL
   */
  private async canvasToUrl(canvas: HTMLCanvasElement): Promise<string> {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/png', 1.0);
    });

    const url = URL.createObjectURL(blob);
    this.debug(' Blob created, size:', blob.size);
    return url;
  }

  /**
   * Captures the full page - for gridster, we capture everything at once
   * Similar to the mrcoles Chrome extension but adapted for web
   */
  private async captureFullPage(element: HTMLElement, options: CaptureOptions): Promise<string> {
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const scrollWidth = element.scrollWidth;
    const originalScrollTop = element.scrollTop;

    this.debug(' Capture dimensions:', {
      element: element.tagName,
      scrollHeight,
      clientHeight,
      scrollWidth,
      hasScroll: scrollHeight > clientHeight
    });

    // Scroll to top first
    element.scrollTop = 0;
    await this.delay(500);

    // Wait for all images to load
    this.statusMessage = 'Loading images...';
    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }
    await this.waitForImages(element);

    // Capture the FULL element height at once
    // This is simpler and more reliable than scrolling and stitching
    this.debug(' Capturing full element at once');
    this.statusMessage = 'Capturing full page...';
    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }

    const canvas = await html2canvas(element, {
      allowTaint: true,     // ALLOW cross-origin images (like Chrome extension)
      useCORS: true,
      logging: true,
      backgroundColor: '#ffffff',
      scale: 1,
      scrollY: 0,
      scrollX: 0,
      width: scrollWidth,
      height: scrollHeight,  // Capture FULL height
      windowWidth: scrollWidth,
      windowHeight: scrollHeight,  // Tell it the full height
      imageTimeout: 15000,
      removeContainer: true,
      foreignObjectRendering: false,  // Better compatibility
      ignoreElements: (el) => {
        const tagName = el.tagName?.toLowerCase();
        return tagName === 'iframe' || tagName === 'script';
      }
    });

    // Restore scroll position
    element.scrollTop = originalScrollTop;

    this.debug(' Full page captured:', {
      canvasWidth: canvas.width,
      canvasHeight: canvas.height
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty - no content captured');
    }

    // Convert to blob instead of dataURL to bypass tainted canvas restriction
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/png', 1.0);
    });

    const dataUrl = URL.createObjectURL(blob);
    this.debug(' Blob created, size:', blob.size);

    return dataUrl;
  }

  /**
   * Captures a single screen without scrolling
   */
  private async captureSingleScreen(element: HTMLElement): Promise<string> {
    this.debug(' Single screen capture of:', element);

    // Wait for images to load first
    await this.waitForImages(element);

    const canvas = await html2canvas(element, {
      allowTaint: false,
      useCORS: true,
      logging: true,
      backgroundColor: '#ffffff',
      scale: window.devicePixelRatio || 1,
      width: element.scrollWidth,
      height: element.scrollHeight,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight,
      x: 0,
      y: 0,
      imageTimeout: 15000,
      removeContainer: true,
      ignoreElements: (el) => {
        const tagName = el.tagName?.toLowerCase();
        return tagName === 'iframe' || tagName === 'script';
      }
    });

    this.debug(' Canvas created:', {
      width: canvas.width,
      height: canvas.height,
      hasData: canvas.width > 0 && canvas.height > 0
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty - no content captured');
    }

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    this.debug(' Data URL length:', dataUrl.length);

    return dataUrl;
  }

  /**
   * Captures multiple screens by scrolling and stitches them together
   * Uses the same approach as the Chrome extension - scrolls window for body element
   */
  private async captureMultiScreen(element: HTMLElement, options: CaptureOptions): Promise<string> {
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    const scrollWidth = element.scrollWidth;

    // Use viewport height as scroll increment for smooth stitching
    const viewportHeight = clientHeight;
    const scrollIncrement = viewportHeight;

    const captures: HTMLCanvasElement[] = [];
    let currentScroll = 0;
    const originalScrollTop = element.scrollTop;

    this.debug(' Multi-screen capture starting:', {
      element: element.tagName,
      scrollHeight,
      clientHeight,
      viewportHeight,
      scrollIncrement,
      totalPieces: Math.ceil(scrollHeight / scrollIncrement)
    });

    // Force scroll to top first
    element.scrollTop = 0;
    await this.delay(500);

    // Scroll through and capture each piece - like Chrome extension
    let pieceIndex = 0;
    while (currentScroll < scrollHeight) {
      pieceIndex++;

      // Scroll to position
      element.scrollTop = currentScroll;
      this.debug(` Scrolling ${element.tagName} to position ${currentScroll}px (piece ${pieceIndex})`);

      // Wait longer for scroll, images to load, and content to render
      await this.delay(1000);

      const percentage = Math.round((currentScroll / scrollHeight) * 100);
      this.statusMessage = `Capturing ${percentage}%... (${pieceIndex})`;
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }

      // Verify scroll position
      const actualScrollTop = element.scrollTop;
      this.debug(` Expected scroll: ${currentScroll}, Actual: ${actualScrollTop}`);

      // Wait for images to load in viewport
      await this.waitForImages(element);

      // Capture this viewport with better options
      const canvas = await html2canvas(element, {
        allowTaint: false,        // Don't allow tainted canvas
        useCORS: true,             // Use CORS for images
        logging: true,             // Enable logging to see what's happening
        backgroundColor: '#ffffff',
        scale: window.devicePixelRatio || 1,  // Better quality on high-DPI screens
        scrollY: -element.scrollTop,
        scrollX: 0,
        width: scrollWidth,
        height: Math.min(viewportHeight, scrollHeight - currentScroll),
        windowWidth: scrollWidth,
        windowHeight: viewportHeight,
        imageTimeout: 15000,       // Wait up to 15s for images to load
        removeContainer: true,
        ignoreElements: (element) => {
          // Skip elements that might cause issues
          const tagName = element.tagName?.toLowerCase();
          return tagName === 'iframe' || tagName === 'script';
        }
      });

      this.debug(' Piece captured:', {
        pieceIndex,
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        scrollPosition: currentScroll,
        actualScroll: actualScrollTop
      });

      if (canvas.width > 0 && canvas.height > 0) {
        captures.push(canvas);
      } else {
        console.warn('[Screenshot Widget] Empty canvas at position:', currentScroll);
      }

      currentScroll += scrollIncrement;

      // Safety check - don't loop forever
      if (pieceIndex > 50) {
        console.warn('[Screenshot Widget] Stopped after 50 pieces - possible infinite loop');
        break;
      }
    }

    // Restore original scroll position
    element.scrollTop = originalScrollTop;

    this.debug(` Captured ${captures.length} pieces, stitching together...`);

    if (captures.length === 0) {
      throw new Error('No screenshots captured - element may not be scrollable');
    }

    // Stitch all captures together
    this.statusMessage = 'Stitching...';
    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }

    return this.stitchCanvases(captures, scrollWidth, scrollHeight);
  }

  /**
   * Stitches multiple canvas captures into a single image
   */
  private stitchCanvases(canvases: HTMLCanvasElement[], width: number, totalHeight: number): string {
    if (canvases.length === 0) {
      throw new Error('No canvases to stitch');
    }

    this.debug(' Stitching canvases:', {
      count: canvases.length,
      targetWidth: width,
      targetHeight: totalHeight
    });

    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = width;
    finalCanvas.height = totalHeight;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Fill with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    let yOffset = 0;
    for (let i = 0; i < canvases.length; i++) {
      const canvas = canvases[i];
      this.debug(` Drawing canvas ${i + 1}/${canvases.length} at y=${yOffset}`);
      ctx.drawImage(canvas, 0, yOffset);
      yOffset += canvas.height;
    }

    const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
    this.debug(' Stitched image size:', dataUrl.length);

    if (dataUrl.length < 100) {
      throw new Error('Stitched image is too small - likely empty');
    }

    return dataUrl;
  }

  /**
   * Determines what element to capture based on widget settings
   * For dashboard mode, ALWAYS captures document.body to get full page like Chrome extension
   */
  private getCaptureTarget(): HTMLElement | null {
    const captureMode = this.ctx.settings.captureMode || 'dashboard';
    let target: HTMLElement | null = null;

    this.debug(' Finding target for mode:', captureMode);

    if (captureMode === 'dashboard') {
      // ThingsBoard uses gridster for dashboard layout
      // The actual scrollable element is the gridster element!
      const gridster = document.querySelector('gridster') as HTMLElement;

      if (gridster) {
        target = gridster;
        this.debug(' Found gridster element - this is the scrollable container');
        this.debug(' Gridster dimensions:', {
          scrollHeight: gridster.scrollHeight,
          clientHeight: gridster.clientHeight,
          offsetHeight: gridster.offsetHeight
        });
      } else {
        // Fallback to body if gridster not found
        target = document.body;
        this.debug(' Gridster not found, using document.body');
      }

    } else if (captureMode === 'widget') {
      // Capture just this widget - try multiple methods
      const containerEl = (this.ctx as any).$containerElement;
      if (containerEl && containerEl.length > 0) {
        target = containerEl[0] as HTMLElement;
        this.debug(' Found widget container via ctx');
      } else {
        // Fallback to finding the widget container
        target = document.querySelector('tb-screenshot-widget')?.parentElement as HTMLElement;
        this.debug(' Found widget via DOM query');
      }

      if (!target) {
        target = document.body;
      }
    } else if (captureMode === 'custom' && this.ctx.settings.customSelector) {
      // Capture custom selector
      target = document.querySelector(this.ctx.settings.customSelector) as HTMLElement;
      this.debug(' Custom selector target:', target);
    }

    if (!target) {
      target = document.body;
    }

    this.debug(' Final target:', {
      tagName: target.tagName,
      className: target.className,
      scrollHeight: target.scrollHeight,
      scrollWidth: target.scrollWidth,
      clientHeight: target.clientHeight,
      clientWidth: target.clientWidth,
      isScrollable: target.scrollHeight > target.clientHeight
    });

    return target;
  }

  /**
   * Downloads the screenshot from a URL (blob or data URL)
   */
  private downloadScreenshotFromUrl(url: string): void {
    if (!url) {
      const errorMsg = 'Invalid screenshot data - cannot download';
      console.error('[Screenshot Widget]', errorMsg);
      this.error = errorMsg;
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
      return;
    }

    const isBlob = url.startsWith('blob:');
    const isDataUrl = url.startsWith('data:');

    if (!isBlob && !isDataUrl) {
      const errorMsg = 'Invalid URL format - must be blob or data URL';
      console.error('[Screenshot Widget]', errorMsg);
      this.error = errorMsg;
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
      return;
    }

    this.debug(' Downloading screenshot, URL type:', isBlob ? 'blob' : 'data', 'length:', url.length);

    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const format = this.ctx.settings.format || 'png';
    link.download = `thingsboard-screenshot-${timestamp}.${format}`;
    link.href = url;
    link.style.display = 'none';

    document.body.appendChild(link);

    // Trigger download
    try {
      link.click();
      this.debug(' Screenshot downloaded successfully:', link.download);

      // Clean up blob URL after download
      if (isBlob) {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          this.debug(' Blob URL cleaned up');
        }, 1000);
      }
    } catch (err) {
      console.error('[Screenshot Widget] Download failed:', err);
      this.error = 'Download failed: ' + err.message;
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
    } finally {
      // Clean up link element
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    }
  }

  /**
   * Finds sticky/fixed headers that will appear in every screenshot
   */
  private findStickyElements(): Element[] {
    const stickyElements: Element[] = [];

    // Common ThingsBoard header selectors
    const selectors = [
      'tb-toolbar',
      '.tb-toolbar',
      '.mat-toolbar',
      '[style*="position: fixed"]',
      '[style*="position: sticky"]',
      'mat-toolbar',
      '.tb-header',
      '.dashboard-toolbar'
    ];

    selectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const computed = window.getComputedStyle(el as HTMLElement);
          if (computed.position === 'fixed' || computed.position === 'sticky') {
            if (!stickyElements.includes(el)) {
              stickyElements.push(el);
              this.debug(' Found sticky element:', el.tagName, el.className);
            }
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });

    return stickyElements;
  }

  /**
   * Gets the maximum height of sticky TOP header (not sidebar)
   * Only detects horizontal headers at top of page
   */
  private getMaxStickyHeight(elements: Element[], actualDpr: number): number {
    if (elements.length === 0) {
      return 0;
    }

    let maxBottom = 0;

    // Also check for toolbar elements directly
    const allToolbars = document.querySelectorAll('tb-toolbar, .mat-toolbar, mat-toolbar');
    allToolbars.forEach(el => {
      if (!elements.includes(el)) {
        elements.push(el);
      }
    });

    elements.forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const computed = window.getComputedStyle(el as HTMLElement);

      this.debug(' Checking element:', {
        tag: el.tagName,
        className: el.className.substring(0, 50),
        top: rect.top,
        height: rect.height,
        bottom: rect.bottom,
        width: rect.width,
        windowWidth: window.innerWidth
      });

      // Only consider:
      // 1. Visible elements
      // 2. At the TOP of the page (top < 150px)
      // 3. WIDE elements (> 50% of screen width) - this excludes sidebars!
      // 4. SHORT elements (< 200px height) - this excludes sidebars!
      const isVisible = computed.visibility !== 'hidden' && computed.display !== 'none';
      const isAtTop = rect.top < 150;
      const isWide = rect.width > window.innerWidth * 0.5;  // More than 50% width
      const isShort = rect.height < 200;  // Less than 200px tall

      if (isVisible && isAtTop && isWide && isShort) {
        if (rect.bottom > maxBottom) {
          maxBottom = rect.bottom;
          this.debug(' ✓ Found top header:', {
            tag: el.tagName,
            top: rect.top,
            height: rect.height,
            bottom: rect.bottom,
            width: rect.width
          });
        }
      }
    });

    // Use the ACTUAL DPR from video capture (not window.devicePixelRatio)
    // This is critical when browser is zoomed or DPR < 1
    const finalHeight = Math.ceil(maxBottom * actualDpr);

    this.debug(' Header crop height:', {
      maxBottomCSS: maxBottom,
      windowDpr: window.devicePixelRatio,
      actualDprUsed: actualDpr,
      finalHeightPixels: finalHeight,
      note: actualDpr !== window.devicePixelRatio ? '⚠️ Using actual DPR from video, not window DPR!' : 'DPR matches'
    });

    return finalHeight;
  }

  /**
   * Crops a canvas (removes sticky header from top)
   */
  private cropCanvas(sourceCanvas: HTMLCanvasElement, x: number, y: number, width: number, height: number): HTMLCanvasElement {
    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = width;
    croppedCanvas.height = height;

    const ctx = croppedCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get canvas context');
    }

    // Draw cropped portion
    ctx.drawImage(sourceCanvas, x, y, width, height, 0, 0, width, height);

    return croppedCanvas;
  }

  /**
   * SCROLL PREVIEW MODE - Shows scroll positions without capturing
   * Perfect for debugging scroll calculation!
   */
  private async scrollPreviewMode(): Promise<void> {
    this.debug(' 🔍 SCROLL PREVIEW MODE - No screenshots, just scrolling!');
    this.loading = true;
    this.error = null;
    this.statusMessage = 'Preview: Analyzing...';

    if (this.ctx.detectChanges) {
      this.ctx.detectChanges();
    }

    try {
      const targetElement = this.getCaptureTarget();
      if (!targetElement) {
        throw new Error('No target element found');
      }

      const scrollHeight = targetElement.scrollHeight;
      const clientHeight = targetElement.clientHeight;
      const originalScrollTop = targetElement.scrollTop;

      // Calculate all the same values as real capture
      const dpr = window.devicePixelRatio || 1;
      const stickyElements = this.findStickyElements();
      const headerHeight = this.getMaxStickyHeight(stickyElements, dpr);
      const notificationHeightEstimate = Math.ceil(50 * dpr);
      const notificationCSS = Math.floor(notificationHeightEstimate / dpr);

      const piece1ContentHeight = 1892; // Simulated video height
      // Middle pieces crop BOTH header AND notification
      const piece2PlusContentHeight = piece1ContentHeight - headerHeight - notificationHeightEstimate;

      const remainingAfterPiece1 = Math.ceil(scrollHeight * dpr) - piece1ContentHeight;
      let additionalPieces = Math.ceil(remainingAfterPiece1 / piece2PlusContentHeight);

      const lastPieceScrollPosition = scrollHeight - clientHeight;
      const piece1GridsterEnd = Math.floor(clientHeight - notificationCSS);
      const gapBetweenPiece1AndBottom = lastPieceScrollPosition - piece1GridsterEnd;

      if (additionalPieces === 1 && gapBetweenPiece1AndBottom > 10) {
        additionalPieces = 2;
      }

      const totalPieces = 1 + additionalPieces;
      const piece2ScrollStart = piece1GridsterEnd;
      const scrollIncrementCSS = Math.floor(piece2PlusContentHeight / dpr);

      this.debug(' 📊 PREVIEW - Will scroll to these positions:');

      // Scroll through each position
      for (let i = 0; i < totalPieces; i++) {
        const pieceIndex = i + 1;
        const isLastPiece = (pieceIndex === totalPieces);

        let currentScroll: number;
        if (i === 0) {
          currentScroll = 0;
        } else if (isLastPiece) {
          currentScroll = lastPieceScrollPosition;
        } else {
          if (i === 1) {
            currentScroll = piece2ScrollStart;
          } else {
            currentScroll = piece2ScrollStart + ((i - 1) * scrollIncrementCSS);
          }
        }

        targetElement.scrollTop = currentScroll;
        this.statusMessage = `Preview ${pieceIndex}/${totalPieces}: Scroll ${currentScroll}px`;
        if (this.ctx.detectChanges) {
          this.ctx.detectChanges();
        }

        this.debug(` 📍 Piece ${pieceIndex}/${totalPieces}:`, {
          scrollTo: currentScroll,
          gridsterRange: `${currentScroll}px → ${currentScroll + clientHeight}px`,
          videoRange: `${Math.floor(currentScroll * dpr)}px → ${Math.floor((currentScroll + clientHeight) * dpr)}px`
        });

        await this.delay(2000); // Longer delay to see each position
      }

      // Restore original position
      targetElement.scrollTop = originalScrollTop;

      this.debug(' ✅ Preview complete - would capture', totalPieces, 'pieces');
      this.statusMessage = `Preview done: ${totalPieces} pieces`;

    } catch (err) {
      console.error('[Screenshot Widget] Preview error:', err);
      this.error = err.message || 'Preview failed';
    } finally {
      setTimeout(() => {
        this.loading = false;
        this.statusMessage = '';
        this.error = null;
        if (this.ctx.detectChanges) {
          this.ctx.detectChanges();
        }
      }, 2000);
    }
  }

  /**
   * Blocks or unblocks user input (mouse, keyboard, touch, scroll)
   * Also blocks keyboard globally and hides tooltips
   */
  private blockUserInput(block: boolean, targetElement?: HTMLElement): void {
    const overlayId = 'screenshot-input-blocker';
    const overlay = document.getElementById(overlayId);
    const tooltipStyleId = 'screenshot-tooltip-hider';

    if (block) {
      // Create blocking overlay if it doesn't exist
      if (!overlay) {
        const blocker = document.createElement('div');
        blocker.id = overlayId;
        blocker.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 999999;
          background: rgba(0, 0, 0, 0.05);
          cursor: none !important;
          user-select: none;
          pointer-events: all;
        `;

        // Also hide cursor globally
        document.body.style.cursor = 'none';

        // Prevent all events - IMPORTANT: passive: false for wheel/touch!
        const stopEvent = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        };

        blocker.addEventListener('wheel', stopEvent, { passive: false, capture: true });
        blocker.addEventListener('touchmove', stopEvent, { passive: false, capture: true });
        blocker.addEventListener('touchstart', stopEvent, { passive: false, capture: true });
        blocker.addEventListener('scroll', stopEvent, { passive: false, capture: true });
        blocker.addEventListener('mousedown', stopEvent, { capture: true });
        blocker.addEventListener('mouseup', stopEvent, { capture: true });
        blocker.addEventListener('mousemove', stopEvent, { capture: true });
        blocker.addEventListener('click', stopEvent, { capture: true });
        blocker.addEventListener('keydown', stopEvent, { capture: true });
        blocker.addEventListener('keyup', stopEvent, { capture: true });

        document.body.appendChild(blocker);

        // GLOBAL keyboard blocker - catches Page Up/Down, arrow keys, etc.
        const globalKeyBlocker = (e: KeyboardEvent) => {
          this.debug(' 🚫 Blocked key:', e.key, e.code, e.type);
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          return false;
        };

        // Add to WINDOW and DOCUMENT to catch all possible keyboard events
        window.addEventListener('keydown', globalKeyBlocker, { passive: false, capture: true });
        window.addEventListener('keyup', globalKeyBlocker, { passive: false, capture: true });
        window.addEventListener('keypress', globalKeyBlocker, { passive: false, capture: true });
        document.addEventListener('keydown', globalKeyBlocker, { passive: false, capture: true });
        document.addEventListener('keyup', globalKeyBlocker, { passive: false, capture: true });
        document.addEventListener('keypress', globalKeyBlocker, { passive: false, capture: true });

        // Store the blocker function so we can remove it later
        (blocker as any)._globalKeyBlocker = globalKeyBlocker;

        // Hide all tooltips AND cursor during capture with TRANSPARENT CURSOR IMAGE
        // A 1x1 transparent PNG encoded as base64
        const transparentCursor = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

        const tooltipStyle = document.createElement('style');
        tooltipStyle.id = tooltipStyleId;
        tooltipStyle.textContent = `
          /* Replace cursor with transparent image globally */
          html,
          html *,
          body,
          body *,
          div,
          button,
          a,
          span,
          mat-toolbar,
          gridster,
          gridster-item,
          canvas,
          img {
            cursor: url('${transparentCursor}'), none !important;
          }

          /* Hide all tooltips */
          .mat-tooltip,
          .mat-mdc-tooltip,
          .mat-tooltip-panel,
          .cdk-overlay-container,
          .cdk-overlay-backdrop,
          .cdk-overlay-pane,
          [role="tooltip"],
          .tooltip,
          mat-tooltip-component {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            pointer-events: none !important;
          }
        `;
        document.head.appendChild(tooltipStyle);

        // Also set transparent cursor on HTML element
        document.documentElement.style.cursor = `url('${transparentCursor}'), none`;
        document.body.style.cursor = `url('${transparentCursor}'), none`;

        this.debug(' 📝 Added global CSS with transparent cursor and hidden tooltips');

        // Also prevent scrolling on target element
        if (targetElement) {
          (targetElement as any)._originalOverflow = targetElement.style.overflow;
          targetElement.style.overflow = 'hidden';
        }

        this.debug(' 🚫 User input BLOCKED - keyboard, tooltips, and all interaction disabled');
      }
    } else {
      // Remove blocking overlay
      if (overlay) {
        // Remove global keyboard blocker from BOTH window and document
        const globalKeyBlocker = (overlay as any)._globalKeyBlocker;
        if (globalKeyBlocker) {
          window.removeEventListener('keydown', globalKeyBlocker, { capture: true } as any);
          window.removeEventListener('keyup', globalKeyBlocker, { capture: true } as any);
          window.removeEventListener('keypress', globalKeyBlocker, { capture: true } as any);
          document.removeEventListener('keydown', globalKeyBlocker, { capture: true } as any);
          document.removeEventListener('keyup', globalKeyBlocker, { capture: true } as any);
          document.removeEventListener('keypress', globalKeyBlocker, { capture: true } as any);
        }

        overlay.remove();

        // Restore cursor on all elements
        document.documentElement.style.cursor = '';
        document.body.style.cursor = '';

        // Remove tooltip hiding and cursor hiding style
        const tooltipStyle = document.getElementById(tooltipStyleId);
        if (tooltipStyle) {
          tooltipStyle.remove();
          this.debug(' 📝 Removed global CSS (cursor and tooltips restored)');
        }

        // Restore target element overflow
        if (targetElement && (targetElement as any)._originalOverflow !== undefined) {
          targetElement.style.overflow = (targetElement as any)._originalOverflow;
        }

        this.debug(' ✅ User input UNBLOCKED - cursor, keyboard and tooltips restored');
      }
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wait for all images in element to load
   */
  private async waitForImages(element: HTMLElement): Promise<void> {
    const images = element.querySelectorAll('img');
    const imagePromises: Promise<void>[] = [];

    images.forEach(img => {
      if (!img.complete) {
        imagePromises.push(
          new Promise((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve(); // Resolve even on error to not block
            // Timeout after 5 seconds
            setTimeout(() => resolve(), 5000);
          })
        );
      }
    });

    if (imagePromises.length > 0) {
      this.debug(` Waiting for ${imagePromises.length} images to load...`);
      await Promise.all(imagePromises);
      this.debug(' All images loaded');
    }

    // Extra delay for rendering
    await this.delay(500);
  }
}
