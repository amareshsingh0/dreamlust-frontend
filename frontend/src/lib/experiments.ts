/**
 * Experiment Tracking Utilities
 * 
 * Functions for tracking experiment metrics
 */

import { api } from './api';
import { useAuth } from '../contexts/AuthContext';

/**
 * Track experiment metric
 * @param experimentName - Name of the experiment
 * @param metric - Metric name (e.g., 'conversion_rate', 'click_through_rate')
 * @param value - Metric value (numeric)
 */
export async function trackExperimentMetric(
  experimentName: string,
  metric: string,
  value: number
): Promise<void> {
  try {
    await api.experiments.track(experimentName, metric, value);
  } catch (error) {
    // Log error but don't throw (non-blocking)
    console.warn(`Failed to track experiment metric:`, {
      experimentName,
      metric,
      value,
      error,
    });
  }
}

/**
 * Hook to track experiment metrics
 * Returns a function to track metrics for the current user
 */
export function useExperimentTracking() {
  const { user } = useAuth();

  return {
    track: (experimentName: string, metric: string, value: number) => {
      if (user) {
        trackExperimentMetric(experimentName, metric, value);
      }
    },
  };
}

