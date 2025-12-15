import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, ValidationError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';
import { validateQuery } from '../middleware/validation';
import { creator_status, subscription_status, subscription_tier } from '@prisma/client';

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
      status: creator_status.APPROVED, // Only show approved creators
      deleted_at: null, // Exclude soft-deleted creators
    };

    // Add search filter if provided
    const where = search && search.trim()
      ? {
          ...baseWhere,
          OR: [
            { handle: { contains: search.trim(), mode: 'insensitive' } },
            { display_name: { contains: search.trim(), mode: 'insensitive' } },
            { bio: { contains: search.trim(), mode: 'insensitive' } },
          ],
        }
      : baseWhere;

    const [creators, total] = await Promise.all([
      prisma.creator.findMany({
        where,
        select: {
          id: true,
          handle: true,
          display_name: true,
          avatar: true,
          banner: true,
          bio: true,
          is_verified: true,
          follower_count: true,
          content_count: true,
          total_views: true,
        },
        orderBy: [
          { follower_count: 'desc' },
          { created_at: 'desc' },
        ],
        skip,
        take: limit,
      }),
      prisma.creator.count({ where }),
    ]);

    // Get following status for each creator if user is logged in
    let followingMap: Record<string, boolean> = {};
    if (userId) {
      const subscriptions = await prisma.subscription.findMany({
        where: {
          subscriber_id: userId,
          status: subscription_status.ACTIVE, // Subscription status, not creator status
          creator_id: { in: creators.map(c => c.id) },
        },
        select: { creator_id: true },
      });
      followingMap = subscriptions.reduce((acc, sub) => {
        acc[sub.creator_id] = true;
        return acc;
      }, {} as Record<string, boolean>);
    }

    res.json({
      success: true,
      data: {
        creators: creators.map(creator => ({
          ...creator,
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
        display_name: true,
        avatar: true,
        banner: true,
        bio: true,
        location: true,
        website: true,
        is_verified: true,
        follower_count: true,
        following_count: true,
        content_count: true,
        total_views: true,
        total_likes: true,
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
          subscriber_id: userId,
          creator_id: creator.id,
        },
      });
      isFollowing = !!subscription && subscription.status === 'ACTIVE';
    }

    res.json({
      success: true,
      data: {
        ...creator,
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
      select: { id: true, user_id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator');
    }

    // Can't follow yourself
    if (creator.user_id === userId) {
      throw new ValidationError('Cannot follow yourself');
    }

    // Check if already following
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        subscriber_id: userId,
        creator_id: creatorId,
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
          follower_count: { decrement: 1 },
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
          subscriber_id: userId,
          creator_id: creatorId,
          tier: subscription_tier.BASIC,
          status: subscription_status.ACTIVE,
          amount: 0,
          is_recurring: false,
        },
      });

      // Increment follower count
      await prisma.creator.update({
        where: { id: creatorId },
        data: {
          follower_count: { increment: 1 },
        },
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

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          subscriber_id: userId,
          status: subscription_status.ACTIVE,
        },
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              display_name: true,
              avatar: true,
              banner: true,
              bio: true,
              is_verified: true,
              follower_count: true,
              following_count: true,
              content_count: true,
            },
          },
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: limit,
      }),
      prisma.subscription.count({
        where: {
          subscriber_id: userId,
          status: subscription_status.ACTIVE,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        creators: subscriptions.map(sub => sub.creator),
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
        display_name: true,
        avatar: true,
        banner: true,
        bio: true,
        location: true,
        website: true,
        is_verified: true,
        follower_count: true,
        following_count: true,
        content_count: true,
        total_views: true,
        total_likes: true,
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
          subscriber_id: userId,
          creator_id: id,
        },
      });
      isFollowing = !!subscription && subscription.status === 'ACTIVE';
    }

    res.json({
      success: true,
      data: {
        ...creator,
        isFollowing,
      },
    });
  })
);

export default router;
