import type { Page } from 'playwright';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * Resets browser and page variables
 * Used when browser is closed
 */
export declare function resetBrowserState(): void;
/**
 * Sets the provided page to the global page variable
 * @param newPage The Page object to set as the global page
 */
export declare function setGlobalPage(newPage: Page): void;
interface BrowserSettings {
    viewport?: {
        width?: number;
        height?: number;
    };
    userAgent?: string;
    headless?: boolean;
    browserType?: 'chromium' | 'firefox' | 'webkit';
}
declare function registerConsoleMessage(page: any): Promise<void>;
/**
 * Ensures a browser is launched and returns the page
 */
export declare function ensureBrowser(browserSettings?: BrowserSettings): Promise<Page>;
/**
 * Main handler for tool calls
 */
export declare function handleToolCall(name: string, args: any, server: any): Promise<CallToolResult>;
/**
 * Get console logs
 */
export declare function getConsoleLogs(): string[];
/**
 * Get screenshots
 */
export declare function getScreenshots(): Map<string, string>;
export { registerConsoleMessage };
