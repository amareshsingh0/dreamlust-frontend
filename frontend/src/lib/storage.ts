/**
 * Safe localStorage Wrapper
 * 
 * Provides error handling for localStorage operations that can fail
 * in private browsing mode, incognito, or when storage is disabled.
 * 
 * Features:
 * - Try-catch wrappers for all operations
 * - JSON serialization with timestamp
 * - Expiration support
 * - Quota exceeded handling
 * - Helper methods for auth tokens
 */

interface StorageItem<T = unknown> {
  value: T;
  timestamp: number;
  expiresAt?: number;
}

/**
 * Check if localStorage is available
 */
function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Safe get string from localStorage
 */
export function getString(key: string): string | null {
  if (!isStorageAvailable()) {
    if (import.meta.env.DEV) {
      console.warn(`localStorage not available, cannot get key: ${key}`);
    }
    return null;
  }

  try {
    return localStorage.getItem(key);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to get localStorage key "${key}":`, error);
    }
    return null;
  }
}

/**
 * Safe set string to localStorage
 */
export function setString(key: string, value: string): boolean {
  if (!isStorageAvailable()) {
    if (import.meta.env.DEV) {
      console.warn(`localStorage not available, cannot set key: ${key}`);
    }
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error: any) {
    if (error?.name === 'QuotaExceededError') {
      if (import.meta.env.DEV) {
        console.error('localStorage quota exceeded. Clearing old items...');
      }
      // Try to clear and retry (optional - implement cleanup logic if needed)
      return false;
    }
    if (import.meta.env.DEV) {
      console.error(`Failed to set localStorage key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Safe remove from localStorage
 */
export function remove(key: string): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to remove localStorage key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Safe clear all localStorage
 */
export function clear(): boolean {
  if (!isStorageAvailable()) {
    return false;
  }

  try {
    localStorage.clear();
    return true;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to clear localStorage:', error);
    }
    return false;
  }
}

/**
 * Get JSON object from localStorage with expiration support
 */
export function getObject<T = unknown>(key: string): T | null {
  const str = getString(key);
  if (!str) {
    return null;
  }

  try {
    const item: StorageItem<T> = JSON.parse(str);
    
    // Check expiration
    if (item.expiresAt && Date.now() > item.expiresAt) {
      remove(key);
      return null;
    }

    return item.value;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to parse localStorage key "${key}":`, error);
    }
    return null;
  }
}

/**
 * Set JSON object to localStorage with optional expiration
 */
export function setObject<T = unknown>(
  key: string,
  value: T,
  expiresInMs?: number
): boolean {
  const item: StorageItem<T> = {
    value,
    timestamp: Date.now(),
    ...(expiresInMs && { expiresAt: Date.now() + expiresInMs }),
  };

  try {
    return setString(key, JSON.stringify(item));
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error(`Failed to stringify value for key "${key}":`, error);
    }
    return false;
  }
}

/**
 * Auth token helpers
 */
export const authStorage = {
  getAccessToken: (): string | null => {
    return getString('accessToken');
  },
  
  setAccessToken: (token: string): boolean => {
    return setString('accessToken', token);
  },
  
  getRefreshToken: (): string | null => {
    return getString('refreshToken');
  },
  
  setRefreshToken: (token: string): boolean => {
    return setString('refreshToken', token);
  },
  
  clearTokens: (): void => {
    remove('accessToken');
    remove('refreshToken');
  },
  
  hasTokens: (): boolean => {
    return !!(getString('accessToken') || getString('refreshToken'));
  },
};

/**
 * Legacy support: Get 'token' key (maps to accessToken)
 * @deprecated Use authStorage.getAccessToken() instead
 */
export function getLegacyToken(): string | null {
  return getString('token') || getString('accessToken');
}
