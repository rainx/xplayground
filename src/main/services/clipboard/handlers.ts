/**
 * IPC Handlers for Clipboard Service
 */

import { ipcMain, BrowserWindow } from 'electron';
import { ClipboardService } from './index';
import type { SearchFilter, ClipboardManagerSettings } from './types';

export function registerClipboardHandlers(
  service: ClipboardService,
  mainWindow: BrowserWindow
): void {
  // Forward clipboard changes to renderer
  service.on('clipboard-change', (item) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-added', item);
    }
  });

  service.on('item-deleted', (id) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-deleted', id);
    }
  });

  // History operations
  ipcMain.handle('clipboard:get-history', async (_event, options?: { limit?: number; offset?: number }) => {
    return service.getHistory(options);
  });

  ipcMain.handle('clipboard:get-item', async (_event, id: string) => {
    return service.getItem(id);
  });

  ipcMain.handle('clipboard:delete-item', async (_event, id: string) => {
    await service.deleteItem(id);
    return { success: true };
  });

  ipcMain.handle('clipboard:paste-item', async (_event, id: string) => {
    await service.pasteItem(id);
    return { success: true };
  });

  // Search
  ipcMain.handle('clipboard:search', async (_event, filter: SearchFilter) => {
    return service.search(filter);
  });

  // Settings
  ipcMain.handle('clipboard:get-settings', async () => {
    return service.getSettings();
  });

  ipcMain.handle('clipboard:update-settings', async (_event, settings: Partial<ClipboardManagerSettings>) => {
    await service.updateSettings(settings);
    return { success: true };
  });

  // Clear history
  ipcMain.handle('clipboard:clear-history', async () => {
    // This would need to be implemented in storage
    return { success: true };
  });
}

export function unregisterClipboardHandlers(): void {
  ipcMain.removeHandler('clipboard:get-history');
  ipcMain.removeHandler('clipboard:get-item');
  ipcMain.removeHandler('clipboard:delete-item');
  ipcMain.removeHandler('clipboard:paste-item');
  ipcMain.removeHandler('clipboard:search');
  ipcMain.removeHandler('clipboard:get-settings');
  ipcMain.removeHandler('clipboard:update-settings');
  ipcMain.removeHandler('clipboard:clear-history');
}
