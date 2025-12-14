/**
 * Category Caching Utilities
 * Handles caching for category lists and category content
 */

import { CacheService, CacheKeys, CacheTTL } from '../redis';
import { prisma } from '../prisma';

/**
 * Get or cache all categories
 */
export async function getCachedCategories(fetchFn?: () => Promise<any>) {
  const cacheKey = CacheKeys.categories();

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const categories = fetchFn
    ? await fetchFn()
    : await prisma.category.findMany({
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
 * Get or cache category by ID
 */
export async function getCachedCategoryById(categoryId: string, fetchFn?: () => Promise<any>) {
  const cacheKey = CacheKeys.category(categoryId);

  // Try cache first
  const cached = await CacheService.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from database
  const category = fetchFn
    ? await fetchFn()
    : await prisma.category.findUnique({
        where: { id: categoryId },
      });

  if (!category) {
    return null;
  }

  // Cache for 1 day
  await CacheService.set(cacheKey, category, CacheTTL.CATEGORY);

  return category;
}

/**
 * Invalidate category cache (call on category change)
 */
export async function invalidateCategoryCache(categoryId?: string) {
  if (categoryId) {
    await CacheService.delete(CacheKeys.category(categoryId));
  }
  // Always invalidate categories list
  await CacheService.delete(CacheKeys.categories());
}

