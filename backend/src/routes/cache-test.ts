/**
 * Cache Testing Routes
 * Test Redis cache functionality
 * Only available in development mode
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { asyncHandler } from '../middleware/asyncHandler';
import { CacheService, isRedisAvailable, CacheKeys, CacheTTL } from '../lib/redis';
import { getCachedContent, getCachedTrending, getCachedCategories } from '../lib/cache/contentCache';
import { getCachedSearch } from '../lib/cache/searchCache';
import { env } from '../config/env';

const router = Router();

// Only enable in development
if (env.NODE_ENV === 'development') {
  /**
   * GET /api/cache-test/status
   * Check Redis connection status
   */
  router.get(
    '/status',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const redisAvailable = isRedisAvailable();
      
      // Test Redis connection
      let testResult = 'not_configured';
      if (redisAvailable) {
        try {
          await CacheService.set('test:connection', 'ok', 10);
          const value = await CacheService.get('test:connection');
          testResult = value === 'ok' ? 'connected' : 'error';
          await CacheService.delete('test:connection');
        } catch (error) {
          testResult = 'error';
        }
      }

      res.json({
        success: true,
        data: {
          redisConfigured: !!env.REDIS_URL,
          redisAvailable,
          connectionTest: testResult,
          environment: env.NODE_ENV,
        },
      });
    })
  );

  /**
   * GET /api/cache-test/content/:id
   * Test content caching
   */
  router.get(
    '/content/:id',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = req.params;
      
      // First request - should fetch from DB
      const start1 = Date.now();
      const content1 = await getCachedContent(id);
      const time1 = Date.now() - start1;
      
      // Second request - should fetch from cache
      const start2 = Date.now();
      const content2 = await getCachedContent(id);
      const time2 = Date.now() - start2;
      
      res.json({
        success: true,
        data: {
          content: content1,
          firstRequest: {
            time: `${time1}ms`,
            source: 'database',
          },
          secondRequest: {
            time: `${time2}ms`,
            source: time2 < time1 ? 'cache' : 'database',
            speedup: time1 > 0 ? `${((time1 - time2) / time1 * 100).toFixed(1)}%` : 'N/A',
          },
        },
      });
    })
  );

  /**
   * GET /api/cache-test/trending
   * Test trending content caching
   */
  router.get(
    '/trending',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const period = (req.query.period as 'today' | 'week' | 'month') || 'today';
      
      // First request
      const start1 = Date.now();
      const trending1 = await getCachedTrending(period);
      const time1 = Date.now() - start1;
      
      // Second request
      const start2 = Date.now();
      const trending2 = await getCachedTrending(period);
      const time2 = Date.now() - start2;
      
      res.json({
        success: true,
        data: {
          period,
          count: trending1?.length || 0,
          firstRequest: {
            time: `${time1}ms`,
            source: 'database',
          },
          secondRequest: {
            time: `${time2}ms`,
            source: time2 < time1 ? 'cache' : 'database',
            speedup: time1 > 0 ? `${((time1 - time2) / time1 * 100).toFixed(1)}%` : 'N/A',
          },
        },
      });
    })
  );

  /**
   * GET /api/cache-test/categories
   * Test categories caching
   */
  router.get(
    '/categories',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      // First request
      const start1 = Date.now();
      const categories1 = await getCachedCategories();
      const time1 = Date.now() - start1;
      
      // Second request
      const start2 = Date.now();
      const categories2 = await getCachedCategories();
      const time2 = Date.now() - start2;
      
      res.json({
        success: true,
        data: {
          count: categories1?.length || 0,
          firstRequest: {
            time: `${time1}ms`,
            source: 'database',
          },
          secondRequest: {
            time: `${time2}ms`,
            source: time2 < time1 ? 'cache' : 'database',
            speedup: time1 > 0 ? `${((time1 - time2) / time1 * 100).toFixed(1)}%` : 'N/A',
          },
        },
      });
    })
  );

  /**
   * GET /api/cache-test/search
   * Test search caching
   */
  router.get(
    '/search',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const query = (req.query.q as string) || 'test';
      
      // First request
      const start1 = Date.now();
      const search1 = await getCachedSearch(query, {}, 20, 0);
      const time1 = Date.now() - start1;
      
      // Second request
      const start2 = Date.now();
      const search2 = await getCachedSearch(query, {}, 20, 0);
      const time2 = Date.now() - start2;
      
      res.json({
        success: true,
        data: {
          query,
          results: search1?.total || 0,
          firstRequest: {
            time: `${time1}ms`,
            source: 'database',
          },
          secondRequest: {
            time: `${time2}ms`,
            source: time2 < time1 ? 'cache' : 'database',
            speedup: time1 > 0 ? `${((time1 - time2) / time1 * 100).toFixed(1)}%` : 'N/A',
          },
        },
      });
    })
  );

  /**
   * POST /api/cache-test/clear
   * Clear all caches
   */
  router.post(
    '/clear',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      const { pattern } = req.body;
      
      if (pattern) {
        await CacheService.invalidate(pattern);
      } else {
        // Clear all cache patterns
        await CacheService.invalidate('content:*');
        await CacheService.invalidate('trending:*');
        await CacheService.invalidate('search:*');
        await CacheService.invalidate('categories:*');
        await CacheService.invalidate('homepage:*');
        await CacheService.invalidate('creator:*');
      }
      
      res.json({
        success: true,
        message: pattern ? `Cleared cache pattern: ${pattern}` : 'Cleared all caches',
      });
    })
  );

  /**
   * GET /api/cache-test/info
   * Get cache information
   */
  router.get(
    '/info',
    authenticate,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
      res.json({
        success: true,
        data: {
          cacheKeys: {
            content: 'content:{id}',
            trending: 'trending:{period}',
            search: 'search:{query}:{filters}',
            categories: 'categories:all',
            creator: 'creator:{id}',
            homepage: 'homepage:{section}',
          },
          cacheTTL: {
            trending: `${CacheTTL.TRENDING}s (${CacheTTL.TRENDING / 60} minutes)`,
            search: `${CacheTTL.SEARCH}s (${CacheTTL.SEARCH / 60} minutes)`,
            creator: `${CacheTTL.CREATOR}s (${CacheTTL.CREATOR / 60} minutes)`,
            category: `${CacheTTL.CATEGORY}s (${CacheTTL.CATEGORY / 3600} hours)`,
            homepage: `${CacheTTL.HOMEPAGE}s (${CacheTTL.HOMEPAGE / 60} minutes)`,
            session: `${CacheTTL.SESSION}s (${CacheTTL.SESSION / 60} minutes)`,
            user: `${CacheTTL.USER}s (${CacheTTL.USER / 60} minutes)`,
          },
        },
      });
    })
  );
}

export default router;

