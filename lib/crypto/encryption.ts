// AES-256-GCM encryption utilities for credential storage
// Server-side only - NEVER expose these functions to client

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const TAG_POSITION = SALT_LENGTH + IV_LENGTH
const ENCRYPTED_POSITION = TAG_POSITION + TAG_LENGTH

/**
 * Get encryption key from environment variable
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY
  
  if (!key) {
    throw new Error('TOKEN_ENCRYPTION_KEY environment variable is not set')
  }
  
  if (key.length !== 64) {
    throw new Error('TOKEN_ENCRYPTION_KEY must be 64 hex characters (32 bytes)')
  }
  
  return Buffer.from(key, 'hex')
}

/**
 * Encrypt plaintext using AES-256-GCM
 * Returns base64-encoded string containing: salt + iv + authTag + encrypted
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error('Cannot encrypt empty string')
  }

  const key = getEncryptionKey()
  const salt = crypto.randomBytes(SALT_LENGTH)
  const iv = crypto.randomBytes(IV_LENGTH)
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ])
  
  const authTag = cipher.getAuthTag()
  
  // Concatenate: salt + iv + authTag + encrypted
  const result = Buffer.concat([salt, iv, authTag, encrypted])
  
  return result.toString('base64')
}

/**
 * Decrypt base64-encoded ciphertext using AES-256-GCM
 * Returns original plaintext
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) {
    throw new Error('Cannot decrypt empty string')
  }

  const key = getEncryptionKey()
  const buffer = Buffer.from(ciphertext, 'base64')
  
  // Extract components
  const salt = buffer.subarray(0, SALT_LENGTH)
  const iv = buffer.subarray(SALT_LENGTH, TAG_POSITION)
  const authTag = buffer.subarray(TAG_POSITION, ENCRYPTED_POSITION)
  const encrypted = buffer.subarray(ENCRYPTED_POSITION)
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ])
  
  return decrypted.toString('utf8')
}

/**
 * Generate a new encryption key (for initial setup)
 * Run this once and store in environment variable
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex')
}

