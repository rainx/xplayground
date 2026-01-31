/**
 * Clipboard Storage - iCloud Drive based storage
 */

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ClipboardItem, ClipboardManagerSettings, SearchFilter } from './types';

export class ClipboardStorage {
  private basePath: string = '';
  private dataPath: string = '';
  private assetsPath: string = '';
  private indexCache: ClipboardItem[] = [];
  private settings: ClipboardManagerSettings;
  private initialized: boolean = false;

  constructor() {
    this.settings = {
      maxHistoryItems: 1000,
      retentionDays: 30,
      iCloudSyncEnabled: true,
    };
  }

  private initPaths(): void {
    if (this.initialized) return;

    // Use app's userData directory as fallback (works without special permissions)
    // For iCloud sync, we'll try iCloud Drive path first, but fallback to local storage
    const userDataPath = app.getPath('userData');

    // TODO: Once app is properly signed and has iCloud entitlements,
    // we can use: ~/Library/Mobile Documents/com~rainx~xtoolbox/Documents/clipboard
    // For now, use local storage
    this.basePath = path.join(userDataPath, 'clipboard');
    this.dataPath = path.join(this.basePath, 'data');
    this.assetsPath = path.join(this.basePath, 'assets');
    this.initialized = true;
  }

  async initialize(): Promise<void> {
    // Initialize paths (must be called after app is ready)
    this.initPaths();

    // Create directory structure
    await fs.mkdir(this.dataPath, { recursive: true });
    await fs.mkdir(path.join(this.dataPath, 'items'), { recursive: true });
    await fs.mkdir(path.join(this.assetsPath, 'images'), { recursive: true });
    await fs.mkdir(path.join(this.assetsPath, 'thumbnails'), { recursive: true });
    await fs.mkdir(path.join(this.assetsPath, 'icons'), { recursive: true });

    // Load index
    await this.loadIndex();

    // Load settings
    await this.loadSettings();
  }

  private getIndexPath(): string {
    return path.join(this.dataPath, 'index.json');
  }

  private getSettingsPath(): string {
    return path.join(this.dataPath, 'settings.json');
  }

  private async loadIndex(): Promise<void> {
    try {
      const indexPath = this.getIndexPath();
      const data = await fs.readFile(indexPath, 'utf-8');
      const parsed = JSON.parse(data);
      this.indexCache = parsed.items || [];
    } catch {
      // Index doesn't exist yet
      this.indexCache = [];
    }
  }

  private async saveIndex(): Promise<void> {
    const indexPath = this.getIndexPath();
    const data = {
      version: 1,
      lastModified: new Date().toISOString(),
      items: this.indexCache,
    };
    try {
      await fs.writeFile(indexPath, JSON.stringify(data, null, 2));
      console.log(`[ClipboardStorage] Index saved: ${this.indexCache.length} items`);
    } catch (error) {
      console.error('[ClipboardStorage] Failed to save index:', error);
      throw error;
    }
  }

  private async loadSettings(): Promise<void> {
    try {
      const settingsPath = this.getSettingsPath();
      const data = await fs.readFile(settingsPath, 'utf-8');
      this.settings = { ...this.settings, ...JSON.parse(data) };
    } catch {
      // Settings don't exist yet, use defaults
    }
  }

  async saveSettings(settings: Partial<ClipboardManagerSettings>): Promise<void> {
    this.settings = { ...this.settings, ...settings };
    const settingsPath = this.getSettingsPath();
    await fs.writeFile(settingsPath, JSON.stringify(this.settings, null, 2));
  }

  getSettings(): ClipboardManagerSettings {
    return { ...this.settings };
  }

  async saveItem(item: ClipboardItem): Promise<void> {
    // Skip items with empty or invalid content
    if (!item.searchableText || !item.searchableText.trim()) {
      return;
    }

    // Save to index (at the beginning for recency)
    this.indexCache.unshift(item);

    // Trim to max items
    if (this.indexCache.length > this.settings.maxHistoryItems) {
      const removed = this.indexCache.splice(this.settings.maxHistoryItems);
      // Clean up removed items' assets
      for (const removedItem of removed) {
        await this.deleteItemAssets(removedItem);
      }
    }

    // Save index
    await this.saveIndex();

    // Save full item data
    const yearMonth = item.createdAt.substring(0, 7);
    const itemDir = path.join(this.dataPath, 'items', yearMonth);
    await fs.mkdir(itemDir, { recursive: true });
    const itemPath = path.join(itemDir, `${item.id}.json`);
    await fs.writeFile(itemPath, JSON.stringify(item, null, 2));
  }

