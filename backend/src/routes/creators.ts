import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, ValidationError, ForbiddenError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';
import { validateQuery, validateBody } from '../middleware/validation';
import { awardPoints } from '../lib/loyalty/points';

// Schema for updating creator profile
const updateCreatorSchema = z.object({
  displayName: z.string().min(2).max(50).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional().or(z.literal('')),
  avatar: z.string().optional(),
  banner: z.string().optional(),
});

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
        userId: true,
        user: {
          select: {
            avatar: true,
            bio: true,
            socialLinks: true,
            displayName: true,
          },
        },
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator');
    }

    // Compute actual stats from Content table (more accurate than cached counters)
    const [contentStats, isFollowingResult] = await Promise.all([
      // Aggregate content stats
      prisma.content.aggregate({
        where: {
          creatorId: creator.id,
          status: 'PUBLISHED',
          isPublic: true,
          deletedAt: null,
        },
        _count: { id: true },
        _sum: { viewCount: true, likeCount: true },
      }),
      // Check if user is following this creator
      userId
        ? prisma.subscription.findFirst({
            where: {
              subscriberId: userId,
              creatorId: creator.id,
            },
          })
        : Promise.resolve(null),
    ]);

    const isFollowing = !!isFollowingResult && isFollowingResult.status === 'ACTIVE';
    const computedContentCount = contentStats._count.id || 0;
    const computedTotalViews = contentStats._sum.viewCount || 0;
    const computedTotalLikes = contentStats._sum.likeCount || 0;

    // Merge user data with creator data (user data takes precedence for avatar/bio if creator's are null)
    res.json({
      success: true,
      data: {
        ...creator,
        // Use creator avatar/bio if set, otherwise fall back to user's
        avatar: creator.avatar || creator.user?.avatar,
        banner: creator.banner, // Banner is only on Creator model
        bio: creator.bio || creator.user?.bio,
        displayName: creator.displayName || creator.user?.displayName,
        socialLinks: creator.user?.socialLinks,
        // Use computed stats (more accurate than cached counters which may not be updated)
        contentCount: computedContentCount,
        totalViews: String(computedTotalViews),
        totalLikes: computedTotalLikes,
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

    // Get subscriptions (follows are stored as subscriptions with amount=0)
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where: {
          subscriberId: userId,
          status: 'ACTIVE',
        },
        include: {
          creator: {
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
      prisma.subscription.count({
        where: {
          subscriberId: userId,
          status: 'ACTIVE',
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
 * GET /api/creators/me
 * Get current user's creator profile
 */
router.get(
  '/me',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const creator = await prisma.creator.findUnique({
      where: { userId },
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
        userId: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found. You may need to become a creator first.');
    }

    res.json({
      success: true,
      data: {
        ...creator,
        totalViews: creator.totalViews ? String(creator.totalViews) : null,
      },
    });
  })
);

/**
 * PUT /api/creators/me
 * Update current user's creator profile
 */
router.put(
  '/me',
  authenticate,
  userRateLimiter,
  validateBody(updateCreatorSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { displayName, bio, location, website, avatar, banner } = req.body;

    // Check if user has a creator profile
    const existingCreator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!existingCreator) {
      throw new NotFoundError('Creator profile not found. You may need to become a creator first.');
    }

    // Build update data
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (location !== undefined) updateData.location = location;
    if (website !== undefined) updateData.website = website || null;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (banner !== undefined) updateData.banner = banner;

    // Update creator profile
    const updatedCreator = await prisma.creator.update({
      where: { userId },
      data: updateData,
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

    // Also update user's displayName and avatar if changed
    if (displayName !== undefined || avatar !== undefined || bio !== undefined) {
      const userUpdateData: any = {};
      if (displayName !== undefined) userUpdateData.displayName = displayName;
      if (avatar !== undefined) userUpdateData.avatar = avatar;
      if (bio !== undefined) userUpdateData.bio = bio;

      await prisma.user.update({
        where: { id: userId },
        data: userUpdateData,
      });
    }

    res.json({
      success: true,
      message: 'Creator profile updated successfully',
      data: {
        ...updatedCreator,
        totalViews: updatedCreator.totalViews ? String(updatedCreator.totalViews) : null,
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

/**
 * GET /api/creators/:id/content
 * Get content by a specific creator (paginated)
 * If the requesting user is the creator, show all content (including unpublished)
 */
router.get(
  '/:id/content',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id: creatorId } = req.params;
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string | undefined;
    const skip = (page - 1) * limit;

    // Verify creator exists and get userId
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: { id: true, userId: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator');
    }

    // Check if requesting user is the creator (owner)
    const isOwner = userId && creator.userId === userId;

    // Build where clause
    // If owner, show all content; otherwise only published and public
    const where: any = {
      creatorId,
    };

    if (!isOwner) {
      where.status = 'PUBLISHED';
      where.isPublic = true;
    }

    if (type) {
      where.type = type.toUpperCase();
    }

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          thumbnail: true,
          mediaUrl: true,
          duration: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          isNSFW: true,
          ageRestricted: true,
          isPremium: true,
          isPublic: true,
          status: true,
          resolution: true,
          publishedAt: true,
          createdAt: true,
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
        },
        orderBy: isOwner ? { createdAt: 'desc' } : { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.content.count({ where }),
    ]);

    // Transform content to match frontend Content type
    const transformedContent = content.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      type: item.type.toLowerCase(),
      thumbnail: item.thumbnail || '',
      mediaUrl: item.mediaUrl,
      duration: item.duration ? Number(item.duration) : 0,
      views: item.viewCount || 0,
      likes: item.likeCount || 0,
      commentCount: item.commentCount || 0,
      createdAt: item.createdAt?.toISOString() || new Date().toISOString(),
      publishedAt: item.publishedAt?.toISOString(),
      isNSFW: item.isNSFW,
      ageRestricted: item.ageRestricted,
      isPremium: item.isPremium || false,
      isPublic: item.isPublic,
      status: item.status,
      quality: item.resolution ? [item.resolution] : [],
      tags: [],
      category: '',
      creator: {
        id: item.creator.id,
        userId: item.creator.userId,
        name: item.creator.displayName || item.creator.handle,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.isVerified || false,
      },
    }));

    res.json({
      success: true,
      data: {
        content: transformedContent,
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

export default router;
