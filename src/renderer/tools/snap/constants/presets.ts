/**
 * Snap Tool - Preset Definitions
 */

import type { GradientPreset, AspectRatioPreset, AspectRatioInfo } from '../types';

export const GRADIENT_PRESETS: GradientPreset[] = [
  // Vibrant
  {
    id: 'sunset',
    name: 'Sunset',
    colors: ['#FF6B6B', '#FFA500', '#FFE66D'],
    angle: 135,
  },
  {
    id: 'ocean',
    name: 'Ocean',
    colors: ['#667eea', '#764ba2'],
    angle: 135,
  },
  {
    id: 'aurora',
    name: 'Aurora',
    colors: ['#00c6ff', '#0072ff'],
    angle: 180,
  },
  {
    id: 'peach',
    name: 'Peach',
    colors: ['#FFB199', '#FF0844'],
    angle: 135,
  },
  // Pastel
  {
    id: 'mint',
    name: 'Mint',
    colors: ['#00b09b', '#96c93d'],
    angle: 135,
  },
  {
    id: 'lavender',
    name: 'Lavender',
    colors: ['#a18cd1', '#fbc2eb'],
    angle: 135,
  },
  {
    id: 'candy',
    name: 'Candy',
    colors: ['#D299C2', '#FEF9D7'],
    angle: 135,
  },
  {
    id: 'sky',
    name: 'Sky',
    colors: ['#89f7fe', '#66a6ff'],
    angle: 180,
  },
  // Neutral
  {
    id: 'graphite',
    name: 'Graphite',
    colors: ['#2c3e50', '#4ca1af'],
    angle: 135,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    colors: ['#232526', '#414345'],
    angle: 180,
  },
  {
    id: 'steel',
    name: 'Steel',
    colors: ['#485563', '#29323c'],
    angle: 135,
  },
  // Solid-like
  {
    id: 'white',
    name: 'White',
    colors: ['#ffffff', '#f5f5f5'],
    angle: 180,
  },
];

export const ASPECT_RATIO_PRESETS: Record<AspectRatioPreset, AspectRatioInfo> = {
  auto: { width: 0, height: 0, label: 'Auto' },
  '1:1': { width: 1, height: 1, label: '1:1' },
  '4:3': { width: 4, height: 3, label: '4:3' },
  '3:2': { width: 3, height: 2, label: '3:2' },
  '16:9': { width: 16, height: 9, label: '16:9' },
  '16:10': { width: 16, height: 10, label: '16:10' },
  twitter: { width: 1200, height: 675, label: 'Twitter' },
  facebook: { width: 1200, height: 630, label: 'Facebook' },
  instagram: { width: 1080, height: 1080, label: 'Instagram' },
  linkedin: { width: 1200, height: 627, label: 'LinkedIn' },
  youtube: { width: 1280, height: 720, label: 'YouTube' },
  pinterest: { width: 1000, height: 1500, label: 'Pinterest' },
};

/**
 * Get gradient CSS string from preset ID
 */
export function getGradientById(id: string): GradientPreset | undefined {
  return GRADIENT_PRESETS.find((preset) => preset.id === id);
}

/**
 * Generate CSS gradient string from gradient preset
 */
export function gradientToCSS(gradient: GradientPreset): string {
  const colorStops = gradient.colors.join(', ');
  return `linear-gradient(${gradient.angle}deg, ${colorStops})`;
}
