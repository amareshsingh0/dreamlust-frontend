import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';
import { validateQuery } from '../middleware/validation';
import { awardPoints } from '../lib/loyalty/points';

const router = Router();

/**
 * GET /api/creators
 * Get all creators (paginated)
 */
router.get(
  '/',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    // Validate query parameters manually (validateQuery middleware can cause issues with optional params)
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const search = req.query.search as string | undefined;
    const skip = (page - 1) * limit;

    // Build where clause
    const baseWhere: any = {
      status: 'APPROVED', // Only show approved creators
      deletedAt: null, // Exclude soft-deleted creators
    };

    // Add search filter if provided
    const where = search && search.trim()
      ? {
          ...baseWhere,
          OR: [
            { handle: { contains: search.trim(), mode: 'insensitive' } },
            { displayName: { contains: search.trim(), mode: 'insensitive' } },
            { bio: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }
      : baseWhere;

    let creators, total;
    try {
      [creators, total] = await Promise.all([
        prisma.creator.findMany({
          where,
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatar: true,
            banner: true,
            bio: true,
            isVerified: true,
            followerCount: true,
            contentCount: true,
            totalViews: true,
          },
          orderBy: [
            { followerCount: 'desc' },
            { createdAt: 'desc' },
          ],
          skip,
          take: limit,
        }),
        prisma.creator.count({ where }),
      ]);
    } catch (error: any) {
      // Enhanced error logging for database issues
      console.error('Database error in GET /api/creators:', {
        error: error.message,
        code: error.code,
        name: error.name,
        meta: error.meta,
      });
      
      // Re-throw with more context for database connection errors
      if (error.code === 'P1001' || error.code === 'P1017') {
        throw new Error('Database connection failed. Please check if your database is running and DATABASE_URL is configured correctly.');
      }
      
      // Prisma schema/migration errors
      if (error.code === 'P2001' || error.code === 'P2025') {
        throw new Error('Database schema error. Please run: bun run db:push or bun run db:migrate');
      }
      
      // Table doesn't exist
      if (error.code === 'P2021' || error.code === '42P01') {
        throw new Error('Database table does not exist. Please run migrations: bun run db:push');
      }
      
      throw error;
    }

    // Get following status for each creator if user is logged in
    let followingMap: Record<string, boolean> = {};
    if (userId) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          subscriberId: userId,
          status: 'ACTIVE', // Subscription status, not creator status
          creatorId: { in: creators.map(c => c.id) },
        },
        select: { creatorId: true },
      });
      followingMap = subscriptions.reduce((acc, sub) => {
        acc[sub.creatorId] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }

    res.json({
      success: true,
      data: {
        creators: creators.map(creator => ({
          ...creator,
          // Convert BigInt to string for JSON serialization
          totalViews: creator.totalViews ? String(creator.totalViews) : null,
          isFollowing: followingMap[creator.id] || false,
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * GET /api/creators/handle/:handle
 * Get creator profile by handle/username
 * This must come before /:id route to avoid route conflicts
 */
router.get(
  '/handle/:handle',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { handle } = req.params;
    const userId = req.user?.userId;

    const creator = await prisma.creator.findUnique({
      where: { handle },
      select: {
        id: true,
        handle: true,
        displayName: true,
        avatar: true,
        banner: true,
        bio: true,
        location: true,
        website: true,
        isVerified: true,
        followerCount: true,
        followingCount: true,
        contentCount: true,
        totalViews: true,
        totalLikes: true,
        status: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator');
    }

    // Check if user is following this creator
    let isFollowing = false;
    if (userId) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          subscriberId: userId,
          creatorId: creator.id,
        },
      });
      isFollowing = !!subscription && subscription.status === 'ACTIVE';
    }

    res.json({
      success: true,
      data: {
        ...creator,
        // Convert BigInt to string for JSON serialization
        totalViews: creator.totalViews ? String(creator.totalViews) : null,
        isFollowing,
      },
    });
  })
);

/**
 * POST /api/creators/:id/follow
 * Follow or unfollow a creator
 */
router.post(
  '/:id/follow',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: creatorId } = req.params;
    const userId = req.user!.userId;

    // Check if creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, userId: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator');
    }

    // Can't follow yourself
    if (creator.userId === userId) {
      throw new ValidationError('Cannot follow yourself');
    }

    // Check if already following
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        subscriberId: userId,
        creatorId: creatorId,
      },
    });

    if (existingSubscription) {
      // Unfollow
      await prisma.subscription.delete({
        where: {
          id: existingSubscription.id,
        },
      });

      // Decrement follower count
      await prisma.creator.update({
        where: { id: creatorId },
        data: {
          followerCount: { decrement: 1 },
        },
      });

      res.json({
        success: true,
        message: 'Unfollowed creator',
        data: { following: false },
      });
    } else {
      // Follow (create subscription)
      await prisma.subscription.create({
        data: {
          subscriberId: userId,
          creatorId: creatorId,
          tier: 'BASIC',
          status: 'ACTIVE',
          amount: 0,
          isRecurring: false,
        },
      });

      // Increment follower count
      await prisma.creator.update({
        where: { id: creatorId },
        data: {
          followerCount: { increment: 1 },
        },
      });

      // Award points for following a creator
      awardPoints(userId, 'FOLLOW_CREATOR', {
        creatorId,
      }).catch((error) => {
        console.error('Failed to award follow points:', error);
      });

      res.json({
        success: true,
        message: 'Following creator',
        data: { following: true },
      });
    }
  })
);

/**
 * GET /api/creators/following
 * Get creators the user is following
 */
router.get(
  '/following',
  authenticate,
  userRateLimiter,
  validateQuery(z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Get follows for creators (not users)
    const [follows, total] = await Promise.all([
      prisma.follow.findMany({
        where: {
          followerId: userId,
          followingType: 'creator',
          followingCreatorId: { not: null },
        },
        include: {
          followingCreator: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatar: true,
              banner: true,
              bio: true,
              isVerified: true,
              followerCount: true,
              followingCount: true,
              contentCount: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.follow.count({
        where: {
          followerId: userId,
          followingType: 'creator',
          followingCreatorId: { not: null },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        creators: follows.map(follow => follow.followingCreator).filter(c => c !== null),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * GET /api/creators/:id
 * Get creator profile by ID
 */
router.get(
  '/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    const creator = await prisma.creator.findUnique({
      where: { id },
      select: {
        id: true,
        handle: true,
        displayName: true,
        avatar: true,
        banner: true,
        bio: true,
        location: true,
        website: true,
        isVerified: true,
        followerCount: true,
        followingCount: true,
        contentCount: true,
        totalViews: true,
        totalLikes: true,
        status: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator');
    }

    // Check if user is following this creator
    let isFollowing = false;
    if (userId) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          subscriberId: userId,
          creatorId: id,
        },
      });
      isFollowing = !!subscription && subscription.status === 'ACTIVE';
    }

    res.json({
      success: true,
      data: {
        ...creator,
        // Convert BigInt to string for JSON serialization
        totalViews: creator.totalViews ? String(creator.totalViews) : null,
        isFollowing,
      },
    });
  })
);

export default router;
