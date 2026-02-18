/**
 * Cloud Sync Types
 */

/** Sync provider identity */
export type SyncProvider = 'google-drive';

/** Current state of the sync engine */
export type SyncStatus = 'idle' | 'syncing' | 'error' | 'disconnected';

/** OAuth2 tokens stored encrypted on disk */
export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // Unix ms timestamp
  tokenType: string;
  scope: string;
}

/** Google OAuth2 client credentials (user-provided) */
export interface OAuthClientConfig {
  clientId: string;
  clientSecret: string;
}

/** Sync settings persisted in app config */
export interface SyncSettings {
  enabled: boolean;
  provider: SyncProvider;
  lastSyncedAt: string | null;
  /** User-provided OAuth client credentials */
  oauthClient: OAuthClientConfig | null;
}

/** Current sync state emitted to the renderer */
export interface SyncState {
  status: SyncStatus;
  provider: SyncProvider | null;
  lastSyncedAt: string | null;
  error: string | null;
  isAuthenticated: boolean;
  userEmail: string | null;
}

/** Manifest entry for a single synced item */
export interface SyncManifestEntry {
  id: string;
  updatedAt: string;
  checksum: string; // MD5 of JSON content for fast comparison
  driveFileId?: string; // Google Drive file ID
}

/** Tombstone for deleted items */
export interface SyncTombstone {
  id: string;
  deletedAt: string;
  expiresAt: string; // 30 days TTL
}

/** Sync manifest stored in Google Drive */
export interface SyncManifest {
  version: number;
  deviceId: string;
  lastModified: string;
  items: Record<string, SyncManifestEntry>;
  categories: SyncManifestEntry;
  settings: SyncManifestEntry;
  tombstones: SyncTombstone[];
}

/** Result of a diff operation between local and remote manifests */
export interface SyncDiff {
  /** Items that exist locally but not remotely (or are newer locally) */
  localOnly: string[];
  /** Items that exist remotely but not locally (or are newer remotely) */
  remoteOnly: string[];
  /** Items that exist on both sides with conflicts */
  conflicts: string[];
  /** Items deleted locally (tombstoned) */
  localDeletions: string[];
  /** Items deleted remotely (tombstoned) */
  remoteDeletions: string[];
}

/** File metadata from cloud provider */
export interface CloudFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: number;
}
