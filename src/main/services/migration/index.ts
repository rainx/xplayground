/**
 * Migration Service - Handles data migration to encrypted format
 */

import { app } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getCryptoService, isEncrypted } from '../crypto';
import type { MigrationState } from '../crypto/types';

const MIGRATION_VERSION = 1;
const MIGRATION_FILE = 'migration.json';

export class MigrationService {
  private basePath: string = '';
  private migrationFilePath: string = '';
  private state: MigrationState | null = null;

  async initialize(): Promise<void> {
    this.basePath = path.join(app.getPath('userData'), 'clipboard');
    this.migrationFilePath = path.join(this.basePath, 'data', MIGRATION_FILE);
    await this.loadState();
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.migrationFilePath, 'utf-8');
      this.state = JSON.parse(data);
    } catch {
      this.state = null;
    }
  }

  private async saveState(state: MigrationState): Promise<void> {
    this.state = state;
    await fs.writeFile(this.migrationFilePath, JSON.stringify(state, null, 2));
  }

  /**
   * Check if migration is needed
   */
  async needsMigration(): Promise<boolean> {
    // If migration state exists and encryption is enabled, no migration needed
    if (this.state?.encryptionEnabled && this.state?.version === MIGRATION_VERSION) {
      return false;
    }

    // Check if there are existing unencrypted files
    const indexPath = path.join(this.basePath, 'data', 'index.json');
    try {
      const data = await fs.readFile(indexPath);
      // If file exists and is not encrypted, migration is needed
      return !isEncrypted(data);
    } catch {
      // No existing data, no migration needed
      return false;
    }
  }

  /**
   * Perform migration to encrypted format
   */
  async migrate(): Promise<void> {
    console.log('[MigrationService] Starting migration to encrypted format...');

    const cryptoService = getCryptoService();
    await cryptoService.initialize();

    // Create backup
    const backupPath = await this.createBackup();
    console.log(`[MigrationService] Backup created at: ${backupPath}`);

    try {
      // Migrate index.json
      await this.migrateFile(
        path.join(this.basePath, 'data', 'index.json'),
        'index'
      );

      // Migrate settings.json
      await this.migrateFile(
        path.join(this.basePath, 'data', 'settings.json'),
        'settings'
      );

      // Migrate categories.json
      await this.migrateFile(
        path.join(this.basePath, 'data', 'categories.json'),
        'category'
      );

      // Migrate individual item files
      await this.migrateItemFiles();

      // Migrate image assets
      await this.migrateImageAssets();

      // Save migration state
      await this.saveState({
        version: MIGRATION_VERSION,
        encryptionEnabled: true,
        migratedAt: new Date().toISOString(),
        backupPath,
      });

      console.log('[MigrationService] Migration completed successfully');
    } catch (error) {
      console.error('[MigrationService] Migration failed:', error);
      // Attempt to restore from backup
      await this.restoreBackup(backupPath);
      throw error;
    }
  }

  /**
   * Create a backup of all clipboard data
   */
  private async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.basePath, `backup-${timestamp}`);

    await this.copyDirectory(
      path.join(this.basePath, 'data'),
      path.join(backupPath, 'data')
    );

    await this.copyDirectory(
      path.join(this.basePath, 'assets'),
      path.join(backupPath, 'assets')
    );

    return backupPath;
  }

  /**
   * Restore data from backup
   */
  private async restoreBackup(backupPath: string): Promise<void> {
    console.log('[MigrationService] Restoring from backup...');

    // Remove potentially corrupted data
    await fs.rm(path.join(this.basePath, 'data'), { recursive: true, force: true });
    await fs.rm(path.join(this.basePath, 'assets'), { recursive: true, force: true });

    // Restore from backup
    await this.copyDirectory(
      path.join(backupPath, 'data'),
      path.join(this.basePath, 'data')
    );

    await this.copyDirectory(
      path.join(backupPath, 'assets'),
      path.join(this.basePath, 'assets')
    );

    console.log('[MigrationService] Backup restored');
  }

  /**
   * Copy directory recursively
   */
  private async copyDirectory(src: string, dest: string): Promise<void> {
    try {
      await fs.mkdir(dest, { recursive: true });
      const entries = await fs.readdir(src, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
          await this.copyDirectory(srcPath, destPath);
        } else {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch {
      // Source directory might not exist
    }
  }

  /**
   * Migrate a single JSON file to encrypted format
   */
  private async migrateFile(
    filePath: string,
    purpose: 'index' | 'settings' | 'category'
  ): Promise<void> {
    try {
      const data = await fs.readFile(filePath);

      // Skip if already encrypted
      if (isEncrypted(data)) {
        console.log(`[MigrationService] Skipping already encrypted: ${filePath}`);
        return;
      }

      const cryptoService = getCryptoService();
      const parsed = JSON.parse(data.toString('utf-8'));
      await cryptoService.encryptAndWriteJSON(filePath, parsed, purpose);
      console.log(`[MigrationService] Migrated: ${filePath}`);
    } catch (error) {
      // File might not exist, which is fine
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  /**
   * Migrate all individual item files
   */
  private async migrateItemFiles(): Promise<void> {
    const itemsDir = path.join(this.basePath, 'data', 'items');

    try {
      const yearMonths = await fs.readdir(itemsDir);

      for (const yearMonth of yearMonths) {
        const monthDir = path.join(itemsDir, yearMonth);
        const stat = await fs.stat(monthDir);

        if (!stat.isDirectory()) continue;

        const files = await fs.readdir(monthDir);

        for (const file of files) {
          if (!file.endsWith('.json')) continue;

          const filePath = path.join(monthDir, file);
          await this.migrateFile(filePath, 'item' as 'index'); // Use index as fallback
        }
      }
    } catch {
      // Items directory might not exist
    }
  }

  /**
   * Migrate image assets to encrypted format
   */
  private async migrateImageAssets(): Promise<void> {
    const cryptoService = getCryptoService();
    const imagesDir = path.join(this.basePath, 'assets', 'images');
    const thumbnailsDir = path.join(this.basePath, 'assets', 'thumbnails');

    await this.migrateImagesInDir(cryptoService, imagesDir);
    await this.migrateImagesInDir(cryptoService, thumbnailsDir);
  }

  private async migrateImagesInDir(
    cryptoService: ReturnType<typeof getCryptoService>,
    dir: string
  ): Promise<void> {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        // Skip already encrypted files
        if (file.endsWith('.enc')) continue;

        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        if (!stat.isFile()) continue;

        // Read original image
        const imageData = await fs.readFile(filePath);

        // Write encrypted version
        const encryptedPath = filePath.replace(/\.[^.]+$/, '.enc');
        await cryptoService.encryptAndWriteBuffer(encryptedPath, imageData, 'image');

        // Remove original
        await fs.unlink(filePath);

        console.log(`[MigrationService] Migrated image: ${file}`);
      }
    } catch {
      // Directory might not exist
    }
  }
}

// Singleton instance
let migrationServiceInstance: MigrationService | null = null;

export function getMigrationService(): MigrationService {
  if (!migrationServiceInstance) {
    migrationServiceInstance = new MigrationService();
  }
  return migrationServiceInstance;
}
