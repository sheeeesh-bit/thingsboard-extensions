/**
 * Canvas Processor Utility
 * Handles all canvas manipulation operations
 */

import { CapturedPiece } from '../models/screenshot.models';

export class CanvasProcessor {

  /**
   * Captures a single frame from video element
   */
  static captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    ctx.drawImage(video, 0, 0);
    return canvas;
  }

  /**
   * Crops a canvas to specified region
   */
  static cropCanvas(
    source: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): HTMLCanvasElement {
    const cropped = document.createElement('canvas');
    cropped.width = width;
    cropped.height = height;

    const ctx = cropped.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
    return cropped;
  }

  /**
   * Stitches multiple captured pieces into single canvas
   */
  static stitchPieces(pieces: CapturedPiece[]): HTMLCanvasElement {
    if (pieces.length === 0) {
      throw new Error('No pieces to stitch');
    }

    // Calculate total height
    let totalHeight = 0;
    pieces.forEach(piece => {
      const cropTop = piece.cropTop || 0;
      const cropBottom = piece.cropBottom || 0;
      totalHeight += (piece.canvas.height - cropTop - cropBottom);
    });

    // Create final canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = pieces[0].canvas.width;
    finalCanvas.height = totalHeight;

    const ctx = finalCanvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2D context');
    }

    // Draw each piece
    let yOffset = 0;
    pieces.forEach(piece => {
      const cropTop = piece.cropTop || 0;
      const cropBottom = piece.cropBottom || 0;
      const finalHeight = piece.canvas.height - cropTop - cropBottom;

      ctx.drawImage(
        piece.canvas,
        0, cropTop,
        piece.canvas.width, finalHeight,
        0, yOffset,
        piece.canvas.width, finalHeight
      );

      yOffset += finalHeight;
    });

    return finalCanvas;
  }

  /**
   * Converts canvas to blob URL
   */
  static async canvasToBlob(canvas: HTMLCanvasElement): Promise<string> {
    const blob = await new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        }
      }, 'image/png', 1.0);
    });

    return URL.createObjectURL(blob);
  }

  /**
   * Downloads an image from a blob URL
   */
  static downloadImage(url: string, filename: string): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = url;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();

    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}
