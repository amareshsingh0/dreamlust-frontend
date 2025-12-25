/**
 * Feature Flag Hook
 * 
 * Checks if a feature flag is enabled for the current user
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for feature flags
 * @param key - Feature flag key
 * @returns Whether the feature is enabled for the current user
 */
export function useFeature(key: string): boolean {
  const [enabled, setEnabled] = useState<boolean>(false);
  const { user } = useAuth();

  useEffect(() => {
    async function checkFeature() {
      try {
        const response = await api.features.get(key);
        if (response.success && response.data) {
          const data = response.data as { enabled: boolean };
          setEnabled(data.enabled);
        } else {
          setEnabled(false);
        }
      } catch (error) {
        // If feature check fails, default to disabled (fail closed)
        console.warn(`Failed to check feature flag "${key}":`, error);
        setEnabled(false);
      }
    }

    checkFeature();
  }, [key, user]);

  return enabled;
}

