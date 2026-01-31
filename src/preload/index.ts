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

// Custom APIs for renderer
const api = {
  // Native Rust function invocation
  invokeNative: (method: string, ...args: unknown[]) =>
    ipcRenderer.invoke('native:invoke', method, ...args),

  // Clipboard Manager APIs
  clipboard: {
    // History operations
    getHistory: (options?: ClipboardHistoryOptions) =>
      ipcRenderer.invoke('clipboard:get-history', options),

    getItem: (id: string) =>
      ipcRenderer.invoke('clipboard:get-item', id),

    deleteItem: (id: string) =>
      ipcRenderer.invoke('clipboard:delete-item', id),

    pasteItem: (id: string) =>
      ipcRenderer.invoke('clipboard:paste-item', id),

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
