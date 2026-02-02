/**
 * Keyboard Shortcut Types and Defaults
 */

export type ShortcutAction =
  | 'clipboard:toggle-popup'
  | 'snap:capture-region'
  | 'snap:capture-window';

export interface ShortcutDefinition {
  id: ShortcutAction;
  label: string;
  description: string;
  defaultShortcut: string;
  category: 'clipboard' | 'snap';
}

export interface ShortcutBinding {
  action: ShortcutAction;
  shortcut: string;
  enabled: boolean;
  lastError?: string;
}

export interface ShortcutSettings {
  version: number;
  bindings: ShortcutBinding[];
}

export const DEFAULT_SHORTCUTS: ShortcutDefinition[] = [
  {
    id: 'clipboard:toggle-popup',
    label: 'Toggle Clipboard Popup',
    description: 'Show or hide the clipboard history popup',
    defaultShortcut: process.platform === 'darwin' ? 'Alt+Command+V' : 'Alt+Control+V',
    category: 'clipboard',
  },
  {
    id: 'snap:capture-region',
    label: 'Capture Screen Region',
    description: 'Start interactive region capture for screenshot',
    defaultShortcut: process.platform === 'darwin' ? 'Alt+Command+A' : 'Alt+Control+A',
    category: 'snap',
  },
  {
    id: 'snap:capture-window',
    label: 'Capture Window',
    description: 'Capture a window by clicking on it',
    defaultShortcut: '',
    category: 'snap',
  },
];
