/**
 * Snap Service - Screenshot capture and processing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { clipboard, nativeImage } from 'electron';

const execAsync = promisify(exec);

export interface CaptureResult {
  success: boolean;
  imageData?: string; // base64 encoded PNG
  width?: number;
  height?: number;
  error?: string;
}

export class SnapService {
  /**
   * Capture a screen region interactively
   * Uses macOS screencapture CLI with -i (interactive) and -c (clipboard) flags
   */
  async captureRegion(): Promise<CaptureResult> {
    try {
      // Run screencapture in interactive mode, output to clipboard
      // -i: interactive mode (user selects region)
      // -c: capture to clipboard instead of file
      // -x: do not play sound
      await execAsync('screencapture -i -c -x');

      // Read the captured image from clipboard
      const image = clipboard.readImage();

      if (image.isEmpty()) {
        // User cancelled the capture (pressed Escape)
        return { success: false, error: 'Capture cancelled' };
      }

      const size = image.getSize();
      const pngBuffer = image.toPNG();
      const base64 = pngBuffer.toString('base64');

      return {
        success: true,
        imageData: `data:image/png;base64,${base64}`,
        width: size.width,
        height: size.height,
      };
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Capture a specific window
   * Uses macOS screencapture CLI with -i -w (interactive window) flags
   */
  async captureWindow(): Promise<CaptureResult> {
    try {
      // -i: interactive mode
      // -w: capture window (user clicks on window to capture)
      // -c: capture to clipboard
      // -x: do not play sound
      await execAsync('screencapture -i -w -c -x');

      const image = clipboard.readImage();

      if (image.isEmpty()) {
        return { success: false, error: 'Capture cancelled' };
      }

      const size = image.getSize();
      const pngBuffer = image.toPNG();
      const base64 = pngBuffer.toString('base64');

      return {
        success: true,
        imageData: `data:image/png;base64,${base64}`,
        width: size.width,
        height: size.height,
      };
    } catch (error) {
      console.error('Window capture failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get current clipboard image (if any)
   */
  async getClipboardImage(): Promise<CaptureResult> {
    try {
      const image = clipboard.readImage();

      if (image.isEmpty()) {
        return { success: false, error: 'No image in clipboard' };
      }

      const size = image.getSize();
      const pngBuffer = image.toPNG();
      const base64 = pngBuffer.toString('base64');

      return {
        success: true,
        imageData: `data:image/png;base64,${base64}`,
        width: size.width,
        height: size.height,
      };
    } catch (error) {
      console.error('Failed to read clipboard image:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Copy processed image to clipboard
   */
  async copyToClipboard(imageDataUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Extract base64 data from data URL
      const base64Data = imageDataUrl.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const image = nativeImage.createFromBuffer(buffer);

      if (image.isEmpty()) {
        return { success: false, error: 'Invalid image data' };
      }

      clipboard.writeImage(image);
      return { success: true };
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
let snapServiceInstance: SnapService | null = null;

export function getSnapService(): SnapService {
  if (!snapServiceInstance) {
    snapServiceInstance = new SnapService();
  }
  return snapServiceInstance;
}
