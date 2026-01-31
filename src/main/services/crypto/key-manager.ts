/**
 * Master Key Management using Electron safeStorage
 *
 * The master key is:
 * 1. Generated randomly on first run
 * 2. Encrypted using OS keychain (macOS Keychain, Windows DPAPI, etc.)
 * 3. Stored in a file as encrypted blob
 */

import { app, safeStorage } from 'electron';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { CRYPTO_CONFIG } from './types';

const MASTER_KEY_FILE = 'master.key';
const KEY_IDENTIFIER = 'xToolbox-clipboard-master-key';

export class KeyManager {
  private masterKey: Buffer | null = null;
  private keyFilePath: string = '';
  private initialized: boolean = false;

  /**
   * Initialize the key manager and load/generate master key
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const cryptoDir = path.join(app.getPath('userData'), 'crypto');
    await fs.mkdir(cryptoDir, { recursive: true });
    this.keyFilePath = path.join(cryptoDir, MASTER_KEY_FILE);

    await this.loadOrGenerateMasterKey();
    this.initialized = true;
  }

  /**
   * Check if encryption is available on this system
   */
  isEncryptionAvailable(): boolean {
    return safeStorage.isEncryptionAvailable();
  }

  /**
   * Get the master key (must be initialized first)
   */
  getMasterKey(): Buffer {
    if (!this.masterKey) {
      throw new Error('KeyManager not initialized. Call initialize() first.');
    }
    return this.masterKey;
  }

  /**
   * Check if the master key exists
   */
  async hasExistingKey(): Promise<boolean> {
    try {
      await fs.access(this.keyFilePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load existing master key or generate a new one
   */
  private async loadOrGenerateMasterKey(): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('safeStorage encryption not available, using fallback');
      // Fallback: generate ephemeral key (not persisted securely)
      this.masterKey = crypto.randomBytes(CRYPTO_CONFIG.keyLength);
      return;
    }

    const keyExists = await this.hasExistingKey();

    if (keyExists) {
      await this.loadMasterKey();
    } else {
      await this.generateAndStoreMasterKey();
    }
  }

  /**
   * Load and decrypt the master key from file
   */
  private async loadMasterKey(): Promise<void> {
    try {
      const encryptedKey = await fs.readFile(this.keyFilePath);
      const decryptedString = safeStorage.decryptString(encryptedKey);

      // Parse the stored format: "identifier:hex-encoded-key"
      const parts = decryptedString.split(':');
      if (parts.length !== 2 || parts[0] !== KEY_IDENTIFIER) {
        throw new Error('Invalid key format');
      }

      this.masterKey = Buffer.from(parts[1], 'hex');

      if (this.masterKey.length !== CRYPTO_CONFIG.keyLength) {
        throw new Error('Invalid key length');
      }

      console.log('Master key loaded from keychain');
    } catch (error) {
      console.error('Failed to load master key:', error);
      // If loading fails, regenerate (this will lose access to old encrypted data)
      console.warn('Regenerating master key - old encrypted data will be inaccessible');
      await this.generateAndStoreMasterKey();
    }
  }

  /**
   * Generate a new master key and store it securely
   */
  private async generateAndStoreMasterKey(): Promise<void> {
    // Generate a cryptographically secure random key
    this.masterKey = crypto.randomBytes(CRYPTO_CONFIG.keyLength);

    // Format: "identifier:hex-encoded-key"
    const keyString = `${KEY_IDENTIFIER}:${this.masterKey.toString('hex')}`;

    // Encrypt using OS keychain
    const encryptedKey = safeStorage.encryptString(keyString);

    // Write to file
    await fs.writeFile(this.keyFilePath, encryptedKey);
    console.log('New master key generated and stored in keychain');
  }

  /**
   * Clear the master key from memory (for security during shutdown)
   */
  clearFromMemory(): void {
    if (this.masterKey) {
      // Overwrite the buffer before dereferencing
      this.masterKey.fill(0);
      this.masterKey = null;
    }
    this.initialized = false;
  }
}

// Singleton instance
let keyManagerInstance: KeyManager | null = null;

export function getKeyManager(): KeyManager {
  if (!keyManagerInstance) {
    keyManagerInstance = new KeyManager();
  }
  return keyManagerInstance;
}
