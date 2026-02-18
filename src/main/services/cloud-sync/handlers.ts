/**
 * Cloud Sync IPC Handlers
 */

import { ipcMain, BrowserWindow } from 'electron';
import type { CloudSyncService } from './index';
import type { OAuthClientConfig } from './types';

export function registerCloudSyncHandlers(
  service: CloudSyncService,
  mainWindow: BrowserWindow
): void {
  // Forward state changes to renderer
  service.on('state-changed', (state) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('sync:state-changed', state);
    }
  });

  // Forward synced items to trigger UI refresh
  service.on('item-synced', (item) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-added', item);
    }
  });

  // Get current sync state
  ipcMain.handle('sync:get-state', () => {
    return service.getState();
  });

  // Get sync settings
  ipcMain.handle('sync:get-settings', () => {
    return service.getSettings();
  });

  // Set OAuth client credentials
  ipcMain.handle('sync:set-oauth-client', async (_event, config: OAuthClientConfig) => {
    try {
      await service.setOAuthClientConfig(config);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Login with Google
  ipcMain.handle('sync:login', async () => {
    try {
      await service.login();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Logout
  ipcMain.handle('sync:logout', async () => {
    try {
      await service.logout();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Toggle sync on/off
  ipcMain.handle('sync:toggle', async (_event, enabled: boolean) => {
    try {
      await service.toggleSync(enabled);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // Force immediate sync
  ipcMain.handle('sync:sync-now', async () => {
    try {
      await service.syncNow();
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });
}

export function unregisterCloudSyncHandlers(): void {
  ipcMain.removeHandler('sync:get-state');
  ipcMain.removeHandler('sync:get-settings');
  ipcMain.removeHandler('sync:set-oauth-client');
  ipcMain.removeHandler('sync:login');
  ipcMain.removeHandler('sync:logout');
  ipcMain.removeHandler('sync:toggle');
  ipcMain.removeHandler('sync:sync-now');
}
