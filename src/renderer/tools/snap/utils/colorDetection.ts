/**
 * Color Detection Utilities for Snap Tool
 *
 * Detects the dominant background color from image edges to create
 * a seamless inner container that matches the screenshot's background.
 */

/**
 * Detects the dominant background color from the edges of an image.
 * Samples pixels from all four edges and finds the most common color.
 */
export function detectBackgroundColor(
  imageData: ImageData,
  sampleDepth: number = 5
): string {
  const { width, height, data } = imageData;
  const colorCounts = new Map<string, number>();

  // Sample from top edge
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 50))) {
    for (let y = 0; y < sampleDepth && y < height; y++) {
      const color = getPixelColor(data, width, x, y);
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // Sample from bottom edge
  for (let x = 0; x < width; x += Math.max(1, Math.floor(width / 50))) {
    for (let y = height - sampleDepth; y < height && y >= 0; y++) {
      const color = getPixelColor(data, width, x, y);
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // Sample from left edge
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 50))) {
    for (let x = 0; x < sampleDepth && x < width; x++) {
      const color = getPixelColor(data, width, x, y);
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // Sample from right edge
  for (let y = 0; y < height; y += Math.max(1, Math.floor(height / 50))) {
    for (let x = width - sampleDepth; x < width && x >= 0; x++) {
      const color = getPixelColor(data, width, x, y);
      colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
    }
  }

  // Find the most common color
  let maxCount = 0;
  let dominantColor = '#ffffff';

  for (const [color, count] of colorCounts) {
    if (count > maxCount) {
      maxCount = count;
      dominantColor = color;
    }
  }

  return dominantColor;
}

/**
 * Gets the color of a pixel as a hex string.
 * Groups similar colors together to handle anti-aliasing and compression artifacts.
 */
function getPixelColor(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): string {
  const index = (y * width + x) * 4;
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];

  // Quantize colors to reduce noise from compression artifacts
  // Round to nearest 8 to group similar colors
  const qr = Math.round(r / 8) * 8;
  const qg = Math.round(g / 8) * 8;
  const qb = Math.round(b / 8) * 8;

  return rgbToHex(qr, qg, qb);
}

/**
 * Converts RGB values to hex color string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

/**
 * Loads an image and detects its background color.
 * Returns a promise that resolves to the detected color.
 */
export function detectBackgroundColorFromDataUrl(
  dataUrl: string
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve('#ffffff');
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const color = detectBackgroundColor(imageData);
      resolve(color);
    };

    img.onerror = () => {
      resolve('#ffffff');
    };

    img.src = dataUrl;
  });
}
