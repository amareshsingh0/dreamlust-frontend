import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { awardPoints } from '../lib/loyalty/points';
import { trackLikeActivity } from '../lib/social/activityFeedService';

const router = Router();

const trackViewSchema = z.object({
  contentId: z.string(),
  duration: z.number().int().min(0).optional(),
});

/**
 * POST /api/content/:id/view
 * Track a view for content
 */
router.post(
  '/:id/view',
  optionalAuth,
  userRateLimiter,
  validateBody(trackViewSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const { duration } = req.body;

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check user preferences if authenticated
    let shouldRecordHistory = true;
    let shouldTrackAnalytics = true;

    if (userId) {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId }, // Prisma Client maps user_id to userId
      });

      if (preferences) {
        shouldRecordHistory = !preferences.hideHistory;
        shouldTrackAnalytics = !preferences.anonymousMode;
      }
    }

    // Create view record if history should be recorded
    if (shouldRecordHistory && userId) {
      await prisma.view.create({
        data: {
          contentId: id,
          userId,
          ipAddress: req.ip || undefined,
          userAgent: req.get('user-agent') || undefined,
          duration: duration || undefined,
        },
      });
    } else if (!userId) {
      // Record anonymous view (no userId)
      await prisma.view.create({
        data: {
          contentId: id,
          ipAddress: req.ip || undefined,
          userAgent: req.get('user-agent') || undefined,
          duration: duration || undefined,
        },
      });
    }

    // Update content view count (always increment, even if analytics disabled)
    // This is for public metrics, not personal tracking
    await prisma.content.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
      },
    });

    // Award points for watch time (if authenticated and duration provided)
    if (userId && duration && duration > 0) {
      const minutes = Math.floor(duration / 60);
      if (minutes > 0) {
        // Award points asynchronously (don't wait for it)
        awardPoints(userId, 'WATCH_MINUTE', {
          contentId: id,
          minutes,
          duration,
        }).catch((error) => {
          console.error('Failed to award watch time points:', error);
        });
      }
    }

    res.json({
      success: true,
      message: 'View tracked',
      data: {
        historyRecorded: shouldRecordHistory,
        analyticsTracked: shouldTrackAnalytics,
      },
    });
  }
);

/**
 * POST /api/content/:id/like
 * Like or unlike content
 */
router.post(
  '/:id/like',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if already liked
    const existingLike = await prisma.like.findFirst({
      where: {
        contentId: id,
        userId,
      },
    });

    if (existingLike) {
      // Unlike
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      // Decrement like count
      await prisma.content.update({
        where: { id },
        data: {
          likeCount: { decrement: 1 },
        },
      });

      res.json({
        success: true,
        message: 'Content unliked',
        data: { liked: false },
      });
    } else {
      // Like
      await prisma.like.create({
        data: {
          contentId: id,
          userId,
        },
      });

      // Increment like count
      await prisma.content.update({
        where: { id },
        data: {
          likeCount: { increment: 1 },
        },
      });

      // Award points for liking content
      awardPoints(userId, 'LIKE_CONTENT', {
        contentId: id,
      }).catch((error) => {
        console.error('Failed to award like points:', error);
      });

      // Track like activity
      trackLikeActivity(id, userId, content.creatorId).catch((error) => {
        console.error('Failed to track like activity:', error);
      });

      res.json({
        success: true,
        message: 'Content liked',
        data: { liked: true },
      });
    }
  })
);

/**
 * GET /api/content/liked
 * Get user's liked content
 */
router.get(
  '/liked',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      prisma.like.findMany({
        where: { userId },
        include: {
          content: {
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
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.like.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        content: likes.map(like => like.content),
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
 * GET /api/content/history
 * Get user's watch history
 */
router.get(
  '/history',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [views, total] = await Promise.all([
      prisma.view.findMany({
        where: { userId },
        include: {
          content: {
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
          },
        },
        orderBy: { watchedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.view.count({
        where: { userId },
      }),
    ]);

    res.json({
      success: true,
      data: {
        content: views.map(view => ({
          ...view.content,
          watchedAt: view.watchedAt,
          duration: view.duration,
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
 * GET /api/content/:id
 * Get content details
 */
router.get(
  '/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    const content = await prisma.content.findUnique({
      where: { id },
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
        tags: {
          include: {
            tag: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if user liked this content
    let isLiked = false;
    if (userId) {
      const like = await prisma.like.findFirst({
        where: {
          contentId: id,
          userId,
        },
      });
      isLiked = !!like;
    }

    res.json({
      success: true,
      data: {
        ...content,
        isLiked,
      },
    });
  })
);

export default router;

