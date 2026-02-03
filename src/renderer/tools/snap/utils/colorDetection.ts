/**
 * Color Detection Utilities for Snap Tool
 *
 * Detects the dominant background color from the edge regions of an image
 * to create seamless edge expansion that matches the screenshot's border colors.
 * We sample from edges because this background is used for edge expansion,
 * so we need colors that will blend naturally with the image borders.
 */

export interface EdgeBackgroundDetection {
  color: string;
  coverage: number;
  isSolid: boolean;
  totalSamples: number;
}

const EDGE_SOLID_THRESHOLD = 0.7;

/**
 * Detects the dominant background color from the edge regions of an image.
 * Samples pixels from the outer 5% of each edge and finds the most common color.
 * Also returns edge coverage to determine if the border is solid enough to expand.
 */
export function detectBackgroundColor(imageData: ImageData): EdgeBackgroundDetection {
  const { width, height, data } = imageData;
  const colorCounts = new Map<string, number>();
  let totalSamples = 0;

  // Define edge region (outer 5% of the image on each side)
  // This samples the actual border colors for seamless edge expansion
  const edgePercent = 0.05;
  const edgeX = Math.max(1, Math.floor(width * edgePercent));
  const edgeY = Math.max(1, Math.floor(height * edgePercent));

  // Number of samples per edge
  const samplesPerEdge = 30;

  // Sample from top edge
  const stepTopX = Math.max(1, Math.floor(width / samplesPerEdge));
  for (let x = 0; x < width; x += stepTopX) {
    for (let y = 0; y < edgeY; y++) {
      const color = getPixelColor(data, width, x, y);
      if (color !== null) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        totalSamples += 1;
      }
    }
  }

  // Sample from bottom edge
  for (let x = 0; x < width; x += stepTopX) {
    for (let y = height - edgeY; y < height; y++) {
      const color = getPixelColor(data, width, x, y);
      if (color !== null) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        totalSamples += 1;
      }
    }
  }

  // Sample from left edge (excluding corners already sampled)
  const stepLeftY = Math.max(1, Math.floor(height / samplesPerEdge));
  for (let y = edgeY; y < height - edgeY; y += stepLeftY) {
    for (let x = 0; x < edgeX; x++) {
      const color = getPixelColor(data, width, x, y);
      if (color !== null) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        totalSamples += 1;
      }
    }
  }

  // Sample from right edge (excluding corners already sampled)
  for (let y = edgeY; y < height - edgeY; y += stepLeftY) {
    for (let x = width - edgeX; x < width; x++) {
      const color = getPixelColor(data, width, x, y);
      if (color !== null) {
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
        totalSamples += 1;
      }
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

  const coverage = totalSamples > 0 ? maxCount / totalSamples : 0;
  const isSolid = totalSamples > 0 && coverage >= EDGE_SOLID_THRESHOLD;

  // Debug: log color distribution
  const sortedColors = Array.from(colorCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);
  console.log('[ColorDetection] Image size:', width, 'x', height);
  console.log('[ColorDetection] Edge region:', edgeX, 'x', edgeY);
  console.log('[ColorDetection] Total colors found:', colorCounts.size);
  console.log('[ColorDetection] Total samples:', totalSamples);
  console.log('[ColorDetection] Top 10 colors:', sortedColors);
  console.log('[ColorDetection] Dominant color:', dominantColor, 'count:', maxCount);
  console.log('[ColorDetection] Coverage:', coverage, 'threshold:', EDGE_SOLID_THRESHOLD);

  return {
    color: dominantColor,
    coverage,
    isSolid,
    totalSamples,
  };
}

/**
 * Gets the color of a pixel as a hex string, or null if the pixel is transparent.
 * Groups similar colors together to handle anti-aliasing and compression artifacts.
 * Ignores transparent/semi-transparent pixels (like window shadows in macOS screenshots).
 */
function getPixelColor(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number
): string | null {
  const index = (y * width + x) * 4;
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];

  // Skip transparent or semi-transparent pixels (alpha < 200)
  // This filters out window shadows which are black with low alpha
  if (a < 200) {
    return null;
  }

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
 * Returns a promise that resolves to the detection result.
 */
export function detectBackgroundColorFromDataUrl(
  dataUrl: string
): Promise<EdgeBackgroundDetection> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          color: '#ffffff',
          coverage: 0,
          isSolid: false,
          totalSamples: 0,
        });
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const detection = detectBackgroundColor(imageData);
      resolve(detection);
    };

    img.onerror = () => {
      resolve({
        color: '#ffffff',
        coverage: 0,
        isSolid: false,
        totalSamples: 0,
      });
    };

    img.src = dataUrl;
  });
}
