/**
 * Creator Caching Utilities
 * Handles caching for creator profiles
 */

import { CacheService, CacheKeys, CacheTTL } from '../redis';
import { prisma } from '../prisma';

/**
 * Get or cache creator profile by ID
 */
export async function getCachedCreatorById(creatorId: string, fetchFn?: () => Promise<any>) {
  const cacheKey = CacheKeys.creator(creatorId);

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const creator = fetchFn
    ? await fetchFn()
    : await prisma.creator.findUnique({
        where: { id: creatorId },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });

  if (!creator) {
    return null;
  }

  // Cache for 15 minutes
  await CacheService.set(cacheKey, creator, CacheTTL.CREATOR);

  return creator;
}

/**
 * Get or cache creator profile by handle
 */
export async function getCachedCreatorByHandle(handle: string, fetchFn?: () => Promise<any>) {
  const cacheKey = CacheKeys.creatorByHandle(handle);

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const creator = fetchFn
    ? await fetchFn()
    : await prisma.creator.findUnique({
        where: { handle },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true,
            },
          },
        },
      });

  if (!creator) {
    return null;
  }

  // Cache for 15 minutes
  await CacheService.set(cacheKey, creator, CacheTTL.CREATOR);
  // Also cache by ID
  await CacheService.set(CacheKeys.creator(creator.id), creator, CacheTTL.CREATOR);

  return creator;
}

/**
 * Invalidate creator cache (call on profile update)
 */
export async function invalidateCreatorCache(creatorId: string, handle?: string) {
  await CacheService.delete(CacheKeys.creator(creatorId));
  if (handle) {
    await CacheService.delete(CacheKeys.creatorByHandle(handle));
  }
}

