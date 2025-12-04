import { useState, useEffect } from 'react';
import {
  getSecureItem,
  setSecureItem,
  StorageType,
  SecureStorageOptions,
} from '@/lib/secureStorage';

export interface UseLocalStorageOptions {
  /**
   * Use secure storage with encryption and integrity checking
   * @default false
   */
  secure?: boolean;

  /**
   * Enable encryption for the stored data
   * @default false
   */
  encrypt?: boolean;

  /**
   * Time to live in milliseconds (only applies to secure storage)
   */
  ttl?: number;

  /**
   * Storage type (localStorage or sessionStorage)
   * @default StorageType.LOCAL
   */
  storageType?: StorageType;
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options: UseLocalStorageOptions = {}
) {
  const { secure = false, encrypt = false, ttl, storageType = StorageType.LOCAL } = options;

  // Get initial value from storage or use default
  const [storedValue, setStoredValue] = useState<T>(initialValue);
  const [isLoading, setIsLoading] = useState<boolean>(secure);

  // Load initial value (async for secure storage)
  useEffect(() => {
    const loadInitialValue = async () => {
      try {
        if (secure) {
          // Use secure storage
          const item = await getSecureItem<T>(key, { encrypt, storageType });
          setStoredValue(item ?? initialValue);
        } else {
          // Use regular localStorage
          const storage = storageType === StorageType.LOCAL ? window.localStorage : window.sessionStorage;
          const item = storage.getItem(key);
          setStoredValue(item ? JSON.parse(item) : initialValue);
        }
      } catch (error) {
        console.error(`Error loading storage key "${key}":`, error);
        setStoredValue(initialValue);
      } finally {
        if (secure) {
          setIsLoading(false);
        }
      }
    };

    loadInitialValue();
  }, [key, secure, encrypt, storageType]); // Intentionally minimal dependencies

  // Update storage when value changes
  const setValue = async (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);

      if (secure) {
        // Use secure storage
        await setSecureItem(key, valueToStore, { encrypt, ttl, storageType });
      } else {
        // Use regular localStorage
        const storage = storageType === StorageType.LOCAL ? window.localStorage : window.sessionStorage;
        storage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error setting storage key "${key}":`, error);
    }
  };

  return [storedValue, setValue, isLoading] as const;
}
