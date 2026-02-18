/**
 * CloudSyncService - Orchestrator for cloud synchronization
 *
 * Manages the sync lifecycle: auth, periodic sync, on-change sync,
 * and coordination between local storage and cloud provider.
 */

import { EventEmitter } from 'events';
import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { GoogleOAuth } from './oauth/google-oauth';
import { GoogleDriveProvider } from './providers/google-drive';
import type { CloudSyncProvider } from './providers/provider';
import {
  diffManifests,
  mergeTombstones,
  createTombstone,
  createEmptyManifest,
  generateDeviceId,
  generateChecksum,
  buildManifestEntry,
  needsSync,
} from './sync-engine';
import type {
  SyncState,
  SyncManifest,
  SyncSettings,
  OAuthClientConfig,
} from './types';
import { getClipboardService } from '../clipboard';

const SYNC_DEBOUNCE_MS = 5000;
const PERIODIC_SYNC_MS = 5 * 60 * 1000; // 5 minutes

export class CloudSyncService extends EventEmitter {
  private oauth: GoogleOAuth;
  private provider: CloudSyncProvider | null = null;
  private settings: SyncSettings;
  private state: SyncState;
  private deviceId: string = '';
  private localManifest: SyncManifest | null = null;

  private debounceTimer: NodeJS.Timeout | null = null;
  private periodicTimer: NodeJS.Timeout | null = null;
  private isSyncing = false;

  constructor() {
    super();
    this.oauth = new GoogleOAuth();
    this.settings = {
      enabled: false,
      provider: 'google-drive',
      lastSyncedAt: null,
      oauthClient: null,
    };
    this.state = {
      status: 'disconnected',
      provider: null,
      lastSyncedAt: null,
      error: null,
      isAuthenticated: false,
      userEmail: null,
    };
  }

  async initialize(): Promise<void> {
    await this.oauth.initialize();
    await this.loadSettings();
    await this.loadDeviceId();
    await this.loadLocalManifest();

    if (this.oauth.isAuthenticated()) {
      this.provider = new GoogleDriveProvider(this.oauth);
      this.state.isAuthenticated = true;
      this.state.provider = 'google-drive';

      // Fetch user email in background
      this.provider.getUserEmail().then((email) => {
        this.state.userEmail = email;
        this.emitStateChange();
      });

      if (this.settings.enabled) {
        this.state.status = 'idle';
        this.startPeriodicSync();
      }
    }

    this.emitStateChange();
    console.log('[CloudSync] Initialized', {
      authenticated: this.state.isAuthenticated,
      enabled: this.settings.enabled,
    });
  }

  // ─── Settings Persistence ───────────────────────────────────

  private getSettingsPath(): string {
    return path.join(app.getPath('userData'), 'cloud-sync', 'sync-settings.json');
  }

  private getManifestPath(): string {
    return path.join(app.getPath('userData'), 'cloud-sync', 'local-manifest.json');
  }

  private getDeviceIdPath(): string {
    return path.join(app.getPath('userData'), 'cloud-sync', 'device-id');
  }

  private async loadSettings(): Promise<void> {
    try {
      const data = await fs.readFile(this.getSettingsPath(), 'utf-8');
      this.settings = { ...this.settings, ...JSON.parse(data) };
    } catch {
      // Settings don't exist yet
    }
  }

