/**
 * Search Caching Service
 * Caches search results to reduce database load
 */

import { CacheService, CacheKeys, CacheTTL } from '../redis';
import { prisma } from '../prisma';

interface SearchFilters {
  category?: string;
  tags?: string[];
  type?: string;
  minViews?: number;
  sortBy?: 'relevance' | 'views' | 'likes' | 'newest';
}

/**
 * Get cached search results or perform search
 */
export async function getCachedSearch(
  query: string,
  filters: SearchFilters = {},
  limit: number = 20,
  offset: number = 0
) {
  // Create cache key from query and filters
  const filtersStr = JSON.stringify(filters);
  const cacheKey = CacheKeys.search(query, filtersStr);
  
  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // Build search query
  const where: any = {
    status: 'PUBLISHED',
    deletedAt: null,
  };
  
  // Text search
  if (query) {
    where.OR = [
      { title: { contains: query, mode: 'insensitive' } },
      { description: { contains: query, mode: 'insensitive' } },
    ];
  }
  
  // Filters
  if (filters.category) {
    where.categories = {
      some: {
        category: {
          slug: filters.category,
        },
      },
    };
  }
  
  if (filters.tags && filters.tags.length > 0) {
    where.tags = {
      some: {
        tag: {
          slug: { in: filters.tags },
        },
      },
    };
  }
  
  if (filters.type) {
    where.type = filters.type;
  }
  
  if (filters.minViews) {
    where.viewCount = { gte: filters.minViews };
  }
  
  // Sort order
  const orderBy: any = {};
  if (filters.sortBy === 'views') {
    orderBy.viewCount = 'desc';
  } else if (filters.sortBy === 'likes') {
    orderBy.likeCount = 'desc';
  } else if (filters.sortBy === 'newest') {
    orderBy.publishedAt = 'desc';
  } else {
    // Default: relevance (by view count)
    orderBy.viewCount = 'desc';
  }
  
  // Perform search
  const [results, total] = await Promise.all([
    prisma.content.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
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
      },
    }),
    prisma.content.count({ where }),
  ]);
  
  const searchResults = {
    results,
    total,
    limit,
    offset,
  };
  
  // Cache for 5 minutes
  await CacheService.set(cacheKey, searchResults, CacheTTL.SEARCH);
  
  return searchResults;
}

/**
 * Invalidate search cache
 */
export async function invalidateSearchCache() {
  await CacheService.invalidate('search:*');
}

