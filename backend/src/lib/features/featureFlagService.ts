/**
 * Feature Flag Service
 * 
 * Manages feature flags with rollout percentages and targeted users/roles
 */

import { prisma } from '../prisma';
import logger from '../logger';
import { UserRole } from '../../config/constants';

export interface FeatureFlagConfig {
  key: string;
  name: string;
  description?: string;
  enabled: boolean;
  rolloutPercentage?: number;
  targetUsers?: string[];
  targetRoles?: string[];
}

/**
 * Simple hash function for consistent user-based rollout
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a feature flag is enabled for a specific user
 */
export async function isFeatureEnabled(
  key: string,
  userId?: string,
  userRole?: UserRole
): Promise<boolean> {
  try {
    const flag = await prisma.featureFlag.findUnique({
      where: { key },
    });

    if (!flag) {
      logger.warn('Feature flag not found', { key });
      return false;
    }

    // If flag is globally disabled, return false
    if (!flag.enabled) {
      return false;
    }

    // If no user context, check if rollout is 100%
    if (!userId) {
      return flag.rolloutPercentage === 100;
    }

    // Check if user is in target list
    if (flag.targetUsers && flag.targetUsers.length > 0) {
      if (flag.targetUsers.includes(userId)) {
        return true;
      }
      // If user is not in target list and targetUsers is specified, return false
      return false;
    }

    // Check if user role is in target roles
    if (flag.targetRoles && flag.targetRoles.length > 0 && userRole) {
      if (flag.targetRoles.includes(userRole)) {
        return true;
      }
      // If role is not in target list and targetRoles is specified, return false
      return false;
    }

    // Check rollout percentage using consistent hashing
    const hash = hashCode(userId + key);
    const userPercentage = hash % 100;
    return userPercentage < flag.rolloutPercentage;
  } catch (error) {
    logger.error('Error checking feature flag', {
      key,
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false; // Fail closed - don't enable features on error
  }
}

/**
 * Get feature flag by key
 */
export async function getFeatureFlag(key: string) {
  return prisma.featureFlag.findUnique({
    where: { key },
  });
}

/**
 * Get all feature flags
 */
export async function getAllFeatureFlags(enabledOnly: boolean = false) {
  return prisma.featureFlag.findMany({
    where: enabledOnly ? { enabled: true } : undefined,
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Create or update a feature flag
 */
export async function upsertFeatureFlag(config: FeatureFlagConfig) {
  // Validate rollout percentage
  if (config.rolloutPercentage !== undefined) {
    if (config.rolloutPercentage < 0 || config.rolloutPercentage > 100) {
      throw new Error('Rollout percentage must be between 0 and 100');
    }
  }

  return prisma.featureFlag.upsert({
    where: { key: config.key },
    update: {
      name: config.name,
      description: config.description,
      enabled: config.enabled,
      rolloutPercentage: config.rolloutPercentage ?? 0,
      targetUsers: (config.targetUsers ?? []) as any,
      targetRoles: (config.targetRoles ?? []) as any,
    },
    create: {
      key: config.key,
      name: config.name,
      description: config.description,
      enabled: config.enabled,
      rolloutPercentage: config.rolloutPercentage ?? 0,
      targetUsers: (config.targetUsers ?? []) as any,
      targetRoles: (config.targetRoles ?? []) as any,
    },
  });
}

/**
 * Delete a feature flag
 */
export async function deleteFeatureFlag(key: string) {
  return prisma.featureFlag.delete({
    where: { key },
  });
}

/**
 * Toggle a feature flag
 */
export async function toggleFeatureFlag(key: string, enabled: boolean) {
  return prisma.featureFlag.update({
    where: { key },
    data: { enabled },
  });
}

