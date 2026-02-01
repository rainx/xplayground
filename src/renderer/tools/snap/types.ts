/**
 * Snap Tool - Type Definitions
 */

// Background types
export interface GradientPreset {
  id: string;
  name: string;
  colors: string[];
  angle: number;
}

export interface CustomGradient {
  colors: string[];
  angle: number;
  type: 'linear' | 'radial';
}

export interface BackgroundSettings {
  type: 'gradient' | 'solid' | 'transparent';
  gradientId?: string;
  customGradient?: CustomGradient;
  solidColor?: string;
}

// Padding types
export interface PaddingSettings {
  mode: 'uniform' | 'individual';
  uniform: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

// Shadow types
export interface ShadowSettings {
  enabled: boolean;
  blur: number;
  spread: number;
  offsetX: number;
  offsetY: number;
  color: string;
  opacity: number;
}

// Aspect ratio types
export type AspectRatioPreset =
  | 'auto'
  | '1:1'
  | '4:3'
  | '3:2'
  | '16:9'
  | '16:10'
  | 'twitter'
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'youtube'
  | 'pinterest';

export interface AspectRatioInfo {
  width: number;
  height: number;
  label: string;
}

// Main settings interface
export interface SnapSettings {
  background: BackgroundSettings;
  padding: PaddingSettings;
  cornerRadius: number;
  shadow: ShadowSettings;
  aspectRatio: AspectRatioPreset;
  autoCenter: boolean;
}

// Image data
export interface SnapImage {
  id: string;
  dataUrl: string;
  width: number;
  height: number;
  name?: string;
}

// Export options
export interface ExportOptions {
  format: 'png' | 'jpeg' | 'webp';
  quality: number;
  scale: number;
  destination: 'clipboard' | 'file' | 'both';
  filename?: string;
}

// Default settings
export const DEFAULT_SETTINGS: SnapSettings = {
  background: {
    type: 'gradient',
    gradientId: 'ocean',
  },
  padding: {
    mode: 'uniform',
    uniform: 64,
    top: 64,
    right: 64,
    bottom: 64,
    left: 64,
  },
  cornerRadius: 12,
  shadow: {
    enabled: true,
    blur: 40,
    spread: 0,
    offsetX: 0,
    offsetY: 20,
    color: '#000000',
    opacity: 30,
  },
  aspectRatio: 'auto',
  autoCenter: true,
};

// Capture result type
export interface CaptureResult {
  success: boolean;
  imageData?: string;
  width?: number;
  height?: number;
  error?: string;
}
