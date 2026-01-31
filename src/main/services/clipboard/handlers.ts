/**
 * IPC Handlers for Clipboard Service
 */

import { ipcMain, BrowserWindow, shell } from 'electron';
import { exec } from 'child_process';
import { ClipboardService } from './index';
import { CategoryStorage } from './category-storage';
import type { SearchFilter, ClipboardManagerSettings, CategoryCreateInput, CategoryUpdateInput } from './types';

let categoryStorage: CategoryStorage | null = null;
let popupWindowRef: BrowserWindow | null = null;

async function getCategoryStorage(): Promise<CategoryStorage> {
  if (!categoryStorage) {
    categoryStorage = new CategoryStorage();
    await categoryStorage.initialize();
  }
  return categoryStorage;
}

export function registerClipboardHandlers(
  service: ClipboardService,
  mainWindow: BrowserWindow
): void {
  // Forward clipboard changes to all renderers (main window and popup)
  service.on('clipboard-change', (item) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-added', item);
    }
    if (popupWindowRef && !popupWindowRef.isDestroyed()) {
      popupWindowRef.webContents.send('clipboard:item-added', item);
    }
  });

  service.on('item-deleted', (id) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-deleted', id);
    }
    if (popupWindowRef && !popupWindowRef.isDestroyed()) {
      popupWindowRef.webContents.send('clipboard:item-deleted', id);
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
    const deleted = await service.deleteItem(id);
    return { success: deleted };
  });

  ipcMain.handle('clipboard:paste-item', async (_event, id: string, options?: { hideWindow?: boolean; simulatePaste?: boolean }) => {
    await service.pasteItem(id);

    const shouldHide = options?.hideWindow ?? true;
    const shouldSimulatePaste = options?.simulatePaste ?? true;

    if (shouldHide) {
      // Hide popup window if it's visible
      if (popupWindowRef && !popupWindowRef.isDestroyed() && popupWindowRef.isVisible()) {
        popupWindowRef.hide();
      }
    }

    if (shouldSimulatePaste) {
      // Give the target app time to become active
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Simulate Cmd+V (macOS) or Ctrl+V (Windows/Linux) to paste
      if (process.platform === 'darwin') {
        exec('osascript -e \'tell application "System Events" to keystroke "v" using command down\'');
      } else if (process.platform === 'win32') {
        // Windows: use PowerShell to send Ctrl+V
        exec('powershell -command "$wshell = New-Object -ComObject wscript.shell; $wshell.SendKeys(\'^v\')"');
      } else {
        // Linux: use xdotool
        exec('xdotool key ctrl+v');
      }
    }

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
    const deletedIds = await service.clearHistory();
    return { success: true, deletedCount: deletedIds.length };
  });

  // Clear category items (delete all items in a category)
  ipcMain.handle('clipboard:clear-category-items', async (_event, categoryId: string) => {
    const deletedIds = await service.clearCategoryItems(categoryId);
    return { success: true, deletedCount: deletedIds.length };
  });

  // Category operations
  ipcMain.handle('clipboard:get-categories', async () => {
    const storage = await getCategoryStorage();
    return storage.getCategories();
  });

  ipcMain.handle('clipboard:create-category', async (_event, input: CategoryCreateInput) => {
    const storage = await getCategoryStorage();
    const category = await storage.createCategory(input);
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:category-created', category);
    }
    if (popupWindowRef && !popupWindowRef.isDestroyed()) {
      popupWindowRef.webContents.send('clipboard:category-created', category);
    }
    return category;
  });

  ipcMain.handle('clipboard:update-category', async (_event, id: string, updates: CategoryUpdateInput) => {
    const storage = await getCategoryStorage();
    const category = await storage.updateCategory(id, updates);
    if (category) {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard:category-updated', category);
      }
      if (popupWindowRef && !popupWindowRef.isDestroyed()) {
        popupWindowRef.webContents.send('clipboard:category-updated', category);
      }
    }
    return category;
  });

  ipcMain.handle('clipboard:delete-category', async (_event, id: string) => {
    const storage = await getCategoryStorage();
    const deleted = await storage.deleteCategory(id);
    if (deleted) {
      // Remove category from all items
      await service.removeAllItemsFromCategory(id);
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard:category-deleted', id);
      }
      if (popupWindowRef && !popupWindowRef.isDestroyed()) {
        popupWindowRef.webContents.send('clipboard:category-deleted', id);
      }
    }
    return { success: deleted };
  });

  ipcMain.handle('clipboard:reorder-categories', async (_event, orderedIds: string[]) => {
    const storage = await getCategoryStorage();
    await storage.reorderCategories(orderedIds);
    return { success: true };
  });

  // Item-Category association
  ipcMain.handle('clipboard:assign-category', async (_event, itemId: string, categoryId: string) => {
    const success = await service.assignCategory(itemId, categoryId);
    if (success) {
      const item = await service.getItem(itemId);
      if (item) {
        const eventData = { itemId, categoryIds: item.pinboardIds || [] };
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard:item-category-changed', eventData);
        }
        if (popupWindowRef && !popupWindowRef.isDestroyed()) {
          popupWindowRef.webContents.send('clipboard:item-category-changed', eventData);
        }
      }
    }
    return { success };
  });

  ipcMain.handle('clipboard:remove-category', async (_event, itemId: string, categoryId: string) => {
    const success = await service.removeCategory(itemId, categoryId);
    if (success) {
      const item = await service.getItem(itemId);
      if (item) {
        const eventData = { itemId, categoryIds: item.pinboardIds || [] };
        if (!mainWindow.isDestroyed()) {
          mainWindow.webContents.send('clipboard:item-category-changed', eventData);
        }
        if (popupWindowRef && !popupWindowRef.isDestroyed()) {
          popupWindowRef.webContents.send('clipboard:item-category-changed', eventData);
        }
      }
    }
    return { success };
  });

  ipcMain.handle('clipboard:clear-item-categories', async (_event, itemId: string) => {
    const success = await service.clearItemCategories(itemId);
    if (success) {
      const eventData = { itemId, categoryIds: [] };
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard:item-category-changed', eventData);
      }
      if (popupWindowRef && !popupWindowRef.isDestroyed()) {
        popupWindowRef.webContents.send('clipboard:item-category-changed', eventData);
      }
    }
    return { success };
  });

  ipcMain.handle('clipboard:get-items-by-category', async (_event, categoryId: string, options?: { limit?: number; offset?: number }) => {
    return service.getItemsByCategory(categoryId, options || {});
  });

  // Duplicate item
  ipcMain.handle('clipboard:duplicate-item', async (_event, itemId: string) => {
    const newItem = await service.duplicateItem(itemId);
    if (newItem) {
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('clipboard:item-added', newItem);
      }
      if (popupWindowRef && !popupWindowRef.isDestroyed()) {
        popupWindowRef.webContents.send('clipboard:item-added', newItem);
      }
    }
    return newItem;
  });
}

