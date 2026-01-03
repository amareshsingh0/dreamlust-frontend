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
        select: {
          id: true,
          userId: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
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
        },
      },
    },
  });

  if (content) {
    // Convert BigInt fields to Number for JSON serialization before caching
    const serializedContent = {
      ...content,
      viewCount: Number(content.viewCount || 0),
      likeCount: Number(content.likeCount || 0),
      commentCount: Number((content as any).commentCount || 0),
      duration: content.duration ? Number(content.duration) : null,
    };
    // Cache for 15 minutes
    await CacheService.set(cacheKey, serializedContent, CacheTTL.CREATOR);
    return serializedContent;
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

  // Fetch trending content with all relations needed by recommendations routes
  const trending = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
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
        select: {
          id: true,
          userId: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
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
    },
  });

  // Convert BigInt fields to Number for JSON serialization
  const serializedTrending = trending.map(content => ({
    ...content,
    viewCount: Number(content.viewCount || 0),
    likeCount: Number(content.likeCount || 0),
    commentCount: Number((content as any).commentCount || 0),
    duration: content.duration ? Number(content.duration) : null,
  }));

  // Cache for 1 hour
  await CacheService.set(cacheKey, serializedTrending, CacheTTL.TRENDING);

  return serializedTrending;
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
      isActive: true,
      deletedAt: null,
    },
    orderBy: {
      sortOrder: 'asc',
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
