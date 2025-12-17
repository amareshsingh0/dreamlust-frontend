/**
 * Search Autocomplete API Routes
 * 
 * Provides autocomplete suggestions, trending searches, and recent searches
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';
import logger from '../lib/logger';

const router = Router();

/**
 * GET /api/search/autocomplete
 * Get autocomplete suggestions based on query
 */
router.get(
  '/autocomplete',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const query = (req.query.q as string) || '';
    const limit = parseInt(req.query.limit as string) || 10;

    if (!query || query.length < 2) {
      return res.json({
        success: true,
        data: {
          suggestions: [],
          trending: [],
          recent: [],
        },
      });
    }

    try {
      // Get suggestions from content titles, tags, and categories
      const [contentSuggestions, tagSuggestions, categorySuggestions] = await Promise.all([
        // Content title suggestions
        prisma.content.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
            ],
            status: 'PUBLISHED',
          },
          select: {
            title: true,
          },
          take: 5,
          orderBy: {
            viewCount: 'desc',
          },
        }),

        // Tag suggestions
        prisma.tag.findMany({
          where: {
            name: { contains: query, mode: 'insensitive' },
          },
          select: {
            name: true,
          },
          take: 5,
          orderBy: {
            usage_count: 'desc',
          },
        }),

        // Category suggestions
        prisma.category.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } },
            ],
            is_active: true,
          },
          select: {
            name: true,
          },
          take: 5,
        }),
      ]);

      // Combine and deduplicate suggestions
      const suggestions = [
        ...contentSuggestions.map((c) => c.title),
        ...tagSuggestions.map((t) => t.name),
        ...categorySuggestions.map((c) => c.name),
      ]
        .filter((value, index, self) => self.indexOf(value) === index)
        .slice(0, limit);

      // Get trending searches (most searched queries in last 7 days)
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const trendingSearches = await prisma.searchHistory.groupBy({
        by: ['query'],
        where: {
          createdAt: { gte: sevenDaysAgo },
        },
        _count: {
          query: true,
        },
        orderBy: {
          _count: {
            query: 'desc',
          },
        },
        take: 5,
      });

      const trending = trendingSearches.map((t) => t.query);

      // Get recent searches for the user
      let recent: string[] = [];
      if (req.user?.userId) {
        const recentSearches = await prisma.searchHistory.findMany({
          where: {
            userId: req.user.userId,
          },
          select: {
            query: true,
          },
          distinct: ['query'],
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        });

        recent = recentSearches.map((s) => s.query);
      } else if (req.cookies?.sessionId) {
        // For anonymous users, use session ID
        const recentSearches = await prisma.searchHistory.findMany({
          where: {
            sessionId: req.cookies.sessionId,
          },
          select: {
            query: true,
          },
          distinct: ['query'],
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        });

        recent = recentSearches.map((s) => s.query);
      }

      res.json({
        success: true,
        data: {
          suggestions,
          trending,
          recent,
        },
      });
    } catch (error) {
      logger.error('Error fetching autocomplete suggestions', {
        error: error instanceof Error ? error.message : String(error),
        query,
      });
      res.json({
        success: true,
        data: {
          suggestions: [],
          trending: [],
          recent: [],
        },
      });
    }
  })
);

/**
 * GET /api/search/trending
 * Get trending searches
 */
router.get(
  '/trending',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 7;

    const daysAgo = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const trending = await prisma.searchHistory.groupBy({
      by: ['query'],
      where: {
        createdAt: { gte: daysAgo },
      },
      _count: {
        query: true,
      },
      orderBy: {
        _count: {
          query: 'desc',
        },
      },
      take: limit,
    });

    res.json({
      success: true,
      data: trending.map((t) => ({
        query: t.query,
        count: t._count.query,
      })),
    });
  })
);

export default router;

