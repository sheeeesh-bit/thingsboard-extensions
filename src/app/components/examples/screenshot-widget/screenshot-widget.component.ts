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

  ngOnInit(): void {
    console.log('[Screenshot Widget] Component initialized');
    console.log('[Screenshot Widget] Widget context:', this.ctx);
    console.log('[Screenshot Widget] Settings:', this.ctx.settings);
    this.ctx.$scope.screenshotWidgetComponent = this;
  }

  ngAfterViewInit(): void {
    console.log('[Screenshot Widget] AfterViewInit');
    // Initial data load if available
    if (this.ctx.data && this.ctx.data.length > 0) {
      this.onDataUpdated();
    }
  }

  ngOnDestroy(): void {
    console.log('[Screenshot Widget] Component destroyed');
    // Clean up warning dialog if it exists
    this.removeWarningDialog();
  }

  public onDataUpdated(): void {
    console.log('[Screenshot Widget] onDataUpdated called');
    console.log('[Screenshot Widget] Data received:', this.ctx.data);

    if (!this.ctx.data || this.ctx.data.length === 0) {
      console.warn('[Screenshot Widget] No data available');
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
    console.log('[Screenshot Widget] onResize called');
  }

  /**
   * Called when user clicks the capture button
   * Shows warning dialog if enabled, otherwise starts capture directly
   */
  public onCaptureClick(): void {
    console.log('[Screenshot Widget] onCaptureClick called');
    console.log('[Screenshot Widget] Settings:', this.ctx.settings);

    const shouldShowWarning = this.ctx.settings.showWarningDialog !== false;
    console.log('[Screenshot Widget] shouldShowWarning:', shouldShowWarning);

    if (shouldShowWarning) {
      console.log('[Screenshot Widget] Showing warning dialog...');
      this.showWarningDialog();
    } else {
      console.log('[Screenshot Widget] Skipping warning, starting capture directly...');
      this.captureScreenshot();
    }
  }

  /**
   * Shows warning dialog by appending it to document.body (breaks out of widget container)
   */
  private showWarningDialog(): void {
    console.log('[Screenshot Widget] showWarningDialog() called');

    // Don't create if already exists
    if (this.warningDialogElement) {
      console.log('[Screenshot Widget] Dialog already exists, skipping');
      return;
    }

    const message = this.ctx.settings.warningMessage ||
      'Before capturing:\n\n• Move your MOUSE/CURSOR to the edge of the screen or outside the window\n• Please don\'t scroll or use your keyboard during capture\n• Disable rotation for 3D widgets (use stop rotation button)\n• Make sure all animations are paused\n• Position widgets as needed\n\nClick "Start Capture" when ready, then keep your mouse still at the edge!';

    console.log('[Screenshot Widget] Creating overlay element...');

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
        ">Prepare for Screenshot</h3>
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
          ">Start Capture</button>
        </div>
      </div>
    `;

    console.log('[Screenshot Widget] Overlay created:', overlay);

    // Add event listeners
    const cancelBtn = overlay.querySelector('.screenshot-btn-cancel') as HTMLElement;
    const startBtn = overlay.querySelector('.screenshot-btn-start') as HTMLElement;

    console.log('[Screenshot Widget] Buttons found:', {cancelBtn, startBtn});

    cancelBtn.addEventListener('click', () => {
      console.log('[Screenshot Widget] Cancel clicked');
      this.removeWarningDialog();
    });
    startBtn.addEventListener('click', () => {
      console.log('[Screenshot Widget] Start Capture clicked');
      this.removeWarningDialog();
      this.captureScreenshot();
    });

    // Append to body (breaks out of widget container!)
    console.log('[Screenshot Widget] Appending to document.body...');
    document.body.appendChild(overlay);
    this.warningDialogElement = overlay;

    console.log('[Screenshot Widget] Warning dialog shown (appended to document.body)');
    console.log('[Screenshot Widget] Dialog element in DOM:', document.body.contains(overlay));
  }

  /**
   * Removes the warning dialog from document.body
   */
  private removeWarningDialog(): void {
    if (this.warningDialogElement && this.warningDialogElement.parentNode) {
      this.warningDialogElement.parentNode.removeChild(this.warningDialogElement);
      this.warningDialogElement = null;
      console.log('[Screenshot Widget] Warning dialog removed');
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

    console.log('[Screenshot Widget] captureScreenshot called - using Screen Capture API');
    this.loading = true;
    this.error = null;
    this.statusMessage = 'Click "Share" to capture...';

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

      const scrollHeight = targetElement.scrollHeight;
      const clientHeight = targetElement.clientHeight;
      const needsScrolling = scrollHeight > clientHeight + 10;

      console.log('[Screenshot Widget] Target:', {
        element: targetElement.tagName,
        scrollHeight,
        clientHeight,
        needsScrolling
      });

      // Request screen capture permission
      // preferCurrentTab makes THIS TAB the default selection in the picker
      stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          displaySurface: 'browser', // Prefer browser tab (not window/monitor)
          width: { ideal: 4096 },    // Request high resolution
          height: { ideal: 4096 }
        } as any,
        audio: false,                 // Don't capture audio
        preferCurrentTab: true        // Chrome/Edge: Make current tab the default!
      } as any);

      const [track] = stream.getVideoTracks();

      // Create video element
      const video = document.createElement('video');
      video.srcObject = stream;
      await video.play();

      // Get actual video dimensions - THIS includes the notification!
      await this.delay(300);
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      console.log('[Screenshot Widget] Video dimensions:', {
        videoWidth,
        videoHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        dpr: window.devicePixelRatio,
        note: 'Video height already accounts for notification!'
      });

      // NOW re-measure EVERYTHING AFTER notification appears!
      // The notification might change layout/dimensions
      const scrollHeightAfterNotification = targetElement.scrollHeight;
      const clientHeightAfterNotification = targetElement.clientHeight;

      console.log('[Screenshot Widget] Dimensions after notification:', {
        before: { scrollHeight, clientHeight },
        after: { scrollHeight: scrollHeightAfterNotification, clientHeight: clientHeightAfterNotification },
        changed: scrollHeightAfterNotification !== scrollHeight || clientHeightAfterNotification !== clientHeight
      });

      // USE THE AFTER VALUES for all calculations!
      const finalScrollHeight = scrollHeightAfterNotification;
      const finalClientHeight = clientHeightAfterNotification;

      // NOW calculate scroll positions based on ACTUAL video height
      const dpr = window.devicePixelRatio || 1;
      const actualCapturedHeight = videoHeight;

      this.statusMessage = 'Calculating scroll positions...';
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }
      await this.delay(200);

      if (!needsScrolling) {
        // Single capture - no scrolling needed
        this.statusMessage = 'Capturing...';
        if (this.ctx.detectChanges) {
          this.ctx.detectChanges();
        }

        const canvas = await this.captureFrame(video);
        track.stop();

        const url = await this.canvasToUrl(canvas);
        this.downloadScreenshotFromUrl(url);

        console.log('[Screenshot Widget] Single capture completed');
      } else {
        // Multi-capture - scroll and stitch like Chrome extension!
        console.log('[Screenshot Widget] Full-page capture - scrolling and stitching');

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

        // Find sticky/fixed headers
        const stickyElements = this.findStickyElements();
        const headerHeight = this.getMaxStickyHeight(stickyElements);

        // Chrome's sharing notification reduces the video height
        const notificationHeightEstimate = Math.ceil(50 * dpr);

        // Convert gridster scrollHeight from CSS to video pixels
        // USE THE AFTER-NOTIFICATION VALUES!
        const gridsterHeightInPixels = Math.ceil(finalScrollHeight * dpr);

        // Piece 1: Captures full video height
        const piece1ContentHeight = actualCapturedHeight;

        // Pieces 2+: Crop BOTH header AND notification from middle pieces
        const headerOnlyHeight = headerHeight;
        const piece2PlusContentHeight = actualCapturedHeight - headerOnlyHeight - notificationHeightEstimate;

        // Calculate notification in CSS pixels (needed for gap check)
        const notificationCSS = Math.floor(notificationHeightEstimate / dpr);

        // Calculate total pieces needed
        const remainingAfterPiece1 = gridsterHeightInPixels - piece1ContentHeight;
        let additionalPieces = Math.ceil(remainingAfterPiece1 / piece2PlusContentHeight);

        // Check for gap caused by notification
        const lastPieceScrollPosition = finalScrollHeight - finalClientHeight;
        const piece1GridsterEnd = Math.floor(finalClientHeight - notificationCSS);
        const gapBetweenPiece1AndBottom = lastPieceScrollPosition - piece1GridsterEnd;

        console.log('[Screenshot Widget] Gap analysis:', {
          piece1GridsterEnd: piece1GridsterEnd,
          lastPieceScrollPosition: lastPieceScrollPosition,
          gap: gapBetweenPiece1AndBottom,
          notificationCSS: notificationCSS
        });

        if (additionalPieces === 1 && gapBetweenPiece1AndBottom > 10) {
          // There's a significant gap - need an extra piece in the middle
          additionalPieces = 2;
          console.log('[Screenshot Widget] ⚠️ Gap detected! Adding extra piece to cover missing content');
        }

        const totalPieces = 1 + additionalPieces;

        // Piece 2 scroll start = where piece 1's gridster content ends
        const piece2ScrollStart = piece1GridsterEnd;

        // Each subsequent piece scrolls by the new content it adds
        const scrollIncrementCSS = Math.floor(piece2PlusContentHeight / dpr);

        console.log('[Screenshot Widget] Scroll positions:', {
          notificationCSS: notificationCSS,
          piece1GridsterEnd: piece1GridsterEnd,
          piece2ScrollStart: piece2ScrollStart,
          scrollIncrementCSS: scrollIncrementCSS,
          explanation: `Piece 1 captures ${piece1GridsterEnd}px of gridster (notification blocks ${notificationCSS}px), piece 2 continues from there`
        });

        console.log('[Screenshot Widget] ═══════════════════════════════');
        console.log('[Screenshot Widget] CAPTURE PLAN:');
        console.log('[Screenshot Widget] ═══════════════════════════════');
        console.log('[Screenshot Widget] Gridster dimensions (CSS - AFTER notification):', {
          scrollHeight: finalScrollHeight,
          clientHeight: finalClientHeight
        });
        console.log('[Screenshot Widget] Gridster in video pixels:', {
          totalHeight: gridsterHeightInPixels,
          calculation: `${scrollHeight} CSS × ${dpr} DPR = ${gridsterHeightInPixels}px`
        });
        console.log('[Screenshot Widget] Video frame size:', {
          width: videoWidth,
          height: videoHeight
        });
        console.log('[Screenshot Widget] Obstacles:', {
          notificationHeight: notificationHeightEstimate,
          headerHeight: headerHeight,
          notificationNote: 'Cropped from piece 1 AND middle pieces',
          headerNote: 'Cropped from all pieces'
        });
        console.log('[Screenshot Widget] Piece 1 coverage:', {
          capturedPixels: piece1ContentHeight,
          note: 'Full video frame - notification compensation in scroll position'
        });
        console.log('[Screenshot Widget] Pieces 2+ (middle) coverage:', {
          capturedPixels: actualCapturedHeight,
          cropTop: headerOnlyHeight + notificationHeightEstimate,
          headerCrop: headerOnlyHeight,
          notificationCrop: notificationHeightEstimate,
          newContentPerPiece: piece2PlusContentHeight
        });
        console.log('[Screenshot Widget] Total pieces calculation:', {
          afterPiece1Remaining: remainingAfterPiece1,
          additionalPiecesNeeded: additionalPieces,
          totalPieces: totalPieces,
          scrollIncrementCSS: scrollIncrementCSS
        });
        console.log('[Screenshot Widget] ═══════════════════════════════');

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
            console.log(`[Screenshot Widget] Last piece: scrolling to bottom`, {
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
              console.log(`[Screenshot Widget] Piece 2: scroll adjusted for notification, scrolling to ${currentScroll}px instead of ${scrollIncrementCSS}px`);
            } else {
              currentScroll = piece2ScrollStart + ((i - 1) * scrollIncrementCSS);
            }
          }

          targetElement.scrollTop = currentScroll;

          const percentage = Math.round((currentScroll / finalScrollHeight) * 100);
          this.statusMessage = `Scrolling ${percentage}%... (${pieceIndex}/${totalPieces})`;
          if (this.ctx.detectChanges) {
            this.ctx.detectChanges();
          }

          console.log(`[Screenshot Widget] ╔═══════════════════════════════`);
          console.log(`[Screenshot Widget] ║ PIECE ${pieceIndex}/${totalPieces}`);
          console.log(`[Screenshot Widget] ╠═══════════════════════════════`);
          console.log(`[Screenshot Widget] ║ Scroll position: ${currentScroll}px CSS`);
          console.log(`[Screenshot Widget] ║ Gridster shows: ${currentScroll}px → ${currentScroll + finalClientHeight}px`);
          console.log(`[Screenshot Widget] ║ In video pixels: ${Math.floor(currentScroll * dpr)}px → ${Math.floor((currentScroll + finalClientHeight) * dpr)}px`);
          console.log(`[Screenshot Widget] ╚═══════════════════════════════`);

          // Wait for page to render (configurable in settings)
          const renderDelay = this.ctx.settings.renderDelay || 1500;
          await this.delay(renderDelay);

          // Capture this frame
          this.statusMessage = `Capturing ${percentage}%... (${pieceIndex}/${totalPieces})`;
          if (this.ctx.detectChanges) {
            this.ctx.detectChanges();
          }

          console.log(`[Screenshot Widget] Capturing frame after ${renderDelay}ms wait...`);
          const canvas = await this.captureFrame(video);

          // Calculate how much of this canvas we actually need
          let cropTop = 0;
          let cropBottom = 0;

          if (pieceIndex === 1) {
            // First piece: CROP the notification from top!
            // The notification isn't part of gridster, so we remove it
            cropTop = notificationHeightEstimate;
            cropBottom = 0;

            const actualGridsterContent = actualCapturedHeight - notificationHeightEstimate;
            totalCapturedContentHeight = actualGridsterContent;

            console.log(`[Screenshot Widget] Piece 1: Cropping ${notificationHeightEstimate}px notification from top, keeping ${actualGridsterContent}px of gridster`);
          } else {
            // Pieces 2+: Figure out how much we need
            const pixelsAlreadyCaptured = totalCapturedContentHeight;
            let stillNeeded = gridsterHeightInPixels - pixelsAlreadyCaptured;

            console.log(`[Screenshot Widget] Piece ${pieceIndex} analysis:`, {
              alreadyCaptured: pixelsAlreadyCaptured,
              gridsterTotal: gridsterHeightInPixels,
              stillNeeded: stillNeeded,
              isLastPiece: isLastPiece
            });

            if (isLastPiece) {
              // LAST PIECE: Add extra pixels to capture more at bottom (compensation for notification + rounding)
              const extraBottomCompensation = this.ctx.settings.bottomCompensation || 95; // Extra pixels in video pixels
              const lastPieceHeight = stillNeeded + extraBottomCompensation;
              cropTop = actualCapturedHeight - lastPieceHeight;
              cropBottom = 0;

              console.log(`[Screenshot Widget] Last piece: cropTop=${cropTop}, keeping bottom ${lastPieceHeight}px (stillNeeded ${stillNeeded}px + compensation ${extraBottomCompensation}px)`);

              totalCapturedContentHeight += lastPieceHeight;
            } else {
              // MIDDLE PIECES: Crop header + notification
              // (Notification appears in middle pieces even though it shouldn't be visible there)
              cropTop = headerOnlyHeight + notificationHeightEstimate;
              cropBottom = 0;
              const actualContentAdded = actualCapturedHeight - cropTop;

              console.log(`[Screenshot Widget] Piece ${pieceIndex} middle piece:`, {
                scrollPosition: currentScroll,
                cropTop: cropTop,
                headerHeight: headerOnlyHeight,
                notificationHeight: notificationHeightEstimate,
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

          console.log(`[Screenshot Widget] Captured piece ${pieceIndex}: ${canvas.width}x${canvas.height}, cropTop: ${cropTop}, cropBottom: ${cropBottom}`);
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
          // DEBUG MODE: Download each piece separately
          console.log('[Screenshot Widget] 📦 Downloading individual pieces (debug mode)...');
          this.statusMessage = 'Downloading pieces...';
          if (this.ctx.detectChanges) {
            this.ctx.detectChanges();
          }

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

            console.log(`[Screenshot Widget] ✓ Downloaded piece ${i + 1}/${captures.length}:`, {
              size: `${croppedCanvas.width}x${croppedCanvas.height}`,
              cropTop,
              cropBottom
            });

            await this.delay(500); // Small delay between downloads
          }

          console.log('[Screenshot Widget] ✅ All individual pieces downloaded!');
        } else {
          // NORMAL MODE: Stitch and download final image
          this.statusMessage = 'Stitching...';
          if (this.ctx.detectChanges) {
            this.ctx.detectChanges();
          }

          console.log(`[Screenshot Widget] Stitching ${captures.length} pieces...`);
          const finalCanvas = await this.stitchFrames(captures, finalScrollHeight);

          // Final summary
          console.log('[Screenshot Widget] ═══════════════════════════════');
          console.log('[Screenshot Widget] FINAL RESULT:');
          console.log('[Screenshot Widget] ═══════════════════════════════');
          console.log('[Screenshot Widget] Expected gridster height:', gridsterHeightInPixels, 'px');
          console.log('[Screenshot Widget] Stitched canvas height:', finalCanvas.height, 'px');
          console.log('[Screenshot Widget] Match:', finalCanvas.height === gridsterHeightInPixels ? '✅ PERFECT!' : '❌ MISMATCH!');
          console.log('[Screenshot Widget] Difference:', finalCanvas.height - gridsterHeightInPixels, 'px');
          console.log('[Screenshot Widget] Total captured:', totalCapturedContentHeight, 'px');
          console.log('[Screenshot Widget] Pieces used:', captures.length);
          console.log('[Screenshot Widget] ═══════════════════════════════');

          const url = await this.canvasToUrl(finalCanvas);
          this.downloadScreenshotFromUrl(url);

          console.log('[Screenshot Widget] Full-page capture completed');
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
        this.statusMessage = '';
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

    console.log('[Screenshot Widget] Stitching:', {
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

      console.log(`[Screenshot Widget] Drawing piece ${i + 1}/${captures.length}:`, {
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

    console.log('[Screenshot Widget] Stitched final size:', {
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
    console.log('[Screenshot Widget] Blob created, size:', blob.size);
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

    console.log('[Screenshot Widget] Capture dimensions:', {
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
    console.log('[Screenshot Widget] Capturing full element at once');
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

    console.log('[Screenshot Widget] Full page captured:', {
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
    console.log('[Screenshot Widget] Blob created, size:', blob.size);

    return dataUrl;
  }

  /**
   * Captures a single screen without scrolling
   */
  private async captureSingleScreen(element: HTMLElement): Promise<string> {
    console.log('[Screenshot Widget] Single screen capture of:', element);

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

    console.log('[Screenshot Widget] Canvas created:', {
      width: canvas.width,
      height: canvas.height,
      hasData: canvas.width > 0 && canvas.height > 0
    });

    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas is empty - no content captured');
    }

    const dataUrl = canvas.toDataURL('image/png', 1.0);
    console.log('[Screenshot Widget] Data URL length:', dataUrl.length);

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

    console.log('[Screenshot Widget] Multi-screen capture starting:', {
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
      console.log(`[Screenshot Widget] Scrolling ${element.tagName} to position ${currentScroll}px (piece ${pieceIndex})`);

      // Wait longer for scroll, images to load, and content to render
      await this.delay(1000);

      const percentage = Math.round((currentScroll / scrollHeight) * 100);
      this.statusMessage = `Capturing ${percentage}%... (${pieceIndex})`;
      if (this.ctx.detectChanges) {
        this.ctx.detectChanges();
      }

      // Verify scroll position
      const actualScrollTop = element.scrollTop;
      console.log(`[Screenshot Widget] Expected scroll: ${currentScroll}, Actual: ${actualScrollTop}`);

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

      console.log('[Screenshot Widget] Piece captured:', {
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

    console.log(`[Screenshot Widget] Captured ${captures.length} pieces, stitching together...`);

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

    console.log('[Screenshot Widget] Stitching canvases:', {
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
      console.log(`[Screenshot Widget] Drawing canvas ${i + 1}/${canvases.length} at y=${yOffset}`);
      ctx.drawImage(canvas, 0, yOffset);
      yOffset += canvas.height;
    }

    const dataUrl = finalCanvas.toDataURL('image/png', 1.0);
    console.log('[Screenshot Widget] Stitched image size:', dataUrl.length);

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

    console.log('[Screenshot Widget] Finding target for mode:', captureMode);

    if (captureMode === 'dashboard') {
      // ThingsBoard uses gridster for dashboard layout
      // The actual scrollable element is the gridster element!
      const gridster = document.querySelector('gridster') as HTMLElement;

      if (gridster) {
        target = gridster;
        console.log('[Screenshot Widget] Found gridster element - this is the scrollable container');
        console.log('[Screenshot Widget] Gridster dimensions:', {
          scrollHeight: gridster.scrollHeight,
          clientHeight: gridster.clientHeight,
          offsetHeight: gridster.offsetHeight
        });
      } else {
        // Fallback to body if gridster not found
        target = document.body;
        console.log('[Screenshot Widget] Gridster not found, using document.body');
      }

    } else if (captureMode === 'widget') {
      // Capture just this widget - try multiple methods
      const containerEl = (this.ctx as any).$containerElement;
      if (containerEl && containerEl.length > 0) {
        target = containerEl[0] as HTMLElement;
        console.log('[Screenshot Widget] Found widget container via ctx');
      } else {
        // Fallback to finding the widget container
        target = document.querySelector('tb-screenshot-widget')?.parentElement as HTMLElement;
        console.log('[Screenshot Widget] Found widget via DOM query');
      }

      if (!target) {
        target = document.body;
      }
    } else if (captureMode === 'custom' && this.ctx.settings.customSelector) {
      // Capture custom selector
      target = document.querySelector(this.ctx.settings.customSelector) as HTMLElement;
      console.log('[Screenshot Widget] Custom selector target:', target);
    }

    if (!target) {
      target = document.body;
    }

    console.log('[Screenshot Widget] Final target:', {
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

    console.log('[Screenshot Widget] Downloading screenshot, URL type:', isBlob ? 'blob' : 'data', 'length:', url.length);

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
      console.log('[Screenshot Widget] Screenshot downloaded successfully:', link.download);

      // Clean up blob URL after download
      if (isBlob) {
        setTimeout(() => {
          URL.revokeObjectURL(url);
          console.log('[Screenshot Widget] Blob URL cleaned up');
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
              console.log('[Screenshot Widget] Found sticky element:', el.tagName, el.className);
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
  private getMaxStickyHeight(elements: Element[]): number {
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

      console.log('[Screenshot Widget] Checking element:', {
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
          console.log('[Screenshot Widget] ✓ Found top header:', {
            tag: el.tagName,
            top: rect.top,
            height: rect.height,
            bottom: rect.bottom,
            width: rect.width
          });
        }
      }
    });

    // The video stream already captures at physical pixel resolution,
    // so we need to account for DPR to convert CSS pixels to video pixels
    const dpr = window.devicePixelRatio || 1;
    const finalHeight = Math.ceil(maxBottom * dpr);

    console.log('[Screenshot Widget] Header crop height:', {
      maxBottomCSS: maxBottom,
      dpr,
      finalHeightPixels: finalHeight
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
    console.log('[Screenshot Widget] 🔍 SCROLL PREVIEW MODE - No screenshots, just scrolling!');
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
      const headerHeight = this.getMaxStickyHeight(stickyElements);
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

      console.log('[Screenshot Widget] 📊 PREVIEW - Will scroll to these positions:');

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

        console.log(`[Screenshot Widget] 📍 Piece ${pieceIndex}/${totalPieces}:`, {
          scrollTo: currentScroll,
          gridsterRange: `${currentScroll}px → ${currentScroll + clientHeight}px`,
          videoRange: `${Math.floor(currentScroll * dpr)}px → ${Math.floor((currentScroll + clientHeight) * dpr)}px`
        });

        await this.delay(2000); // Longer delay to see each position
      }

      // Restore original position
      targetElement.scrollTop = originalScrollTop;

      console.log('[Screenshot Widget] ✅ Preview complete - would capture', totalPieces, 'pieces');
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
          console.log('[Screenshot Widget] 🚫 Blocked key:', e.key, e.code, e.type);
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

        console.log('[Screenshot Widget] 📝 Added global CSS with transparent cursor and hidden tooltips');

        // Also prevent scrolling on target element
        if (targetElement) {
          (targetElement as any)._originalOverflow = targetElement.style.overflow;
          targetElement.style.overflow = 'hidden';
        }

        console.log('[Screenshot Widget] 🚫 User input BLOCKED - keyboard, tooltips, and all interaction disabled');
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
          console.log('[Screenshot Widget] 📝 Removed global CSS (cursor and tooltips restored)');
        }

        // Restore target element overflow
        if (targetElement && (targetElement as any)._originalOverflow !== undefined) {
          targetElement.style.overflow = (targetElement as any)._originalOverflow;
        }

        console.log('[Screenshot Widget] ✅ User input UNBLOCKED - cursor, keyboard and tooltips restored');
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
      console.log(`[Screenshot Widget] Waiting for ${imagePromises.length} images to load...`);
      await Promise.all(imagePromises);
      console.log('[Screenshot Widget] All images loaded');
    }

    // Extra delay for rendering
    await this.delay(500);
  }
}
