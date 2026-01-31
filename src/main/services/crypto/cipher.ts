/**
 * AES-256-GCM Cipher Implementation
 *
 * File format: [IV: 12 bytes][Ciphertext][AuthTag: 16 bytes]
 */

import crypto from 'crypto';
import { CRYPTO_CONFIG, EncryptedData, KeyPurpose } from './types';

/**
 * Derive a purpose-specific key from the master key using HKDF
 */
export function deriveKey(masterKey: Buffer, purpose: KeyPurpose, context?: string): Buffer {
  const info = Buffer.from(`clipboard-${purpose}${context ? `-${context}` : ''}`);
  const salt = Buffer.alloc(CRYPTO_CONFIG.saltLength, 0); // Fixed salt for deterministic derivation

  const derived = crypto.hkdfSync('sha256', masterKey, salt, info, CRYPTO_CONFIG.keyLength);
  return Buffer.from(derived);
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(data: Buffer, key: Buffer): EncryptedData {
  const iv = crypto.randomBytes(CRYPTO_CONFIG.ivLength);
  const cipher = crypto.createCipheriv(CRYPTO_CONFIG.algorithm, key, iv, {
    authTagLength: CRYPTO_CONFIG.authTagLength,
  });

  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return { iv, ciphertext, authTag };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encrypted: EncryptedData, key: Buffer): Buffer {
  const decipher = crypto.createDecipheriv(CRYPTO_CONFIG.algorithm, key, encrypted.iv, {
    authTagLength: CRYPTO_CONFIG.authTagLength,
  });
  decipher.setAuthTag(encrypted.authTag);

  return Buffer.concat([decipher.update(encrypted.ciphertext), decipher.final()]);
}

/**
 * Encrypt string data, returning combined buffer [IV][Ciphertext][AuthTag]
 */
export function encryptString(plaintext: string, key: Buffer): Buffer {
  const data = Buffer.from(plaintext, 'utf-8');
  const { iv, ciphertext, authTag } = encrypt(data, key);
  return Buffer.concat([iv, ciphertext, authTag]);
}

/**
 * Decrypt combined buffer to string
 */
export function decryptString(combined: Buffer, key: Buffer): string {
  const encrypted = parseCombinedBuffer(combined);
  const decrypted = decrypt(encrypted, key);
  return decrypted.toString('utf-8');
}

/**
 * Encrypt binary data (e.g., images), returning combined buffer
 */
export function encryptBuffer(data: Buffer, key: Buffer): Buffer {
  const { iv, ciphertext, authTag } = encrypt(data, key);
  return Buffer.concat([iv, ciphertext, authTag]);
}

/**
 * Decrypt combined buffer to binary data
 */
export function decryptBuffer(combined: Buffer, key: Buffer): Buffer {
  const encrypted = parseCombinedBuffer(combined);
  return decrypt(encrypted, key);
}

/**
 * Parse combined encrypted buffer [IV][Ciphertext][AuthTag] into components
 */
function parseCombinedBuffer(combined: Buffer): EncryptedData {
  if (combined.length < CRYPTO_CONFIG.ivLength + CRYPTO_CONFIG.authTagLength) {
    throw new Error('Invalid encrypted data: buffer too short');
  }

  const iv = combined.subarray(0, CRYPTO_CONFIG.ivLength);
  const authTag = combined.subarray(combined.length - CRYPTO_CONFIG.authTagLength);
  const ciphertext = combined.subarray(
    CRYPTO_CONFIG.ivLength,
    combined.length - CRYPTO_CONFIG.authTagLength
  );

  return { iv, ciphertext, authTag };
}

/**
 * Check if a buffer appears to be encrypted (not valid JSON)
 */
export function isEncrypted(data: Buffer): boolean {
  try {
    const str = data.toString('utf-8');
    JSON.parse(str);
    return false; // Valid JSON = not encrypted
  } catch {
    return true; // Not valid JSON = likely encrypted
  }
}
