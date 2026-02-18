/**
 * CloudSyncProvider - Abstract interface for cloud storage providers
 *
 * Implementations: GoogleDriveProvider (future: OneDriveProvider)
 */

import type { CloudFile } from '../types';

export interface CloudSyncProvider {
  /** Provider name identifier */
  readonly name: string;

  /**
   * Upload or update a JSON file in the app's cloud folder.
   * Creates the file if it doesn't exist, updates if it does.
   */
  upsertFile(name: string, content: string, existingFileId?: string): Promise<CloudFile>;

  /**
   * Read a file's content by its Drive file ID.
   */
  readFile(fileId: string): Promise<string>;

  /**
   * Find a file by name in the app's cloud folder.
   * Returns null if not found.
   */
  findFile(name: string): Promise<CloudFile | null>;

  /**
   * List all files in the app's cloud folder.
   */
  listFiles(): Promise<CloudFile[]>;

  /**
   * Delete a file by its Drive file ID.
   */
  deleteFile(fileId: string): Promise<void>;

  /**
   * Check if the provider is authenticated and tokens are valid.
   */
  isAuthenticated(): boolean;

  /**
   * Get the authenticated user's email (for display).
   */
  getUserEmail(): Promise<string | null>;
}
