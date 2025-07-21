import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse } from '../common/types.js';
/**
 * Tool for clicking elements on the page
 */
export declare class ClickTool extends BrowserToolBase {
    /**
     * Execute the click tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for clicking a link and switching to the new tab
 */
export declare class ClickAndSwitchTabTool extends BrowserToolBase {
    /**
     * Execute the click and switch tab tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for clicking elements inside iframes
 */
export declare class IframeClickTool extends BrowserToolBase {
    /**
     * Execute the iframe click tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for filling elements inside iframes
 */
export declare class IframeFillTool extends BrowserToolBase {
    /**
     * Execute the iframe fill tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for filling form fields
 */
export declare class FillTool extends BrowserToolBase {
    /**
     * Execute the fill tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for selecting options from dropdown menus
 */
export declare class SelectTool extends BrowserToolBase {
    /**
     * Execute the select tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for hovering over elements
 */
export declare class HoverTool extends BrowserToolBase {
    /**
     * Execute the hover tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for uploading files
 */
export declare class UploadFileTool extends BrowserToolBase {
    /**
     * Execute the upload file tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for executing JavaScript in the browser
 */
export declare class EvaluateTool extends BrowserToolBase {
    /**
     * Execute the evaluate tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for dragging elements on the page
 */
export declare class DragTool extends BrowserToolBase {
    /**
     * Execute the drag tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for pressing keyboard keys
 */
export declare class PressKeyTool extends BrowserToolBase {
    /**
     * Execute the key press tool
     */
    execute(args: any, context: ToolContext): Promise<ToolResponse>;
}
/**
 * Tool for switching browser tabs
 */
