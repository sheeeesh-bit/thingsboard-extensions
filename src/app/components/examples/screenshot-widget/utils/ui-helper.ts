/**
 * UI Helper Utility
 * Handles user interface elements like dialogs and input blocking
 */

import { BrowserInfo } from '../models/screenshot.models';

const DIALOG_STYLES = {
  overlay: `
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
  `,
  dialog: `
    position: relative;
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 600px;
    min-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `,
  title: `
    margin: 0 0 20px 0;
    font-size: 24px;
    font-weight: 600;
    color: #305680;
    text-align: center;
  `,
  message: `
    margin-bottom: 28px;
    font-size: 15px;
    line-height: 1.6;
    color: #333;
    white-space: pre-line;
    background: #f5f5f5;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #305680;
  `,
  buttonContainer: `
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  `,
  button: `
    padding: 12px 28px;
    border: none;
    border-radius: 6px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
  `,
  cancelButton: `background: #e0e0e0; color: #666;`,
  actionButton: `background: #305680; color: white;`
};

export class UIHelper {

  /**
   * Creates and shows warning dialog
   */
  static createWarningDialog(
    browserInfo: BrowserInfo,
    message: string,
    title: string,
    actionText: string,
    onStart: () => void,
    onCancel: () => void
  ): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.cssText = DIALOG_STYLES.overlay;

    overlay.innerHTML = `
      <div style="${DIALOG_STYLES.dialog}">
        <h3 style="${DIALOG_STYLES.title}">${title}</h3>
        <div style="${DIALOG_STYLES.message}">${message.replace(/\n/g, '<br>')}</div>
        <div style="${DIALOG_STYLES.buttonContainer}">
          <button class="btn-cancel" style="${DIALOG_STYLES.button} ${DIALOG_STYLES.cancelButton}">Cancel</button>
          <button class="btn-start" style="${DIALOG_STYLES.button} ${DIALOG_STYLES.actionButton}">${actionText}</button>
        </div>
      </div>
    `;

    const cancelBtn = overlay.querySelector('.btn-cancel') as HTMLElement;
    const startBtn = overlay.querySelector('.btn-start') as HTMLElement;

    cancelBtn.addEventListener('click', onCancel);
    startBtn.addEventListener('click', onStart);

    document.body.appendChild(overlay);
    return overlay;
  }

  /**
   * Removes dialog from DOM
   */
  static removeDialog(dialog: HTMLElement): void {
    if (dialog && dialog.parentNode) {
      dialog.parentNode.removeChild(dialog);
    }
  }

  /**
   * Blocks all user input (mouse, keyboard, touch)
   */
  static blockInput(targetElement?: HTMLElement): void {
    const blockerId = 'screenshot-input-blocker';
    if (document.getElementById(blockerId)) {
      return; // Already blocked
    }

    const blocker = document.createElement('div');
    blocker.id = blockerId;
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

    // Block all events
    const stopEvent = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    const stopKeyEvent = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    // Attach event blockers
    ['wheel', 'touchmove', 'touchstart', 'scroll', 'mousedown', 'mouseup', 'mousemove', 'click'].forEach(event => {
      blocker.addEventListener(event, stopEvent, { passive: false, capture: true } as any);
    });

    ['keydown', 'keyup', 'keypress'].forEach(event => {
      window.addEventListener(event, stopKeyEvent, { passive: false, capture: true });
      document.addEventListener(event, stopKeyEvent, { passive: false, capture: true });
    });

    document.body.appendChild(blocker);

    // Hide cursor and tooltips
    const transparentCursor = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const styleId = 'screenshot-hide-cursor-tooltips';
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      html, html *, body, body * {
        cursor: url('${transparentCursor}'), none !important;
      }
      .mat-tooltip, .mat-mdc-tooltip, .cdk-overlay-container, [role="tooltip"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);

    if (targetElement) {
      (targetElement as any)._originalOverflow = targetElement.style.overflow;
      targetElement.style.overflow = 'hidden';
    }

    // Store cleanup data
    (blocker as any)._keyBlockers = stopKeyEvent;
  }

  /**
   * Unblocks user input
   */
  static unblockInput(targetElement?: HTMLElement): void {
    const blocker = document.getElementById('screenshot-input-blocker');
    if (!blocker) return;

    // Remove key blockers
    const stopKeyEvent = (blocker as any)._keyBlockers;
    if (stopKeyEvent) {
      ['keydown', 'keyup', 'keypress'].forEach(event => {
        window.removeEventListener(event, stopKeyEvent, { capture: true } as any);
        document.removeEventListener(event, stopKeyEvent, { capture: true } as any);
      });
    }

    blocker.remove();

    // Remove cursor/tooltip style
    const style = document.getElementById('screenshot-hide-cursor-tooltips');
    style?.remove();

    // Restore element overflow
    if (targetElement && (targetElement as any)._originalOverflow !== undefined) {
      targetElement.style.overflow = (targetElement as any)._originalOverflow;
    }
  }
}
