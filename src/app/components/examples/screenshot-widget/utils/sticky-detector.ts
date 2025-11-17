/**
 * Sticky Element Detector
 * Finds and measures sticky/fixed headers on the page
 */

export class StickyDetector {

  private static readonly SELECTORS = [
    'tb-toolbar',
    '.tb-toolbar',
    '.mat-toolbar',
    '[style*="position: fixed"]',
    '[style*="position: sticky"]',
    'mat-toolbar',
    '.tb-header',
    '.dashboard-toolbar'
  ];

  /**
   * Finds all sticky/fixed elements on the page
   */
  static findStickyElements(): Element[] {
    const found: Element[] = [];

    this.SELECTORS.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const computed = window.getComputedStyle(el as HTMLElement);
          if ((computed.position === 'fixed' || computed.position === 'sticky') && !found.includes(el)) {
            found.push(el);
          }
        });
      } catch (e) {
        // Ignore invalid selectors
      }
    });

    // Also check toolbars directly
    const toolbars = document.querySelectorAll('tb-toolbar, .mat-toolbar, mat-toolbar');
    toolbars.forEach(el => {
      if (!found.includes(el)) {
        found.push(el);
      }
    });

    return found;
  }

  /**
   * Calculates maximum height of sticky headers at top of page
   * Only includes wide, short elements at top (excludes sidebars)
   */
  static getMaxHeaderHeight(elements: Element[], dpr: number): number {
    if (elements.length === 0) {
      return 0;
    }

    let maxBottom = 0;

    elements.forEach(el => {
      const rect = (el as HTMLElement).getBoundingClientRect();
      const computed = window.getComputedStyle(el as HTMLElement);

      // Criteria for top header (not sidebar):
      // 1. Visible
      // 2. At top of page (top < 150px)
      // 3. Wide (> 50% screen width)
      // 4. Short (< 200px height)
      const isVisible = computed.visibility !== 'hidden' && computed.display !== 'none';
      const isAtTop = rect.top < 150;
      const isWide = rect.width > window.innerWidth * 0.5;
      const isShort = rect.height < 200;

      if (isVisible && isAtTop && isWide && isShort) {
        if (rect.bottom > maxBottom) {
          maxBottom = rect.bottom;
        }
      }
    });

    // Convert to video pixels using actual DPR
    return Math.ceil(maxBottom * dpr);
  }
}