  private async saveSettings(): Promise<void> {
    const dir = path.dirname(this.getSettingsPath());
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.getSettingsPath(), JSON.stringify(this.settings, null, 2));
  }

  private async loadDeviceId(): Promise<void> {
    try {
      this.deviceId = (await fs.readFile(this.getDeviceIdPath(), 'utf-8')).trim();
    } catch {
      this.deviceId = generateDeviceId();
      const dir = path.dirname(this.getDeviceIdPath());
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(this.getDeviceIdPath(), this.deviceId);
    }
  }

  private async loadLocalManifest(): Promise<void> {
    try {
      const data = await fs.readFile(this.getManifestPath(), 'utf-8');
      this.localManifest = JSON.parse(data);
    } catch {
      this.localManifest = createEmptyManifest(this.deviceId);
    }
  }

  private async saveLocalManifest(): Promise<void> {
    if (!this.localManifest) return;
    const dir = path.dirname(this.getManifestPath());
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(this.getManifestPath(), JSON.stringify(this.localManifest, null, 2));
  }

  // ─── Public API ─────────────────────────────────────────────

  getState(): SyncState {
    return { ...this.state };
  }

  getSettings(): SyncSettings {
    return { ...this.settings };
  }

  async setOAuthClientConfig(config: OAuthClientConfig): Promise<void> {
    await this.oauth.saveClientConfig(config);
    this.settings.oauthClient = config;
    await this.saveSettings();
  }

  async login(): Promise<void> {
    try {
      this.state.status = 'syncing';
      this.state.error = null;
      this.emitStateChange();

      await this.oauth.login();

      this.provider = new GoogleDriveProvider(this.oauth);
      this.state.isAuthenticated = true;
      this.state.provider = 'google-drive';
      this.settings.enabled = true;
      await this.saveSettings();

      // Fetch user email
      const email = await this.provider.getUserEmail();
      this.state.userEmail = email;

      this.state.status = 'idle';
      this.emitStateChange();

      // Do initial sync
      this.startPeriodicSync();
      await this.performSync();
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : String(error);
      this.emitStateChange();
      throw error;
    }
  }

  async logout(): Promise<void> {
    this.stopPeriodicSync();
    await this.oauth.clearTokens();

    this.provider = null;
    this.settings.enabled = false;
    this.settings.lastSyncedAt = null;
    await this.saveSettings();

    this.state = {
      status: 'disconnected',
      provider: null,
      lastSyncedAt: null,
      error: null,
      isAuthenticated: false,
      userEmail: null,
    };
    this.emitStateChange();
    console.log('[CloudSync] Logged out');
  }

  async toggleSync(enabled: boolean): Promise<void> {
    this.settings.enabled = enabled;
    await this.saveSettings();

    if (enabled && this.state.isAuthenticated) {
      this.state.status = 'idle';
      this.startPeriodicSync();
      await this.performSync();
    } else {
      this.stopPeriodicSync();
      this.state.status = this.state.isAuthenticated ? 'idle' : 'disconnected';
    }

    this.emitStateChange();
  }

  /**
   * Called when local clipboard data changes. Debounces sync.
   */
  scheduleSyncOnChange(): void {
    if (!this.settings.enabled || !this.state.isAuthenticated) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.performSync().catch((err) => {
        console.error('[CloudSync] Debounced sync failed:', err);
      });
    }, SYNC_DEBOUNCE_MS);
  }

  /**
   * Force an immediate sync.
   */
  async syncNow(): Promise<void> {
    if (!this.state.isAuthenticated) {
      throw new Error('Not authenticated');
    }
    await this.performSync();
  }

  // ─── Sync Logic ─────────────────────────────────────────────

  private startPeriodicSync(): void {
    this.stopPeriodicSync();
    this.periodicTimer = setInterval(() => {
      this.performSync().catch((err) => {
        console.error('[CloudSync] Periodic sync failed:', err);
      });
    }, PERIODIC_SYNC_MS);
  }

  private stopPeriodicSync(): void {
    if (this.periodicTimer) {
      clearInterval(this.periodicTimer);
      this.periodicTimer = null;
    }
  }

  private async performSync(): Promise<void> {
    if (this.isSyncing || !this.provider || !this.state.isAuthenticated) return;

    this.isSyncing = true;
    this.state.status = 'syncing';
    this.state.error = null;
    this.emitStateChange();

    try {
      // 1. Get or create remote manifest
      const remoteManifest = await this.getRemoteManifest();

      // 2. Build current local manifest from storage
      await this.buildLocalManifest();

      // 3. Diff manifests
      const diff = diffManifests(this.localManifest!, remoteManifest);

      // 4. Download remote-only items
      for (const id of diff.remoteOnly) {
        await this.downloadItem(id, remoteManifest);
      }

      // 5. Upload local-only items
      for (const id of diff.localOnly) {
        await this.uploadItem(id);
      }

      // 6. Handle conflicts (newer wins, already resolved in diff)
      for (const id of diff.conflicts) {
        // For conflicts with same timestamp, keep local version
        await this.uploadItem(id);
      }

      // 7. Process remote deletions (remove locally)
      for (const id of diff.remoteDeletions) {
        await this.deleteLocalItem(id);
      }

      // 8. Process local deletions (remove from remote)
      for (const id of diff.localDeletions) {
        await this.deleteRemoteItem(id, remoteManifest);
      }

      // 9. Sync categories and settings
      await this.syncCategories(remoteManifest);
      await this.syncSettings(remoteManifest);

      // 10. Merge tombstones and upload updated manifest
      this.localManifest!.tombstones = mergeTombstones(
        this.localManifest!.tombstones,
        remoteManifest.tombstones
      );
      this.localManifest!.lastModified = new Date().toISOString();

      await this.uploadManifest();
      await this.saveLocalManifest();

      // Update state
      const now = new Date().toISOString();
      this.settings.lastSyncedAt = now;
      this.state.lastSyncedAt = now;
      this.state.status = 'idle';
      this.state.error = null;
      await this.saveSettings();

      console.log('[CloudSync] Sync complete', {
        uploaded: diff.localOnly.length,
        downloaded: diff.remoteOnly.length,
        conflicts: diff.conflicts.length,
      });
    } catch (error) {
      this.state.status = 'error';
      this.state.error = error instanceof Error ? error.message : String(error);
      console.error('[CloudSync] Sync failed:', error);
    } finally {
      this.isSyncing = false;
      this.emitStateChange();
    }
  }

  private async getRemoteManifest(): Promise<SyncManifest> {
    if (!this.provider) throw new Error('No provider');

    const file = await this.provider.findFile('manifest.json');
    if (!file) {
      return createEmptyManifest('remote');
    }

    const content = await this.provider.readFile(file.id);
    return JSON.parse(content);
  }

  private async buildLocalManifest(): Promise<void> {
    if (!this.localManifest) {
      this.localManifest = createEmptyManifest(this.deviceId);
    }

    const clipboardService = getClipboardService();
    const { items } = await clipboardService.getHistory({ limit: 10000 });

    // Build items manifest - only text items (no images for now)
    const newItems: Record<string, typeof this.localManifest.items[string]> = {};
    for (const item of items) {
      if (item.type === 'image') continue; // Skip images

      const content = JSON.stringify(item);
      const existingEntry = this.localManifest.items[item.id];
      newItems[item.id] = {
        id: item.id,
        updatedAt: item.createdAt,
        checksum: generateChecksum(content),
        driveFileId: existingEntry?.driveFileId,
      };
    }
    this.localManifest.items = newItems;

    this.localManifest.lastModified = new Date().toISOString();
  }

  private async uploadItem(id: string): Promise<void> {
    if (!this.provider || !this.localManifest) return;

    const clipboardService = getClipboardService();
    const item = await clipboardService.getItem(id);
    if (!item || item.type === 'image') return;

    const content = JSON.stringify(item);
    const fileName = `item-${id}.json`;

    const existingFileId = this.localManifest.items[id]?.driveFileId;
    const cloudFile = await this.provider.upsertFile(fileName, content, existingFileId);

    this.localManifest.items[id] = buildManifestEntry(id, content, cloudFile.id);
  }

  private async downloadItem(id: string, remoteManifest: SyncManifest): Promise<void> {
    if (!this.provider) return;

    const entry = remoteManifest.items[id];
    if (!entry?.driveFileId) {
      // Try to find the file by name
      const file = await this.provider.findFile(`item-${id}.json`);
      if (!file) return;
      entry.driveFileId = file.id;
    }

    const content = await this.provider.readFile(entry.driveFileId!);
    const item = JSON.parse(content);

    // Save to local storage via clipboard service
    const clipboardService = getClipboardService();
    // Check if already exists locally
    const existing = await clipboardService.getItem(id);
    if (!existing) {
      // Import the item directly to storage
      const storage = (clipboardService as unknown as { storage: { saveItem: (item: unknown) => Promise<void> } }).storage;
      await storage.saveItem(item);
      this.emit('item-synced', item);
    }

    // Update local manifest
    if (this.localManifest) {
      this.localManifest.items[id] = {
        id,
        updatedAt: entry.updatedAt,
        checksum: entry.checksum,
        driveFileId: entry.driveFileId,
      };
    }
  }

  private async deleteLocalItem(id: string): Promise<void> {
    const clipboardService = getClipboardService();
    await clipboardService.deleteItem(id);

    if (this.localManifest) {
      delete this.localManifest.items[id];
    }
  }

  private async deleteRemoteItem(id: string, remoteManifest: SyncManifest): Promise<void> {
    if (!this.provider) return;

    const entry = remoteManifest.items[id];
    if (entry?.driveFileId) {
      try {
        await this.provider.deleteFile(entry.driveFileId);
      } catch {
        // File might already be deleted
      }
    }

    // Add tombstone to local manifest
    if (this.localManifest) {
      this.localManifest.tombstones.push(createTombstone(id));
    }
  }

  private async syncCategories(remoteManifest: SyncManifest): Promise<void> {
    if (!this.provider || !this.localManifest) return;

    const categoriesPath = path.join(app.getPath('userData'), 'clipboard', 'data', 'categories.json');

    let localCategories = '[]';
    try {
      // Try to read categories (might be encrypted)
      const data = await fs.readFile(categoriesPath, 'utf-8');
      localCategories = data;
    } catch {
      // No categories yet
    }

    const localChecksum = generateChecksum(localCategories);
    this.localManifest.categories = {
      id: 'categories',
      updatedAt: new Date().toISOString(),
      checksum: localChecksum,
      driveFileId: this.localManifest.categories.driveFileId,
    };

    const direction = needsSync(this.localManifest.categories, remoteManifest.categories);

    if (direction === 'local') {
      const cloudFile = await this.provider.upsertFile(
        'categories.json',
        localCategories,
        this.localManifest.categories.driveFileId
      );
      this.localManifest.categories.driveFileId = cloudFile.id;
    } else if (direction === 'remote' && remoteManifest.categories.driveFileId) {
      const remoteCategories = await this.provider.readFile(remoteManifest.categories.driveFileId);
      try {
        await fs.writeFile(categoriesPath, remoteCategories);
      } catch {
        // Write failed
      }
      this.localManifest.categories = {
        ...remoteManifest.categories,
      };
    }
  }

  private async syncSettings(remoteManifest: SyncManifest): Promise<void> {
    if (!this.provider || !this.localManifest) return;

    const clipboardService = getClipboardService();
    const localSettings = JSON.stringify(clipboardService.getSettings());
    const localChecksum = generateChecksum(localSettings);

    this.localManifest.settings = {
      id: 'settings',
      updatedAt: new Date().toISOString(),
      checksum: localChecksum,
      driveFileId: this.localManifest.settings.driveFileId,
    };

    const direction = needsSync(this.localManifest.settings, remoteManifest.settings);

    if (direction === 'local') {
      const cloudFile = await this.provider.upsertFile(
        'settings.json',
        localSettings,
        this.localManifest.settings.driveFileId
      );
      this.localManifest.settings.driveFileId = cloudFile.id;
    } else if (direction === 'remote' && remoteManifest.settings.driveFileId) {
      const remoteSettings = await this.provider.readFile(remoteManifest.settings.driveFileId);
      try {
        const parsed = JSON.parse(remoteSettings);
        await clipboardService.updateSettings(parsed);
      } catch {
        // Parse or update failed
      }
      this.localManifest.settings = {
        ...remoteManifest.settings,
      };
    }
  }

  private async uploadManifest(): Promise<void> {
    if (!this.provider || !this.localManifest) return;

    const content = JSON.stringify(this.localManifest, null, 2);
    const file = await this.provider.findFile('manifest.json');
    await this.provider.upsertFile('manifest.json', content, file?.id);
  }

  private emitStateChange(): void {
    this.emit('state-changed', this.getState());
  }

  // ─── Lifecycle ──────────────────────────────────────────────

  destroy(): void {
    this.stopPeriodicSync();
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.removeAllListeners();
  }
}

// Singleton instance
let instance: CloudSyncService | null = null;

export function getCloudSyncService(): CloudSyncService {
  if (!instance) {
    instance = new CloudSyncService();
  }
  return instance;
}
