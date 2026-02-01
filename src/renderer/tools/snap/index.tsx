/**
 * Snap Tool
 *
 * A screenshot beautification tool inspired by Xnapper.
 * Features:
 * - Screenshot capture and image import
 * - Beautiful gradient backgrounds
 * - Rounded corners and shadows
 * - Aspect ratio presets for social media
 * - Export to clipboard or file
 */

import { ToolMetadata, ToolComponent } from '@/shared/types';
import { Snap } from './snap';

export const metadata: ToolMetadata = {
  id: 'snap',
  name: 'Snap',
  description: 'Screenshot beautification tool',
  icon: 'camera',
};

export const Component: ToolComponent = Snap;
