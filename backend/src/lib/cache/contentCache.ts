/**
 * Content Caching Service
 * Caches frequently accessed content data in Redis
 */

import { CacheService, CacheKeys, CacheTTL } from '../redis';
import { prisma } from '../prisma';

/**
 * Get cached content or fetch from database
 */
export async function getCachedContent(contentId: string) {
  const cacheKey = `content:${contentId}`;
  
  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      },
      categories: {
        include: {
          category: true,
        },
      },
      tags: {
        include: {
          tag: true,
        },
      },
      _count: {
        select: {
          views: true,
          likes: true,
          comments: true,
        },
      },
    },
  });
  
  if (content) {
    // Cache for 15 minutes
    await CacheService.set(cacheKey, content, CacheTTL.CREATOR);
  }
  
  return content;
}

/**
 * Get cached trending content
 */
export async function getCachedTrending(period: 'today' | 'week' | 'month' = 'today') {
  const cacheKey = CacheKeys.trending(period);
  
  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Calculate date range
  const now = new Date();
  const startDate = new Date();
  
  if (period === 'today') {
    startDate.setHours(0, 0, 0, 0);
  } else if (period === 'week') {
    startDate.setDate(now.getDate() - 7);
  } else {
    startDate.setDate(now.getDate() - 30);
  }
  
  // Fetch trending content
  const trending = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      publishedAt: {
        gte: startDate,
      },
      deletedAt: null,
    },
    orderBy: {
      viewCount: 'desc',
    },
    take: 50,
    include: {
      creator: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
        },
      },
    },
  });
  
  // Cache for 1 hour
  await CacheService.set(cacheKey, trending, CacheTTL.TRENDING);
  
  return trending;
}

/**
 * Get cached categories
 */
export async function getCachedCategories() {
  const cacheKey = CacheKeys.categories();
  
  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Fetch from database
  const categories = await prisma.category.findMany({
    where: {
      is_active: true,
      deletedAt: null,
    },
    orderBy: {
      sort_order: 'asc',
    },
  });
  
  // Cache for 1 day
  await CacheService.set(cacheKey, categories, CacheTTL.CATEGORY);
  
  return categories;
}

/**
 * Invalidate content cache
 */
export async function invalidateContentCache(contentId: string) {
  await CacheService.delete(`content:${contentId}`);
  // Also invalidate trending caches
  await CacheService.invalidate('trending:*');
}

/**
 * Get cached trending content (alias for getCachedTrending)
 */
export async function getCachedTrendingContent(period: 'today' | 'week' | 'month' = 'today') {
  return getCachedTrending(period);
}

/**
 * Invalidate creator cache
 */
export async function invalidateCreatorCache(creatorId: string) {
  await CacheService.delete(CacheKeys.creator(creatorId));
  // Also invalidate content caches for this creator
  await CacheService.invalidate(`content:*`);
}

/**
 * Invalidate homepage cache
 */
export async function invalidateHomepageCache() {
  // Invalidate all homepage-related caches
  await CacheService.invalidate('homepage:*');
  await CacheService.invalidate('trending:*');
  await CacheService.invalidate('categories:all');
}

/**
 * Invalidate search cache (re-export from searchCache for convenience)
 */
export async function invalidateSearchCache() {
  await CacheService.invalidate('search:*');
}