  async getItem(id: string): Promise<ClipboardItem | null> {
    const indexItem = this.indexCache.find((item) => item.id === id);
    if (!indexItem) return null;

    // Load full item data
    const yearMonth = indexItem.createdAt.substring(0, 7);
    const itemPath = path.join(this.dataPath, 'items', yearMonth, `${id}.json`);

    try {
      const data = await fs.readFile(itemPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return indexItem; // Return index version if full data not found
    }
  }

  async deleteItem(id: string): Promise<boolean> {
    const index = this.indexCache.findIndex((item) => item.id === id);
    if (index === -1) {
      console.warn(`[ClipboardStorage] Item not found for deletion: ${id}`);
      return false;
    }

    const item = this.indexCache[index];
    this.indexCache.splice(index, 1);
    await this.saveIndex();
    console.log(`[ClipboardStorage] Deleted item: ${id}, remaining items: ${this.indexCache.length}`);

    // Delete item file
    const yearMonth = item.createdAt.substring(0, 7);
    const itemPath = path.join(this.dataPath, 'items', yearMonth, `${id}.json`);
    try {
      await fs.unlink(itemPath);
    } catch {
      // File might not exist
    }

    // Delete assets
    await this.deleteItemAssets(item);
    return true;
  }

  private async deleteItemAssets(item: ClipboardItem): Promise<void> {
    if (item.imageContent) {
      try {
        if (item.imageContent.originalPath) {
          await fs.unlink(item.imageContent.originalPath);
        }
        if (item.imageContent.thumbnailPath) {
          await fs.unlink(item.imageContent.thumbnailPath);
        }
      } catch {
        // Assets might not exist
      }
    }
  }

  async getHistory(options: {
    limit?: number;
    offset?: number;
  }): Promise<{ items: ClipboardItem[]; totalCount: number; hasMore: boolean }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    // Filter out items with empty or invalid content
    const validItems = this.indexCache.filter(
      (item) => item.searchableText && item.searchableText.trim().length > 0
    );

    const items = validItems.slice(offset, offset + limit);
    const hasMore = offset + limit < validItems.length;

    console.log(`[ClipboardStorage] getHistory: offset=${offset}, limit=${limit}, totalInCache=${this.indexCache.length}, validItems=${validItems.length}, returned=${items.length}, hasMore=${hasMore}`);

    return {
      items,
      totalCount: validItems.length,
      hasMore,
    };
  }

  async search(filter: SearchFilter): Promise<ClipboardItem[]> {
    let results = [...this.indexCache];

    // Filter out items with empty or invalid searchable text
    results = results.filter((item) =>
      item.searchableText && item.searchableText.trim().length > 0
    );

    // Filter by query
    if (filter.query) {
      const query = filter.query.toLowerCase();
      results = results.filter((item) =>
        item.searchableText.toLowerCase().includes(query)
      );
    }

    // Filter by content type
    if (filter.contentTypes && filter.contentTypes.length > 0) {
      results = results.filter((item) =>
        filter.contentTypes!.includes(item.type)
      );
    }

    // Filter by source app
    if (filter.sourceApps && filter.sourceApps.length > 0) {
      results = results.filter(
        (item) =>
          item.sourceApp && filter.sourceApps!.includes(item.sourceApp.bundleId)
      );
    }

    // Filter by date range
    if (filter.dateRange) {
      const start = new Date(filter.dateRange.start).getTime();
      const end = new Date(filter.dateRange.end).getTime();
      results = results.filter((item) => {
        const time = new Date(item.createdAt).getTime();
        return time >= start && time <= end;
      });
    }

    return results;
  }

  async saveImageAsset(
    itemId: string,
    imageData: Buffer,
    format: string
  ): Promise<{ originalPath: string; thumbnailPath: string }> {
    const originalPath = path.join(
      this.assetsPath,
      'images',
      `${itemId}.${format}`
    );
    const thumbnailPath = path.join(
      this.assetsPath,
      'thumbnails',
      `${itemId}.png`
    );

    // Save original
    await fs.writeFile(originalPath, imageData);

    // For now, just copy as thumbnail (proper thumbnail generation would use sharp or similar)
    await fs.writeFile(thumbnailPath, imageData);

    return { originalPath, thumbnailPath };
  }