export function registerWindowHandlers(mainWindow: BrowserWindow, popupWindow?: BrowserWindow | null): void {
  // Store popup window reference for use in paste handler
  popupWindowRef = popupWindow || null;

  // Show/hide window
  ipcMain.handle('window:show', async () => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    return { success: true };
  });

  ipcMain.handle('window:hide', async () => {
    // Hide popup window if it exists and is visible
    if (popupWindow && !popupWindow.isDestroyed() && popupWindow.isVisible()) {
      popupWindow.hide();
    }
    return { success: true };
  });

  // Open URL in default browser
  ipcMain.handle('shell:open-external', async (_event, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  });

  // Open file/folder in default app
  ipcMain.handle('shell:open-path', async (_event, path: string) => {
    await shell.openPath(path);
    return { success: true };
  });

  // Show item in Finder/Explorer
  ipcMain.handle('shell:show-item', async (_event, path: string) => {
    shell.showItemInFolder(path);
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
  ipcMain.removeHandler('clipboard:clear-category-items');
  // Category handlers
  ipcMain.removeHandler('clipboard:get-categories');
  ipcMain.removeHandler('clipboard:create-category');
  ipcMain.removeHandler('clipboard:update-category');
  ipcMain.removeHandler('clipboard:delete-category');
  ipcMain.removeHandler('clipboard:reorder-categories');
  ipcMain.removeHandler('clipboard:assign-category');
  ipcMain.removeHandler('clipboard:remove-category');
  ipcMain.removeHandler('clipboard:clear-item-categories');
  ipcMain.removeHandler('clipboard:get-items-by-category');
  ipcMain.removeHandler('clipboard:duplicate-item');
}
