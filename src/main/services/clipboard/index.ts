/**
 * ClipboardService - Main clipboard management service
 *
 * Responsibilities:
 * - Monitor clipboard changes via native module polling
 * - Transform native clipboard data to app format
 * - Persist data to iCloud storage
 * - Emit events to renderer process
 */

import { EventEmitter } from 'events';
import { clipboard, nativeImage } from 'electron';
import { ClipboardStorage } from './storage';
import type {
  ClipboardItem,
  ClipboardContentType,
  SearchFilter,
  ClipboardManagerSettings,
} from './types';

export class ClipboardService extends EventEmitter {
  private storage: ClipboardStorage;
  private pollInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;
  // Track last seen clipboard content to prevent re-adding after deletion
  private lastSeenContent: ClipboardItem | null = null;

  constructor() {
    super();
    this.storage = new ClipboardStorage();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    this.startMonitoring();
  }

  private startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    // this.lastChangeCount = 0;

    // Poll every 500ms
    this.pollInterval = setInterval(() => {
      this.checkClipboard();
    }, 500);
  }

  private stopMonitoring(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    this.isMonitoring = false;
  }

  private async checkClipboard(): Promise<void> {
    try {
      // Use Electron's clipboard API for now
      // When native module is ready, we'll switch to it
      const result = await this.readClipboardElectron();

      if (result) {
        const { item, pendingImageData } = result;

        // Check if this is the same as last seen content (prevents re-adding after deletion)
        if (this.lastSeenContent && this.isSameContent(this.lastSeenContent, item)) {
          return;
        }

        // Update last seen content BEFORE any other checks
        // This ensures even if we skip saving, we won't re-check the same content
        this.lastSeenContent = item;

        // Check against recent history to avoid duplicates
        const recentItems = (await this.storage.getHistory({ limit: 5 })).items;
        for (const historyItem of recentItems) {
          if (this.isSameContent(historyItem, item)) {
            return;
          }
        }

        // Now save image if pending (only after dedup check passes)
        if (pendingImageData && item.imageContent) {
          const { originalPath, thumbnailPath } = await this.storage.saveImageAsset(
            item.id,
            pendingImageData,
            'png'
          );
          item.imageContent.originalPath = originalPath;
          item.imageContent.thumbnailPath = thumbnailPath;
        }

        // Save and emit
        console.log(`[ClipboardService] New clipboard item: ${item.type}, content: ${item.searchableText?.substring(0, 50)}`);
        await this.storage.saveItem(item);
        this.emit('clipboard-change', item);
      }
    } catch (error) {
      console.error('Clipboard check error:', error);
    }
  }

  private isSameContent(a: ClipboardItem, b: ClipboardItem): boolean {
    if (a.type !== b.type) return false;

    switch (a.type) {
      case 'text':
      case 'rich_text':
      case 'link':
      case 'color':
        return a.textContent?.plainText === b.textContent?.plainText;
      case 'image':
        // Compare by size for now
        return (
          a.imageContent?.sizeBytes === b.imageContent?.sizeBytes &&
          a.imageContent?.width === b.imageContent?.width
        );
      case 'file':
        return (
          JSON.stringify(a.fileContent?.files.map((f) => f.path)) ===
          JSON.stringify(b.fileContent?.files.map((f) => f.path))
        );
      default:
        // Unknown type - compare by searchableText as fallback
        return a.searchableText === b.searchableText;
    }
  }

  private async readClipboardElectron(): Promise<{
    item: ClipboardItem;
    pendingImageData?: Buffer;
  } | null> {
    const formats = clipboard.availableFormats();

    if (formats.length === 0) {
      return null;
    }

    const id = this.generateId();
    const createdAt = new Date().toISOString();

    // Check for images first
    const image = clipboard.readImage();
    if (!image.isEmpty()) {
      const size = image.getSize();

      // Skip very small images (likely empty or placeholder)
      if (size.width < 4 || size.height < 4) {
        return null;
      }

      const pngBuffer = image.toPNG();

      // Skip images with very small data size (likely empty/transparent)
      if (pngBuffer.length < 100) {
        return null;
      }

      // Don't save image yet - return pending data for dedup check first
      const item: ClipboardItem = {
        id,
        type: 'image',
        createdAt,
        sourceApp: null,
        imageContent: {
          originalPath: '', // Will be set after dedup check
          thumbnailPath: '', // Will be set after dedup check
          width: size.width,
          height: size.height,
          format: 'png',
          sizeBytes: pngBuffer.length,
        },
        searchableText: `Image ${size.width}x${size.height}`,
        isPinned: false,
        pinboardIds: [],
      };

      return { item, pendingImageData: pngBuffer };
    }

    // Check for text
    const text = clipboard.readText();
    // Skip empty or whitespace-only text
    if (text && text.trim()) {
      const type = this.detectContentType(text);

      const item: ClipboardItem = {
        id,
        type,
        createdAt,
        sourceApp: null,
        textContent: {
          plainText: text,
          characterCount: text.length,
          lineCount: text.split('\n').length,
        },
        searchableText: text,
        isPinned: false,
        pinboardIds: [],
      };

      // If it's a link, add link content
      if (type === 'link') {
        const url = text.trim();
        item.linkContent = {
          url,
          domain: this.extractDomain(url),
        };
      }

      // If it's a color, add color content
      if (type === 'color') {
        const colorValue = text.trim();
        const displayValue = colorValue.startsWith('#') ? colorValue : `#${colorValue}`;
        item.colorContent = {
          hexValue: colorValue,
          displayValue: displayValue.toUpperCase(),
        };
      }

      // Check for HTML
      const html = clipboard.readHTML();
      if (html) {
        item.textContent!.htmlData = html;
        if (type === 'text') {
          item.type = 'rich_text';
        }
      }

      // Check for RTF
      const rtf = clipboard.readRTF();
      if (rtf) {
        item.textContent!.rtfData = rtf;
        if (type === 'text') {
          item.type = 'rich_text';
        }
      }

      return { item };
    }

    return null;
  }

  private detectContentType(text: string): ClipboardContentType {
    const trimmed = text.trim();

    // Check if it's a URL
    if (/^https?:\/\/[^\s]+$/.test(trimmed)) {
      return 'link';
    }

    // Check if it's a hex color (with or without # prefix)
    // Matches: #RGB, #RRGGBB, RGB, RRGGBB
    if (/^#?([0-9A-Fa-f]{3}){1,2}$/.test(trimmed)) {
      return 'color';
    }

    return 'text';
  }

  private extractDomain(url: string): string {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API methods
  async getHistory(options?: { limit?: number; offset?: number }) {
    return this.storage.getHistory(options || {});
  }

  async getItem(id: string) {
    return this.storage.getItem(id);
  }

  async deleteItem(id: string): Promise<boolean> {
    const deleted = await this.storage.deleteItem(id);
    if (deleted) {
      this.emit('item-deleted', id);
    }
    return deleted;
  }

  async updateItem(id: string, updates: Partial<ClipboardItem>): Promise<ClipboardItem | null> {
    const updatedItem = await this.storage.updateItem(id, updates);
    if (updatedItem) {
      this.emit('item-updated', updatedItem);
    }
    return updatedItem;
  }

  async pasteItem(id: string): Promise<void> {
    const item = await this.storage.getItem(id);
    if (!item) return;

    switch (item.type) {
      case 'text':
      case 'rich_text':
      case 'link':
      case 'color':
        if (item.textContent) {
          clipboard.writeText(item.textContent.plainText);
        }
        break;
      case 'image':
        if (item.imageContent) {
          // Handle encrypted images
          if (item.imageContent.originalPath.endsWith('.enc')) {
            const imageData = await this.storage.getImageData(item.imageContent.originalPath);
            if (imageData) {
              const image = nativeImage.createFromBuffer(imageData);
              clipboard.writeImage(image);
            }
          } else {
            const image = nativeImage.createFromPath(item.imageContent.originalPath);
            clipboard.writeImage(image);
          }
        }
        break;
      // Files would require different handling
    }
  }

  async search(filter: SearchFilter) {
    return this.storage.search(filter);
  }

  getSettings() {
    return this.storage.getSettings();
  }

  async updateSettings(settings: Partial<ClipboardManagerSettings>) {
    await this.storage.saveSettings(settings);
  }

  // Category association methods
  async assignCategory(itemId: string, categoryId: string): Promise<boolean> {
    return this.storage.assignCategory(itemId, categoryId);
  }

  async removeCategory(itemId: string, categoryId: string): Promise<boolean> {
    return this.storage.removeCategory(itemId, categoryId);
  }

  async clearItemCategories(itemId: string): Promise<boolean> {
    return this.storage.clearItemCategories(itemId);
  }

  async getItemsByCategory(categoryId: string, options: { limit?: number; offset?: number }) {
    return this.storage.getItemsByCategory(categoryId, options);
  }

  async removeAllItemsFromCategory(categoryId: string): Promise<void> {
    return this.storage.removeAllItemsFromCategory(categoryId);
  }

  async duplicateItem(itemId: string): Promise<ClipboardItem | null> {
    return this.storage.duplicateItem(itemId);
  }

  async getImageData(imagePath: string): Promise<Buffer | null> {
    return this.storage.getImageData(imagePath);
  }

  async clearHistory(): Promise<string[]> {
    const deletedIds = await this.storage.clearHistory();
    // Emit deleted event for each item
    for (const id of deletedIds) {
      this.emit('item-deleted', id);
    }
    // Read current clipboard content and mark it as "seen" to prevent re-adding
    // Any content copied before clear should not be captured again
    const currentClipboard = await this.readClipboardElectron();
    if (currentClipboard) {
      this.lastSeenContent = currentClipboard.item;
    }
    return deletedIds;
  }

  async clearCategoryItems(categoryId: string): Promise<string[]> {
    const deletedIds = await this.storage.clearCategoryItems(categoryId);
    // Emit deleted event for each item
    for (const id of deletedIds) {
      this.emit('item-deleted', id);
    }
    // Read current clipboard content and mark it as "seen" to prevent re-adding
    // Any content copied before clear should not be captured again
    const currentClipboard = await this.readClipboardElectron();
    if (currentClipboard) {
      this.lastSeenContent = currentClipboard.item;
    }
    return deletedIds;
  }

  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

// Singleton instance
let instance: ClipboardService | null = null;

export function getClipboardService(): ClipboardService {
  if (!instance) {
    instance = new ClipboardService();
  }
  return instance;
}
