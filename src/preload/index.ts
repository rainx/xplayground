import { contextBridge, ipcRenderer } from 'electron';
import { electronAPI } from '@electron-toolkit/preload';

// Clipboard API types
interface ClipboardHistoryOptions {
  limit?: number;
  offset?: number;
}

interface SearchFilter {
  query: string;
  contentTypes?: string[];
  sourceApps?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
}

interface CategoryCreateInput {
  name: string;
  icon?: string;
  color?: string;
}

interface CategoryUpdateInput {
  name?: string;
  icon?: string;
  color?: string;
  order?: number;
}

interface SnapCaptureResult {
  success: boolean;
  imageData?: string;
  width?: number;
  height?: number;
  error?: string;
}

type SnapCaptureCallback = (result: SnapCaptureResult) => void;

const snapCaptureSubscribers = new Set<SnapCaptureCallback>();
let pendingSnapCapture: SnapCaptureResult | null = null;

ipcRenderer.on('snap:captured', (_event: unknown, result: SnapCaptureResult) => {
  if (snapCaptureSubscribers.size === 0) {
    pendingSnapCapture = result;
    return;
  }

  snapCaptureSubscribers.forEach((callback) => callback(result));
});

const flushPendingSnapCapture = (callback: SnapCaptureCallback): void => {
  if (!pendingSnapCapture) return;
  const pending = pendingSnapCapture;
  pendingSnapCapture = null;
  Promise.resolve().then(() => callback(pending));
};

