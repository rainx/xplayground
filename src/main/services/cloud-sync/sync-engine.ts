/**
 * Sync Engine - Manifest diff, merge, and conflict resolution
 */

import * as crypto from 'crypto';
import * as os from 'os';
import type {
  SyncManifest,
  SyncManifestEntry,
  SyncDiff,
  SyncTombstone,
} from './types';

const TOMBSTONE_TTL_DAYS = 30;

/**
 * Generate a checksum for JSON content.
 */
export function generateChecksum(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex');
}

/**
 * Create a new empty manifest for a device.
 */
export function createEmptyManifest(deviceId: string): SyncManifest {
  const now = new Date().toISOString();
  return {
    version: 1,
    deviceId,
    lastModified: now,
    items: {},
    categories: { id: 'categories', updatedAt: now, checksum: '' },
    settings: { id: 'settings', updatedAt: now, checksum: '' },
    tombstones: [],
  };
}

/**
 * Generate a stable device ID based on platform info.
 */
export function generateDeviceId(): string {
  const raw = `${os.hostname()}-${os.platform()}-${os.arch()}-${Date.now()}`;
  return crypto.createHash('sha256').update(raw).digest('hex').substring(0, 16);
}

/**
 * Diff local and remote manifests to determine what needs syncing.
 */
export function diffManifests(
  local: SyncManifest,
  remote: SyncManifest
): SyncDiff {
  const localOnly: string[] = [];
  const remoteOnly: string[] = [];
  const conflicts: string[] = [];
  const localDeletions: string[] = [];
  const remoteDeletions: string[] = [];

  // Collect tombstone IDs for quick lookup
  const localTombstoneIds = new Set(local.tombstones.map((t) => t.id));
  const remoteTombstoneIds = new Set(remote.tombstones.map((t) => t.id));

  // Find items that are local-only or have conflicts
  for (const id of Object.keys(local.items)) {
    if (remoteTombstoneIds.has(id)) {
      // Item was deleted remotely
      remoteDeletions.push(id);
      continue;
    }

    const localEntry = local.items[id];
    const remoteEntry = remote.items[id];

    if (!remoteEntry) {
      localOnly.push(id);
    } else if (localEntry.checksum !== remoteEntry.checksum) {
      // Different content - resolve by timestamp (newer wins)
      const localTime = new Date(localEntry.updatedAt).getTime();
      const remoteTime = new Date(remoteEntry.updatedAt).getTime();

      if (localTime > remoteTime) {
        localOnly.push(id); // Upload local version
      } else if (remoteTime > localTime) {
        remoteOnly.push(id); // Download remote version
      } else {
        conflicts.push(id); // Same timestamp, different content
      }
    }
    // If checksums match, items are in sync - do nothing
  }

  // Find items that are remote-only
  for (const id of Object.keys(remote.items)) {
    if (localTombstoneIds.has(id)) {
      localDeletions.push(id);
      continue;
    }

    if (!local.items[id]) {
      remoteOnly.push(id);
    }
  }

  return { localOnly, remoteOnly, conflicts, localDeletions, remoteDeletions };
}

/**
 * Merge tombstone lists, removing expired entries.
 */
export function mergeTombstones(
  localTombstones: SyncTombstone[],
  remoteTombstones: SyncTombstone[]
): SyncTombstone[] {
  const now = Date.now();
  const merged = new Map<string, SyncTombstone>();

  for (const t of [...localTombstones, ...remoteTombstones]) {
    // Skip expired tombstones
    if (new Date(t.expiresAt).getTime() < now) continue;

    const existing = merged.get(t.id);
    if (!existing || new Date(t.deletedAt).getTime() > new Date(existing.deletedAt).getTime()) {
      merged.set(t.id, t);
    }
  }

  return Array.from(merged.values());
}

/**
 * Create a tombstone for a deleted item.
 */
export function createTombstone(itemId: string): SyncTombstone {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000);
  return {
    id: itemId,
    deletedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

/**
 * Build a manifest entry from item data.
 */
export function buildManifestEntry(
  id: string,
  content: string,
  driveFileId?: string
): SyncManifestEntry {
  return {
    id,
    updatedAt: new Date().toISOString(),
    checksum: generateChecksum(content),
    driveFileId,
  };
}

/**
 * Check if categories or settings need syncing based on checksum.
 */
export function needsSync(local: SyncManifestEntry, remote: SyncManifestEntry): 'local' | 'remote' | 'none' {
  if (local.checksum === remote.checksum) return 'none';

  const localTime = new Date(local.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  return localTime >= remoteTime ? 'local' : 'remote';
}
