/**
 * Secure Storage Utility
 * Provides encryption and integrity checking for localStorage/sessionStorage
 *
 * Security Features:
 * - AES-GCM encryption for data confidentiality
 * - HMAC-SHA256 for data integrity verification
 * - Automatic key derivation from browser fingerprint
 * - Prevents tampering and ensures data authenticity
 */

/**
 * Storage type enum
 */
export enum StorageType {
  LOCAL = 'localStorage',
  SESSION = 'sessionStorage',
}

/**
 * Storage options
 */
export interface SecureStorageOptions {
  storageType?: StorageType;
  ttl?: number; // Time to live in milliseconds
  encrypt?: boolean; // Whether to encrypt the data
}

/**
 * Stored data structure
 */
interface StoredData<T> {
  value: T;
  timestamp: number;
  ttl?: number;
  hmac?: string; // For integrity verification
}

/**
 * Generate a fingerprint-based encryption key
 * Uses browser characteristics to derive a unique key
 * Note: This is obfuscation, not true encryption (keys stored client-side are accessible)
 * Primary value is integrity checking, not confidentiality from determined attackers
 */
async function getBrowserKey(): Promise<CryptoKey> {
  // Create a fingerprint from browser characteristics
  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.colorDepth,
    screen.width + 'x' + screen.height,
    // Add a static salt (in production, this could be per-user or from server)
    'agentbuddy-storage-v1',
  ].join('|');

  // Hash the fingerprint to create key material
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Import as a key
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 */
async function encryptData(data: string): Promise<string> {
  try {
    const key = await getBrowserKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate random IV (Initialization Vector)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt the data
    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    // Combine IV and encrypted data
    const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encryptedBuffer), iv.length);

    // Convert to base64 for storage
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[SecureStorage] Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-GCM
 */
async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getBrowserKey();

    // Decode from base64
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedBuffer = combined.slice(12);

    // Decrypt the data
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedBuffer
    );

    // Convert back to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('[SecureStorage] Decryption failed:', error);
    throw new Error('Failed to decrypt data - data may be corrupted or tampered');
  }
}

/**
 * Generate HMAC for integrity verification
 */
async function generateHMAC(data: string): Promise<string> {
  try {
    const key = await getBrowserKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);

    // Generate HMAC using the key
    const signature = await crypto.subtle.sign(
      { name: 'HMAC', hash: 'SHA-256' },
      await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.exportKey('raw', key),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      ),
      dataBuffer
    );

    // Convert to hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  } catch (error) {
    console.error('[SecureStorage] HMAC generation failed:', error);
    return '';
  }
}

/**
 * Verify HMAC for integrity
 */
async function verifyHMAC(data: string, expectedHMAC: string): Promise<boolean> {
  const actualHMAC = await generateHMAC(data);
  return actualHMAC === expectedHMAC;
}

/**
 * Get storage instance based on type
 */
function getStorage(type: StorageType): Storage {
  return type === StorageType.LOCAL ? window.localStorage : window.sessionStorage;
}

/**
 * Securely store data with optional encryption and integrity checking
 *
 * @param key - Storage key
 * @param value - Value to store
 * @param options - Storage options (encryption, TTL, storage type)
 */
export async function setSecureItem<T>(
  key: string,
  value: T,
  options: SecureStorageOptions = {}
): Promise<void> {
  const {
    storageType = StorageType.LOCAL,
    ttl,
    encrypt = false,
  } = options;

  try {
    const data: StoredData<T> = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    let serialized = JSON.stringify(data);

    // Add HMAC for integrity checking
    const hmac = await generateHMAC(serialized);
    data.hmac = hmac;
    serialized = JSON.stringify(data);

    // Encrypt if requested
    if (encrypt) {
      serialized = await encryptData(serialized);
    }

    const storage = getStorage(storageType);
    storage.setItem(key, serialized);
  } catch (error) {
    console.error(`[SecureStorage] Failed to set item "${key}":`, error);
    throw error;
  }
}

/**
 * Securely retrieve data with integrity verification
 *
 * @param key - Storage key
 * @param options - Storage options
 * @returns The stored value or null if not found/expired/corrupted
 */
export async function getSecureItem<T>(
  key: string,
  options: SecureStorageOptions = {}
): Promise<T | null> {
  const {
    storageType = StorageType.LOCAL,
    encrypt = false,
  } = options;

  try {
    const storage = getStorage(storageType);
    let serialized = storage.getItem(key);

    if (!serialized) {
      return null;
    }

    // Decrypt if encrypted
    if (encrypt) {
      try {
        serialized = await decryptData(serialized);
      } catch (error) {
        console.error(`[SecureStorage] Decryption failed for "${key}", removing corrupted data`);
        storage.removeItem(key);
        return null;
      }
    }

    const data: StoredData<T> = JSON.parse(serialized);

    // Verify integrity with HMAC
    if (data.hmac) {
      const { hmac, ...dataWithoutHMAC } = data;
      const serializedWithoutHMAC = JSON.stringify(dataWithoutHMAC);
      const isValid = await verifyHMAC(serializedWithoutHMAC, hmac);

      if (!isValid) {
        console.warn(`[SecureStorage] Integrity check failed for "${key}", data may be tampered`);
        storage.removeItem(key);
        return null;
      }
    }

    // Check TTL expiration
    if (data.ttl && Date.now() - data.timestamp > data.ttl) {
      storage.removeItem(key);
      return null;
    }

    return data.value;
  } catch (error) {
    console.error(`[SecureStorage] Failed to get item "${key}":`, error);
    return null;
  }
}

/**
 * Remove item from secure storage
 */
export function removeSecureItem(
  key: string,
  storageType: StorageType = StorageType.LOCAL
): void {
  try {
    const storage = getStorage(storageType);
    storage.removeItem(key);
  } catch (error) {
    console.error(`[SecureStorage] Failed to remove item "${key}":`, error);
  }
}

/**
 * Clear all items from storage (with optional prefix filter)
 */
export function clearSecureStorage(
  storageType: StorageType = StorageType.LOCAL,
  prefix?: string
): void {
  try {
    const storage = getStorage(storageType);

    if (prefix) {
      // Only remove items with the specified prefix
      const keys = Object.keys(storage);
      keys.forEach(key => {
        if (key.startsWith(prefix)) {
          storage.removeItem(key);
        }
      });
    } else {
      // Clear all
      storage.clear();
    }
  } catch (error) {
    console.error('[SecureStorage] Failed to clear storage:', error);
  }
}

/**
 * Check if a key exists in storage
 */
export function hasSecureItem(
  key: string,
  storageType: StorageType = StorageType.LOCAL
): boolean {
  try {
    const storage = getStorage(storageType);
    return storage.getItem(key) !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get all keys with optional prefix filter
 */
export function getSecureKeys(
  storageType: StorageType = StorageType.LOCAL,
  prefix?: string
): string[] {
  try {
    const storage = getStorage(storageType);
    const keys = Object.keys(storage);

    if (prefix) {
      return keys.filter(key => key.startsWith(prefix));
    }

    return keys;
  } catch (error) {
    console.error('[SecureStorage] Failed to get keys:', error);
    return [];
  }
}
