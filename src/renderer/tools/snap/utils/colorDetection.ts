/**
 * Color Detection Utilities for Snap Tool
 *
 * Detects the dominant background color from the center region of an image
 * to create a seamless inner container that matches the screenshot's background.
 * We sample from the center because edges often contain window chrome (title bars,
 * borders, etc.) that don't represent the actual content background.
 */

/**
 * Detects the dominant background color from the center region of an image.
 * Samples pixels from a grid in the center 60% of the image and finds the most common color.
 */
export function detectBackgroundColor(imageData: ImageData): string {
  const { width, height, data } = imageData;
  const colorCounts = new Map<string, number>();

  // Define center region (center 60% of the image)
  // This avoids window chrome, title bars, and borders
  const marginX = Math.floor(width * 0.2);
  const marginY = Math.floor(height * 0.2);
  const centerWidth = width - marginX * 2;
  const centerHeight = height - marginY * 2;

  // Sample from a grid in the center region
  const sampleCountX = 20;
  const sampleCountY = 20;
  const stepX = Math.max(1, Math.floor(centerWidth / sampleCountX));
  const stepY = Math.max(1, Math.floor(centerHeight / sampleCountY));

  for (let i = 0; i < sampleCountX; i++) {
    for (let j = 0; j < sampleCountY; j++) {
      const x = marginX + i * stepX;
      const y = marginY + j * stepY;
      if (x < width && y < height) {
        const color = getPixelColor(data, width, x, y);
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }
  }

  // Also sample from the corners of the center region for better coverage
  const cornerOffsets = [
    { x: marginX, y: marginY },
    { x: width - marginX - 1, y: marginY },
    { x: marginX, y: height - marginY - 1 },
    { x: width - marginX - 1, y: height - marginY - 1 },
  ];

  for (const offset of cornerOffsets) {
    if (offset.x >= 0 && offset.x < width && offset.y >= 0 && offset.y < height) {
      const color = getPixelColor(data, width, offset.x, offset.y);
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
