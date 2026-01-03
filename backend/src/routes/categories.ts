/**
 * Categories API Routes
 * Provides endpoints for fetching content categories
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { getCachedCategories } from '../lib/cache/categoryCache';

const router = Router();

/**
 * GET /api/categories
 * Get all active categories with content count
 */
router.get(
  '/',
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Try to get cached categories with content count
    const categories = await getCachedCategories(async () => {
      // Fetch categories with content count
      const cats = await prisma.category.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          _count: {
            select: {
              contents: {
                where: {
                  content: {
                    status: 'PUBLISHED',
                  },
                },
              },
            },
          },
        },
      });

      // Map to simpler format
      return cats.map((cat) => ({
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        description: cat.description,
        icon: cat.icon,
        color: cat.color,
        count: cat._count.contents,
      }));
    });

    res.json({
      success: true,
      data: {
        categories,
      },
    });
  })
);

export default router;
