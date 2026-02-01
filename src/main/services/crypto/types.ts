/**
 * Crypto Service Types
 */

/** Encryption algorithm configuration */
export const CRYPTO_CONFIG = {
  algorithm: 'aes-256-gcm' as const,
  keyLength: 32, // 256 bits
  ivLength: 12, // 96 bits (recommended for GCM)
  authTagLength: 16, // 128 bits
  saltLength: 16,
  iterations: 100000, // PBKDF2 iterations (if used)
} as const;

/** Encrypted data format: [IV][Ciphertext][AuthTag] */
export interface EncryptedData {
  iv: Buffer;
  ciphertext: Buffer;
  authTag: Buffer;
}

/** Key derivation purposes for HKDF */
export type KeyPurpose =
  | 'index' // clipboard index.json
  | 'item' // individual clipboard items
  | 'image' // image assets
  | 'settings' // settings.json
  | 'category' // categories.json
  | 'shortcuts'; // keyboard shortcuts settings

/** Migration state tracking */
export interface MigrationState {
  version: number;
  encryptionEnabled: boolean;
  migratedAt: string;
  backupPath?: string;
}

/** Encryption status for the application */
export interface EncryptionStatus {
  initialized: boolean;
  keyAvailable: boolean;
  migrationRequired: boolean;
}