// Custom APIs for renderer
const api = {
  // Native Rust function invocation
  invokeNative: (method: string, ...args: unknown[]) =>
    ipcRenderer.invoke('native:invoke', method, ...args),

  // Window APIs
  window: {
    show: () => ipcRenderer.invoke('window:show'),
    hide: () => ipcRenderer.invoke('window:hide'),
    toggleMaximize: (): Promise<{ success: boolean; isMaximized?: boolean }> =>
      ipcRenderer.invoke('window:toggle-maximize'),
    isMaximized: (): Promise<{ isMaximized: boolean }> =>
      ipcRenderer.invoke('window:is-maximized'),
    onMaximizeChanged: (callback: (isMaximized: boolean) => void) => {
      const handler = (_event: unknown, isMaximized: boolean) => callback(isMaximized);
      ipcRenderer.on('window:maximize-changed', handler);
      return () => {
        ipcRenderer.removeListener('window:maximize-changed', handler);
      };
    },
  },

  // Popup keyboard navigation (for non-focusable popup window)
  popup: {
    onNavigate: (callback: (direction: 'left' | 'right' | 'up' | 'down') => void) => {
      const handler = (_event: unknown, direction: 'left' | 'right' | 'up' | 'down') => callback(direction);
      ipcRenderer.on('popup:navigate', handler);
      return () => {
        ipcRenderer.removeListener('popup:navigate', handler);
      };
    },
    onSelect: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('popup:select', handler);
      return () => {
        ipcRenderer.removeListener('popup:select', handler);
      };
    },
    // Enable/disable focus for text input (e.g., category editing)
    setFocusable: (focusable: boolean) =>
      ipcRenderer.invoke('popup:set-focusable', focusable),
    // Open main window with a specific dialog (for edit/AI modify from popup)
    openMainWithDialog: (dialogType: 'edit' | 'ai-modify', itemId: string) =>
      ipcRenderer.invoke('popup:open-main-with-dialog', dialogType, itemId),
  },

  // Main window APIs (for receiving dialog open requests)
  mainWindow: {
    onOpenDialog: (callback: (dialogType: 'edit' | 'ai-modify', itemId: string) => void) => {
      const handler = (_event: unknown, dialogType: 'edit' | 'ai-modify', itemId: string) =>
        callback(dialogType, itemId);
      ipcRenderer.on('main:open-dialog', handler);
      return () => {
        ipcRenderer.removeListener('main:open-dialog', handler);
      };
    },
  },

  // Shell APIs (open URLs, files, etc.)
  shell: {
    openExternal: (url: string) => ipcRenderer.invoke('shell:open-external', url),
    openPath: (path: string) => ipcRenderer.invoke('shell:open-path', path),
    showItemInFolder: (path: string) => ipcRenderer.invoke('shell:show-item', path),
  },

  // Clipboard Manager APIs
  clipboard: {
    // History operations
    getHistory: (options?: ClipboardHistoryOptions) =>
      ipcRenderer.invoke('clipboard:get-history', options),

    getItem: (id: string) =>
      ipcRenderer.invoke('clipboard:get-item', id),

    deleteItem: (id: string) =>
      ipcRenderer.invoke('clipboard:delete-item', id),

    updateItem: (id: string, updates: Record<string, unknown>) =>
      ipcRenderer.invoke('clipboard:update-item', id, updates),

    pasteItem: (id: string, options?: { hideWindow?: boolean; simulatePaste?: boolean }) =>
      ipcRenderer.invoke('clipboard:paste-item', id, options),

    // Search
    search: (filter: SearchFilter) =>
      ipcRenderer.invoke('clipboard:search', filter),

    // Settings
    getSettings: () =>
      ipcRenderer.invoke('clipboard:get-settings'),

    updateSettings: (settings: Record<string, unknown>) =>
      ipcRenderer.invoke('clipboard:update-settings', settings),

    // Clear history
    clearHistory: () =>
      ipcRenderer.invoke('clipboard:clear-history'),

    // Clear all items in a category
    clearCategoryItems: (categoryId: string) =>
      ipcRenderer.invoke('clipboard:clear-category-items', categoryId),

    // Event subscriptions
    onItemAdded: (callback: (item: unknown) => void) => {
      const handler = (_event: unknown, item: unknown) => callback(item);
      ipcRenderer.on('clipboard:item-added', handler);
      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener('clipboard:item-added', handler);
      };
    },

    onItemDeleted: (callback: (id: string) => void) => {
      const handler = (_event: unknown, id: string) => callback(id);
      ipcRenderer.on('clipboard:item-deleted', handler);
      return () => {
        ipcRenderer.removeListener('clipboard:item-deleted', handler);
      };
    },

    onItemUpdated: (callback: (item: unknown) => void) => {
      const handler = (_event: unknown, item: unknown) => callback(item);
      ipcRenderer.on('clipboard:item-updated', handler);
      return () => {
        ipcRenderer.removeListener('clipboard:item-updated', handler);
      };
    },

    onItemCategoryChanged: (callback: (data: { itemId: string; categoryIds: string[] }) => void) => {
      const handler = (_event: unknown, data: { itemId: string; categoryIds: string[] }) => callback(data);
      ipcRenderer.on('clipboard:item-category-changed', handler);
      return () => {
        ipcRenderer.removeListener('clipboard:item-category-changed', handler);
      };
    },

    // Duplicate item
    duplicateItem: (id: string) =>
      ipcRenderer.invoke('clipboard:duplicate-item', id),

    // Get decrypted image data (for encrypted images)
    getImageData: (imagePath: string): Promise<{ success: boolean; data: string | null }> =>
      ipcRenderer.invoke('clipboard:get-image-data', imagePath),

    // AI text modification
    aiModify: (itemId: string, instruction: string): Promise<{ success: boolean; item?: unknown; error?: string }> =>
      ipcRenderer.invoke('clipboard:ai-modify', itemId, instruction),

    // Category operations
    categories: {
      getAll: () =>
        ipcRenderer.invoke('clipboard:get-categories'),

      create: (input: CategoryCreateInput) =>
        ipcRenderer.invoke('clipboard:create-category', input),

      update: (id: string, updates: CategoryUpdateInput) =>
        ipcRenderer.invoke('clipboard:update-category', id, updates),

      delete: (id: string) =>
        ipcRenderer.invoke('clipboard:delete-category', id),

      reorder: (orderedIds: string[]) =>
        ipcRenderer.invoke('clipboard:reorder-categories', orderedIds),

      // Item-category association
      assignItem: (itemId: string, categoryId: string) =>
        ipcRenderer.invoke('clipboard:assign-category', itemId, categoryId),

      removeItem: (itemId: string, categoryId: string) =>
        ipcRenderer.invoke('clipboard:remove-category', itemId, categoryId),

      clearItemCategories: (itemId: string) =>
        ipcRenderer.invoke('clipboard:clear-item-categories', itemId),

      getItems: (categoryId: string, options?: ClipboardHistoryOptions) =>
        ipcRenderer.invoke('clipboard:get-items-by-category', categoryId, options),

      // Event subscriptions
      onCreated: (callback: (category: unknown) => void) => {
        const handler = (_event: unknown, category: unknown) => callback(category);
        ipcRenderer.on('clipboard:category-created', handler);
        return () => {
          ipcRenderer.removeListener('clipboard:category-created', handler);
        };
      },

      onUpdated: (callback: (category: unknown) => void) => {
        const handler = (_event: unknown, category: unknown) => callback(category);
        ipcRenderer.on('clipboard:category-updated', handler);
        return () => {
          ipcRenderer.removeListener('clipboard:category-updated', handler);
        };
      },

      onDeleted: (callback: (id: string) => void) => {
        const handler = (_event: unknown, id: string) => callback(id);
        ipcRenderer.on('clipboard:category-deleted', handler);
        return () => {
          ipcRenderer.removeListener('clipboard:category-deleted', handler);
        };
      },
    },
  },

  // Snap (Screenshot Beautification) APIs
  snap: {
    // Capture screen region interactively
    captureRegion: (): Promise<{
      success: boolean;
      imageData?: string;
      width?: number;
      height?: number;
      error?: string;
    }> => ipcRenderer.invoke('snap:capture-region'),

    // Capture a specific window
    captureWindow: (): Promise<{
      success: boolean;
      imageData?: string;
      width?: number;
      height?: number;
      error?: string;
    }> => ipcRenderer.invoke('snap:capture-window'),

    // Get image from clipboard
    getClipboardImage: (): Promise<{
      success: boolean;
      imageData?: string;
      width?: number;
      height?: number;
      error?: string;
    }> => ipcRenderer.invoke('snap:get-clipboard-image'),

    // Copy processed image to clipboard
    copyToClipboard: (
      imageDataUrl: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('snap:copy-to-clipboard', imageDataUrl),

    // Save image to file
    saveToFile: (
      imageDataUrl: string,
      defaultFilename: string
    ): Promise<{ success: boolean; filePath?: string; error?: string }> =>
      ipcRenderer.invoke('snap:save-to-file', imageDataUrl, defaultFilename),

    // Listen for captures from global shortcut
    onCaptured: (
      callback: (result: {
        success: boolean;
        imageData?: string;
        width?: number;
        height?: number;
        error?: string;
      }) => void
    ) => {
      snapCaptureSubscribers.add(callback);
      flushPendingSnapCapture(callback);
      return () => {
        snapCaptureSubscribers.delete(callback);
      };
    },

    // Listen for navigation request (when global shortcut is triggered)
    onNavigate: (callback: () => void) => {
      const handler = () => callback();
      ipcRenderer.on('snap:navigate', handler);
      return () => {
        ipcRenderer.removeListener('snap:navigate', handler);
      };
    },

    // Permission management
    checkPermission: (): Promise<string> =>
      ipcRenderer.invoke('snap:check-permission'),

    requestPermission: (): Promise<string> =>
      ipcRenderer.invoke('snap:request-permission'),

    // Overlay communication (used by overlay windows)
    overlay: {
      signalReady: (displayId: number) =>
        ipcRenderer.send('snap:overlay-ready', displayId),

      onScreenshot: (callback: (data: {
        displayId: number;
        imageDataUrl: string;
        bounds: { x: number; y: number; width: number; height: number };
        scaleFactor: number;
      }) => void) => {
        const handler = (_event: unknown, data: {
          displayId: number;
          imageDataUrl: string;
          bounds: { x: number; y: number; width: number; height: number };
          scaleFactor: number;
        }) => callback(data);
        ipcRenderer.on('snap:overlay-screenshot', handler);
        return () => {
          ipcRenderer.removeListener('snap:overlay-screenshot', handler);
        };
      },

      sendSelection: (selection: {
        displayId: number;
        x: number;
        y: number;
        width: number;
        height: number;
      }) => ipcRenderer.send('snap:overlay-selection', selection),

      sendCancel: () => ipcRenderer.send('snap:overlay-cancel'),

      onWindowSources: (callback: (sources: Array<{
        id: string;
        name: string;
        thumbnailDataUrl: string;
        width: number;
        height: number;
      }>) => void) => {
        const handler = (_event: unknown, sources: Array<{
          id: string;
          name: string;
          thumbnailDataUrl: string;
          width: number;
          height: number;
        }>) => callback(sources);
        ipcRenderer.on('snap:window-sources', handler);
        return () => {
          ipcRenderer.removeListener('snap:window-sources', handler);
        };
      },

      selectWindow: (windowId: string): Promise<void> =>
        ipcRenderer.invoke('snap:window-selected', windowId),
    },
  },

  // Cloud Sync APIs
  sync: {
    getState: () =>
      ipcRenderer.invoke('sync:get-state'),

    getSettings: () =>
      ipcRenderer.invoke('sync:get-settings'),

    setOAuthClient: (config: { clientId: string; clientSecret: string }) =>
      ipcRenderer.invoke('sync:set-oauth-client', config),

    login: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:login'),

    logout: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:logout'),

    toggle: (enabled: boolean): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:toggle', enabled),

    syncNow: (): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('sync:sync-now'),

    onStateChanged: (callback: (state: unknown) => void) => {
      const handler = (_event: unknown, state: unknown) => callback(state);
      ipcRenderer.on('sync:state-changed', handler);
      return () => {
        ipcRenderer.removeListener('sync:state-changed', handler);
      };
    },
  },

  // Keyboard Shortcuts APIs
  shortcuts: {
    // Get all shortcut definitions and current bindings
    getAll: (): Promise<{
      definitions: Array<{
        id: string;
        label: string;
        description: string;
        defaultShortcut: string;
        category: string;
      }>;
      bindings: Array<{
        action: string;
        shortcut: string;
        enabled: boolean;
        lastError?: string;
      }>;
    }> => ipcRenderer.invoke('shortcuts:get-all'),

    // Update a shortcut binding
    updateBinding: (
      action: string,
      newShortcut: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('shortcuts:update-binding', action, newShortcut),

    // Reset a shortcut to default
    resetToDefault: (
      action: string
    ): Promise<{ success: boolean; error?: string }> =>
      ipcRenderer.invoke('shortcuts:reset-to-default', action),

    // Reset all shortcuts to defaults
    resetAll: (): Promise<
      Array<{ action: string; success: boolean; error?: string }>
    > => ipcRenderer.invoke('shortcuts:reset-all'),
  },
};

// Expose types for TypeScript
export type ApiType = typeof api;

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI);
    contextBridge.exposeInMainWorld('api', api);
  } catch (error) {
    console.error(error);
  }
} else {
  // @ts-expect-error - fallback for non-isolated context
  window.electron = electronAPI;
  // @ts-expect-error - fallback for non-isolated context
  window.api = api;
}
