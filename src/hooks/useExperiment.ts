/**
 * A/B Testing Hook
 * 
 * Assigns user to experiment variant and returns the variant
 */

import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook for A/B testing
 * @param experimentName - Name of the experiment
 * @returns The assigned variant (defaults to 'control' if not assigned)
 */
export function useExperiment(experimentName: string): string {
  const [variant, setVariant] = useState<string>('control');
  const { user } = useAuth();

  useEffect(() => {
    // Only assign if user is authenticated
    if (!user) {
      setVariant('control');
      return;
    }

    async function assignVariant() {
      try {
        const response = await api.experiments.assignByName(experimentName);
        if (response.success && response.data) {
          const data = response.data as { variant?: string };
          if (data.variant) {
            setVariant(data.variant);
          }
        }
      } catch (error) {
        // If assignment fails, default to control
        console.warn(`Failed to assign variant for experiment "${experimentName}":`, error);
        setVariant('control');
      }
    }

    assignVariant();
  }, [experimentName, user]);

  return variant;
}

