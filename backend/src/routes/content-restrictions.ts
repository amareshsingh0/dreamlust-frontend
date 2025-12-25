/**
 * Content Restrictions Routes
 * Handles geo-restrictions and content access control
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, NotFoundError, UnauthorizedError, ForbiddenError } from '../lib/errors';
import { checkContentAccess, getRegionalTrending, checkAgeRestriction } from '../lib/content/geoRestriction';
import { requireAdmin } from '../middleware/admin';
import { countryDetectionMiddleware } from '../lib/geo/countryDetection';

const router = Router();

/**
 * GET /api/content-restrictions/check/:contentId
 * Check if user can access content
 */
router.get(
  '/check/:contentId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    // Country is set by global middleware
    const userCountry = (req as any).userCountry || 
                        (req.headers['x-detected-country'] as string) ||
                        (req.headers['x-user-country'] as string) || 
                        (req.query.country as string) || 
                        'US'; // Default fallback

    const access = await checkContentAccess(contentId, userCountry);

    // If user is authenticated, also check age restriction
    if (req.user?.userId && access.allowed) {
      // Get user's age from profile (assuming birthDate is stored)
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId },
        select: { birthDate: true },
      });

      if (user?.birthDate) {
        const today = new Date();
        const birthDate = new Date(user.birthDate);
        const age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        const dayDiff = today.getDate() - birthDate.getDate();
        const actualAge = monthDiff < 0 || (monthDiff === 0 && dayDiff < 0) ? age - 1 : age;

        const ageCheck = await checkAgeRestriction(contentId, actualAge);
        if (!ageCheck.allowed) {
          return res.json({
            success: true,
            data: ageCheck,
          });
        }
      }
    }

    res.json({
      success: true,
      data: access,
    });
  })
);

/**
 * GET /api/content-restrictions/regional-trending
 * Get regional trending content
 */
router.get(
  '/regional-trending',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Country is set by global middleware
    const country = (req as any).userCountry ||
                    (req.headers['x-detected-country'] as string) ||
                    (req.headers['x-user-country'] as string) || 
                    (req.query.country as string) || 
                    'US';
    const categoryId = req.query.categoryId as string | undefined;

    const trending = await getRegionalTrending(country, categoryId);

    if (!trending) {
      return res.json({
        success: true,
        data: {
          featuredContent: [],
          trendingContent: [],
          region: 'global',
        },
      });
    }

    // Fetch full content details (only if there are IDs to fetch)
    const featuredIds = trending.featuredContent || [];
    const trendingIds = trending.trendingContent || [];

    const [featured, trendingList] = await Promise.all([
      featuredIds.length > 0
        ? prisma.content.findMany({
            where: {
              id: { in: featuredIds },
              status: 'PUBLISHED',
            },
            include: {
              creator: {
                select: {
                  id: true,
                  displayName: true,
                  handle: true,
                  avatar: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      trendingIds.length > 0
        ? prisma.content.findMany({
            where: {
              id: { in: trendingIds },
              status: 'PUBLISHED',
            },
            include: {
              creator: {
                select: {
                  id: true,
                  displayName: true,
                  handle: true,
                  avatar: true,
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    res.json({
      success: true,
      data: {
        featuredContent: featured,
        trendingContent: trendingList,
        region: trending.region,
      },
    });
  })
);

/**
 * POST /api/content-restrictions
 * Create content restriction (admin only)
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId, type, countries, reason } = req.body;

    if (!contentId || !type || !countries || !Array.isArray(countries)) {
      throw new BadRequestError('contentId, type, and countries array are required');
    }

    if (!['geo_block', 'geo_allow', 'age_restriction'].includes(type)) {
      throw new BadRequestError('Invalid restriction type');
    }

    // Check if user is admin
    await requireAdmin(req, res, () => {});

    const restriction = await prisma.contentRestriction.create({
      data: {
        contentId,
        type,
        countries,
        reason: reason || null,
      },
    });

    res.status(201).json({
      success: true,
      data: restriction,
    });
  })
);

/**
 * GET /api/content-restrictions/:contentId
 * Get all restrictions for content
 */
router.get(
  '/:contentId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const restrictions = await prisma.contentRestriction.findMany({
      where: { contentId },
    });

    res.json({
      success: true,
      data: restrictions,
    });
  })
);

/**
 * PUT /api/content-restrictions/:id
 * Update content restriction (admin only)
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { countries, reason } = req.body;

    // Check if user is admin
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, status: true },
    });
    
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      throw new ForbiddenError('Admin access required');
    }

    const restriction = await prisma.contentRestriction.update({
      where: { id },
      data: {
        ...(countries && { countries }),
        ...(reason !== undefined && { reason }),
      },
    });

    res.json({
      success: true,
      data: restriction,
    });
  })
);

/**
 * DELETE /api/content-restrictions/:id
 * Delete content restriction (admin only)
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // Check if user is admin
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, status: true },
    });
    
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      throw new ForbiddenError('Admin access required');
    }

    await prisma.contentRestriction.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Restriction deleted',
    });
  })
);

/**
 * POST /api/content-restrictions/regional-content
 * Create or update regional content (admin only)
 */
router.post(
  '/regional-content',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { categoryId, region, featuredContent, trendingContent } = req.body;

    if (!region || !Array.isArray(featuredContent) || !Array.isArray(trendingContent)) {
      throw new BadRequestError('region, featuredContent, and trendingContent are required');
    }

    // Check if user is admin
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError('Authentication required');
    }
    
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, status: true },
    });
    
    if (!user || user.role !== 'ADMIN' || user.status !== 'ACTIVE') {
      throw new ForbiddenError('Admin access required');
    }

    // For upsert with nullable categoryId, we need to use findFirst + create/update
    const categoryFilter = categoryId ? { categoryId } : { categoryId: null };
    const existing = await prisma.regionalContent.findFirst({
      where: {
        ...categoryFilter,
        region,
      },
    });

    let regionalContent;
    if (existing) {
      regionalContent = await prisma.regionalContent.update({
        where: { id: existing.id },
        data: {
          featuredContent,
          trendingContent,
        },
      });
    } else {
      regionalContent = await prisma.regionalContent.create({
        data: {
          categoryId: categoryId || null,
          region,
          featuredContent,
          trendingContent,
        },
      });
    }

    res.json({
      success: true,
      data: regionalContent,
    });
  })
);

export default router;

