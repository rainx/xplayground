/**
 * Crypto Service - Main Entry Point
 *
 * Provides encryption/decryption for clipboard data storage
 */

import fs from 'fs/promises';
import { KeyManager, getKeyManager } from './key-manager';
import {
  deriveKey,
  encryptString,
  decryptString,
  encryptBuffer,
  decryptBuffer,
  isEncrypted,
} from './cipher';
import { KeyPurpose, EncryptionStatus } from './types';

export class CryptoService {
  private keyManager: KeyManager;
  private initialized: boolean = false;

  constructor() {
    this.keyManager = getKeyManager();
  }

  /**
   * Initialize the crypto service
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.keyManager.initialize();
    this.initialized = true;
    console.log('CryptoService initialized');
  }

  /**
   * Get the current encryption status
   */
  getStatus(): EncryptionStatus {
    return {
      initialized: this.initialized,
      keyAvailable: this.keyManager.isEncryptionAvailable(),
      migrationRequired: false, // Will be set by migration service
    };
  }

  /**
   * Encrypt JSON data and write to file
   */
  async encryptAndWriteJSON(filePath: string, data: unknown, purpose: KeyPurpose): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    const key = deriveKey(this.keyManager.getMasterKey(), purpose, filePath);
    const encrypted = encryptString(jsonString, key);
    await fs.writeFile(filePath, encrypted);
  }

  /**
   * Read file and decrypt JSON data
   */
  async readAndDecryptJSON<T>(filePath: string, purpose: KeyPurpose): Promise<T> {
    const encrypted = await fs.readFile(filePath);
    const key = deriveKey(this.keyManager.getMasterKey(), purpose, filePath);
    const jsonString = decryptString(encrypted, key);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Encrypt binary data and write to file
   */
  async encryptAndWriteBuffer(filePath: string, data: Buffer, purpose: KeyPurpose): Promise<void> {
    const key = deriveKey(this.keyManager.getMasterKey(), purpose, filePath);
    const encrypted = encryptBuffer(data, key);
    await fs.writeFile(filePath, encrypted);
  }

  /**
   * Read file and decrypt binary data
   */
  async readAndDecryptBuffer(filePath: string, purpose: KeyPurpose): Promise<Buffer> {
    const encrypted = await fs.readFile(filePath);
    const key = deriveKey(this.keyManager.getMasterKey(), purpose, filePath);
    return decryptBuffer(encrypted, key);
  }

  /**
   * Check if a file appears to be encrypted
   */
  async isFileEncrypted(filePath: string): Promise<boolean> {
    try {
      const data = await fs.readFile(filePath);
      return isEncrypted(data);
    } catch {
      return false; // File doesn't exist or can't be read
    }
  }

  /**
   * Encrypt existing plaintext JSON file in place
   */
  async encryptExistingFile(filePath: string, purpose: KeyPurpose): Promise<void> {
    const plaintext = await fs.readFile(filePath, 'utf-8');
    const data = JSON.parse(plaintext);
    await this.encryptAndWriteJSON(filePath, data, purpose);
  }

  /**
   * Clear sensitive data from memory during shutdown
   */
  shutdown(): void {
    this.keyManager.clearFromMemory();
    this.initialized = false;
  }
}

// Singleton instance
let cryptoServiceInstance: CryptoService | null = null;

export function getCryptoService(): CryptoService {
  if (!cryptoServiceInstance) {
    cryptoServiceInstance = new CryptoService();
  }
  return cryptoServiceInstance;
}

// Re-export types
export * from './types';
export { isEncrypted } from './cipher';