  getAssetsPath(): string {
    return this.assetsPath;
  }

  // Category association methods

  async assignCategory(itemId: string, categoryId: string): Promise<boolean> {
    const item = this.indexCache.find((i) => i.id === itemId);
    if (!item) return false;

    // Initialize pinboardIds if not exists (using pinboardIds as categoryIds)
    if (!item.pinboardIds) {
      item.pinboardIds = [];
    }

    // Don't add if already assigned
    if (item.pinboardIds.includes(categoryId)) {
      return true;
    }

    item.pinboardIds.push(categoryId);
    await this.saveIndex();
    await this.updateItemFile(item);
    return true;
  }

  async removeCategory(itemId: string, categoryId: string): Promise<boolean> {
    const item = this.indexCache.find((i) => i.id === itemId);
    if (!item || !item.pinboardIds) return false;

    const index = item.pinboardIds.indexOf(categoryId);
    if (index === -1) return false;

    item.pinboardIds.splice(index, 1);
    await this.saveIndex();
    await this.updateItemFile(item);
    return true;
  }

  async clearItemCategories(itemId: string): Promise<boolean> {
    const item = this.indexCache.find((i) => i.id === itemId);
    if (!item) return false;

    item.pinboardIds = [];
    await this.saveIndex();
    await this.updateItemFile(item);
    return true;
  }

  async getItemsByCategory(
    categoryId: string,
    options: { limit?: number; offset?: number }
  ): Promise<{ items: ClipboardItem[]; totalCount: number; hasMore: boolean }> {
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const filteredItems = this.indexCache.filter(
      (item) =>
        item.pinboardIds &&
        item.pinboardIds.includes(categoryId) &&
        item.searchableText &&
        item.searchableText.trim().length > 0
    );

    const items = filteredItems.slice(offset, offset + limit);
    const hasMore = offset + limit < filteredItems.length;

    return {
      items,
      totalCount: filteredItems.length,
      hasMore,
    };
  }

  async removeAllItemsFromCategory(categoryId: string): Promise<void> {
    for (const item of this.indexCache) {
      if (item.pinboardIds && item.pinboardIds.includes(categoryId)) {
        const index = item.pinboardIds.indexOf(categoryId);
        if (index !== -1) {
          item.pinboardIds.splice(index, 1);
        }
      }
    }
    await this.saveIndex();
  }

  private async updateItemFile(item: ClipboardItem): Promise<void> {
    const yearMonth = item.createdAt.substring(0, 7);
    const itemPath = path.join(this.dataPath, 'items', yearMonth, `${item.id}.json`);
    try {
      await fs.writeFile(itemPath, JSON.stringify(item, null, 2));
    } catch {
      // File might not exist, that's okay
    }
  }

  async duplicateItem(itemId: string): Promise<ClipboardItem | null> {
    const originalItem = this.indexCache.find((i) => i.id === itemId);
    if (!originalItem) return null;

    const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    const duplicatedItem: ClipboardItem = {
      ...originalItem,
      id: newId,
      createdAt: now,
      pinboardIds: [...(originalItem.pinboardIds || [])],
    };

    // Handle image duplication if needed
    if (duplicatedItem.imageContent) {
      const originalPath = duplicatedItem.imageContent.originalPath;
      const thumbnailPath = duplicatedItem.imageContent.thumbnailPath;
      const format = duplicatedItem.imageContent.format;

      if (originalPath) {
        const newOriginalPath = path.join(this.assetsPath, 'images', `${newId}.${format}`);
        const newThumbnailPath = path.join(this.assetsPath, 'thumbnails', `${newId}.png`);

        try {
          await fs.copyFile(originalPath, newOriginalPath);
          if (thumbnailPath) {
            await fs.copyFile(thumbnailPath, newThumbnailPath);
          }
          duplicatedItem.imageContent = {
            ...duplicatedItem.imageContent,
            originalPath: newOriginalPath,
            thumbnailPath: newThumbnailPath,
          };
        } catch {
          // If copy fails, keep original paths
        }
      }
    }

    await this.saveItem(duplicatedItem);
    return duplicatedItem;
  }
}
