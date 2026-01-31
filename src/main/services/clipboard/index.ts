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
      const item = await this.readClipboardElectron();

      if (item) {
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

  private async readClipboardElectron(): Promise<ClipboardItem | null> {
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

      // Save image asset
      const { originalPath, thumbnailPath } = await this.storage.saveImageAsset(
        id,
        pngBuffer,
        'png'
      );

      return {
        id,
        type: 'image',
        createdAt,
        sourceApp: null,
        imageContent: {
          originalPath,
          thumbnailPath,
          width: size.width,
          height: size.height,
          format: 'png',
          sizeBytes: pngBuffer.length,
        },
        searchableText: `Image ${size.width}x${size.height}`,
        isPinned: false,
        pinboardIds: [],
      };
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

      return item;
    }

    return null;
  }

  private detectContentType(text: string): ClipboardContentType {
    const trimmed = text.trim();

    // Check if it's a URL
    if (/^https?:\/\/[^\s]+$/.test(trimmed)) {
      return 'link';
    }

    // Check if it's a hex color
    if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(trimmed)) {
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

  async pasteItem(id: string): Promise<void> {
    const item = await this.storage.getItem(id);
    if (!item) return;

    switch (item.type) {
      case 'text':
      case 'rich_text':
      case 'link':
        if (item.textContent) {
          clipboard.writeText(item.textContent.plainText);
        }
        break;
      case 'image':
        if (item.imageContent) {
          const image = nativeImage.createFromPath(item.imageContent.originalPath);
          clipboard.writeImage(image);
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
