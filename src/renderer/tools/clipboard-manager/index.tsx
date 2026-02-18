/**
 * Clipboard Manager Tool
 *
 * A visual clipboard history manager inspired by Paste app.
 * Features:
 * - Automatic clipboard monitoring
 * - Visual strip UI with previews
 * - Search functionality
 * - Google Drive cloud sync
 */

import { ToolMetadata, ToolComponent } from '@/shared/types';
import { ClipboardManager } from './clipboard-manager';

export const metadata: ToolMetadata = {
  id: 'clipboard-manager',
  name: 'Clipboard',
  description: 'Visual clipboard history with search',
  icon: 'clipboard',
};

export const Component: ToolComponent = ClipboardManager;
