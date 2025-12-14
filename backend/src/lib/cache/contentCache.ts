/**
 * Content Caching Utilities
 * Handles caching for trending content, search results, and homepage sections
 */

import { CacheService, CacheKeys, CacheTTL } from '../redis';
import { prisma } from '../prisma';

/**
 * Get or cache trending content
 */
export async function getCachedTrendingContent(period: string = 'today') {
  const cacheKey = CacheKeys.trending(period);
  
  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Calculate trending (this would call your actual trending calculation)
  const trending = await calculateTrendingContent(period);

  // Cache for 1 hour
  await CacheService.set(cacheKey, trending, CacheTTL.TRENDING);

  return trending;
}

/**
 * Calculate trending content (moved from routes)
 */
async function calculateTrendingContent(period: string = 'today') {
  const hours = period === 'today' ? 24 : period === 'week' ? 168 : 24;
  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - hours);

  const trendingContent = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      publishedAt: {
        gte: sinceDate,
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          display_name: true,
          avatar: true,
          is_verified: true,
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
    take: 60, // Get more to calculate trending scores
    orderBy: {
      viewCount: 'desc',
    },
  });

  // Calculate trending scores
  const scoredContent = trendingContent.map(content => {
    const now = Date.now();
    const publishedAt = content.publishedAt ? new Date(content.publishedAt).getTime() : now;
    const hoursSincePublish = (now - publishedAt) / (1000 * 60 * 60);
    
    const viewVelocity = (content.viewCount || 0) / Math.max(hoursSincePublish, 1);
    const engagementScore = (content.viewCount || 0) > 0 
      ? (content.likeCount || 0) / (content.viewCount || 0)
      : 0;
    const timeDecay = Math.exp(-hoursSincePublish / 168);
    
    return {
      ...content,
      _trendingScore: viewVelocity * (1 + engagementScore) * timeDecay,
    };
  });

  scoredContent.sort((a, b) => b._trendingScore - a._trendingScore);
  return scoredContent.slice(0, 20).map(({ _trendingScore, ...item }) => item);
}

/**
 * Get or cache search results
 */
export async function getCachedSearchResults(
  query: string,
  filters: any,
  sort: string,
  page: number,
  limit: number,
  fetchFn: () => Promise<any>
) {
  // Create cache key from search parameters
  const filtersHash = JSON.stringify(filters);
  const cacheKey = CacheKeys.search(query, `${filtersHash}:${sort}:${page}:${limit}`);

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const results = await fetchFn();

  // Cache for 5 minutes
  await CacheService.set(cacheKey, results, CacheTTL.SEARCH);

  return results;
}

/**
 * Invalidate search cache (call on new content upload)
 */
export async function invalidateSearchCache() {
  await CacheService.invalidate('search:*');
}

/**
 * Get or cache homepage sections
 */
export async function getCachedHomepageSection(
  section: string,
  fetchFn: () => Promise<any>
) {
  const cacheKey = CacheKeys.homepage(section);

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const data = await fetchFn();

  // Cache for 30 minutes
  await CacheService.set(cacheKey, data, CacheTTL.HOMEPAGE);

  return data;
}

/**
 * Invalidate homepage cache (call on new trending content)
 */
export async function invalidateHomepageCache() {
  await CacheService.invalidate('homepage:*');
  // Also invalidate trending cache
  await CacheService.invalidate('trending:*');
}

