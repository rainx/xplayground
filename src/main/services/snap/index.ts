/**
 * Snap Service - Screenshot capture using Electron desktopCapturer API
 */

import { clipboard, desktopCapturer, nativeImage, screen } from 'electron';

export interface CaptureResult {
  success: boolean;
  imageData?: string; // base64 encoded PNG data URL
  width?: number;
  height?: number;
  error?: string;
}

export interface DisplayCapture {
  displayId: number;
  imageDataUrl: string;
  bounds: Electron.Rectangle;
  scaleFactor: number;
}

export interface RegionSelection {
  displayId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WindowSource {
  id: string;
  name: string;
  thumbnailDataUrl: string;
  width: number;
  height: number;
}

export class SnapService {
  /**
   * Capture all screens using desktopCapturer
   * Returns a DisplayCapture for each display
   */
  async captureAllScreens(): Promise<DisplayCapture[]> {
    const displays = screen.getAllDisplays();

    // Request thumbnails at the maximum physical pixel size across all displays
    // to ensure we get full-resolution captures
    const maxWidth = Math.max(...displays.map((d) => d.size.width * d.scaleFactor));
    const maxHeight = Math.max(...displays.map((d) => d.size.height * d.scaleFactor));

    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: maxWidth, height: maxHeight },
    });

    const captures: DisplayCapture[] = [];

    for (const display of displays) {
      // Match source to display by display_id
      // desktopCapturer source IDs for screens are like "screen:0:0", "screen:1:0"
      const source = sources.find((s) => {
        return s.display_id === String(display.id);
      });

      if (source && !source.thumbnail.isEmpty()) {
        captures.push({
          displayId: display.id,
          imageDataUrl: source.thumbnail.toDataURL(),
          bounds: display.bounds,
          scaleFactor: display.scaleFactor,
        });
      }
    }

    return captures;
  }

  /**
   * Crop a region from a display capture
   * Coordinates are in DIP (display-independent pixels), relative to the display
   */
  cropRegion(capture: DisplayCapture, selection: RegionSelection): CaptureResult {
    try {
      const image = nativeImage.createFromDataURL(capture.imageDataUrl);
      const sf = capture.scaleFactor;

      // Convert DIP coordinates to physical pixels for cropping
      const cropRect = {
        x: Math.round(selection.x * sf),
        y: Math.round(selection.y * sf),
        width: Math.round(selection.width * sf),
        height: Math.round(selection.height * sf),
      };

      const cropped = image.crop(cropRect);

      if (cropped.isEmpty()) {
        return { success: false, error: 'Crop resulted in empty image' };
      }

      const size = cropped.getSize();
      const pngBuffer = cropped.toPNG();
      const base64 = pngBuffer.toString('base64');

      return {
        success: true,
        imageData: `data:image/png;base64,${base64}`,
        width: size.width,
        height: size.height,
      };
    } catch (error) {
      console.error('Crop region failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get window sources with thumbnails for the window picker
   */
  async getWindowSources(): Promise<WindowSource[]> {
    const sources = await desktopCapturer.getSources({
      types: ['window'],
      thumbnailSize: { width: 400, height: 300 },
      fetchWindowIcons: false,
    });

    return sources
      .filter((s) => !s.thumbnail.isEmpty())
      .map((s) => {
        const size = s.thumbnail.getSize();
        return {
          id: s.id,
          name: s.name,
          thumbnailDataUrl: s.thumbnail.toDataURL(),
          width: size.width,
          height: size.height,
        };
      });
  }

  /**
   * Capture a specific window by ID at full resolution
   */
  async captureWindowById(windowId: string): Promise<CaptureResult> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['window'],
        thumbnailSize: { width: 3840, height: 2160 },
      });

      const source = sources.find((s) => s.id === windowId);
      if (!source || source.thumbnail.isEmpty()) {
        return { success: false, error: 'Window not found or empty' };
      }

      const size = source.thumbnail.getSize();
      const pngBuffer = source.thumbnail.toPNG();
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
