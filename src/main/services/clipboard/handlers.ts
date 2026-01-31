/**
 * IPC Handlers for Clipboard Service
 */

import { ipcMain, BrowserWindow } from 'electron';
import { ClipboardService } from './index';
import { CategoryStorage } from './category-storage';
import type { SearchFilter, ClipboardManagerSettings, CategoryCreateInput, CategoryUpdateInput } from './types';

let categoryStorage: CategoryStorage | null = null;

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
    const deleted = await service.deleteItem(id);
    return { success: deleted };
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
    return category;
  });

  ipcMain.handle('clipboard:update-category', async (_event, id: string, updates: CategoryUpdateInput) => {
    const storage = await getCategoryStorage();
    const category = await storage.updateCategory(id, updates);
    if (category && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:category-updated', category);
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
    if (success && !mainWindow.isDestroyed()) {
      const item = await service.getItem(itemId);
      if (item) {
        mainWindow.webContents.send('clipboard:item-category-changed', {
          itemId,
          categoryIds: item.pinboardIds || [],
        });
      }
    }
    return { success };
  });

  ipcMain.handle('clipboard:remove-category', async (_event, itemId: string, categoryId: string) => {
    const success = await service.removeCategory(itemId, categoryId);
    if (success && !mainWindow.isDestroyed()) {
      const item = await service.getItem(itemId);
      if (item) {
        mainWindow.webContents.send('clipboard:item-category-changed', {
          itemId,
          categoryIds: item.pinboardIds || [],
        });
      }
    }
    return { success };
  });

  ipcMain.handle('clipboard:clear-item-categories', async (_event, itemId: string) => {
    const success = await service.clearItemCategories(itemId);
    if (success && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-category-changed', {
        itemId,
        categoryIds: [],
      });
    }
    return { success };
  });

  ipcMain.handle('clipboard:get-items-by-category', async (_event, categoryId: string, options?: { limit?: number; offset?: number }) => {
    return service.getItemsByCategory(categoryId, options || {});
  });

  // Duplicate item
  ipcMain.handle('clipboard:duplicate-item', async (_event, itemId: string) => {
    const newItem = await service.duplicateItem(itemId);
    if (newItem && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard:item-added', newItem);
    }
    return newItem;
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
