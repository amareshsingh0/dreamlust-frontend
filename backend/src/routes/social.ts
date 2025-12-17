/**
 * Social Features Routes
 * Following, Activity Feed, Sharing, Collections
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import {
  followUser,
  unfollowUser,
  isFollowing,
  getFollowers,
  getFollowing,
  toggleFollowNotifications,
} from '../lib/social/followService';
import {
  getActivityFeed,
  getActivityText,
} from '../lib/social/activityFeedService';
import {
  generateOGTags,
  generateShareUrl,
  generateEmbedCode,
  trackShare,
} from '../lib/social/sharingService';
import {
  createCollection,
  getCollection,
  addToCollection,
  removeFromCollection,
  getFeaturedCollections,
  getTrendingCollections,
  followCollection,
  addContributor,
} from '../lib/social/collectionService';
import { NotFoundError, UnauthorizedError } from '../lib/errors';

const router = Router();

// ============================================================================
// FOLLOWING
// ============================================================================

const followSchema = z.object({
  followingId: z.string().uuid(),
  followingType: z.enum(['user', 'creator']).optional().default('user'),
});

/**
 * POST /api/social/follow
 * Follow a user or creator
 */
router.post(
  '/follow',
  authenticate,
  userRateLimiter,
  validateBody(followSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { followingId, followingType } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const follow = await followUser(userId, followingId, followingType);

    res.json({
      success: true,
      data: follow,
    });
  })
);

/**
 * DELETE /api/social/follow/:followingId
 * Unfollow a user or creator
 */
router.delete(
  '/follow/:followingId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { followingId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await unfollowUser(userId, followingId);

    res.json({
      success: true,
      message: 'Unfollowed successfully',
    });
  })
);

/**
 * GET /api/social/follow/:followingId
 * Check if following a user
 */
router.get(
  '/follow/:followingId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { followingId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const following = await isFollowing(userId, followingId);

    res.json({
      success: true,
      data: { following },
    });
  })
);

/**
 * GET /api/social/followers/:userId
 * Get followers for a user
 */
router.get(
  '/followers/:userId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const followers = await getFollowers(userId, limit, offset);

    res.json({
      success: true,
      data: followers,
    });
  })
);

/**
 * GET /api/social/following/:userId
 * Get users that a user is following
 */
router.get(
  '/following/:userId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const following = await getFollowing(userId, limit, offset);

    res.json({
      success: true,
      data: following,
    });
  })
);

// ============================================================================
// ACTIVITY FEED
// ============================================================================

/**
 * GET /api/social/activity-feed
 * Get activity feed for current user
 */
router.get(
  '/activity-feed',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const type = req.query.type as string | undefined;

    const activities = await getActivityFeed(userId, { limit, offset, type });

    res.json({
      success: true,
      data: activities.map(activity => ({
        ...activity,
        text: getActivityText(activity),
      })),
    });
  })
);

// ============================================================================
// SOCIAL SHARING
// ============================================================================

/**
 * GET /api/social/share/:contentId/og-tags
 * Get Open Graph tags for content
 */
router.get(
  '/share/:contentId/og-tags',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const ogTags = await generateOGTags(contentId);

    res.json({
      success: true,
      data: ogTags,
    });
  })
);

/**
 * GET /api/social/share/:contentId/url
 * Get share URL for content
 */
router.get(
  '/share/:contentId/url',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const platform = req.query.platform as string | undefined;

    const shareUrl = generateShareUrl(contentId, platform);

    res.json({
      success: true,
      data: { url: shareUrl },
    });
  })
);

/**
 * GET /api/social/share/:contentId/embed
 * Get embed code for content
 */
router.get(
  '/share/:contentId/embed',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const embedCode = generateEmbedCode(contentId);

    res.json({
      success: true,
      data: { embedCode },
    });
  })
);

/**
 * POST /api/social/share/:contentId/track
 * Track share event
 */
router.post(
  '/share/:contentId/track',
  optionalAuth,
  userRateLimiter,
  validateBody(z.object({
    platform: z.string().optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId || null;
    const { contentId } = req.params;
    const { platform } = req.body;

    await trackShare(contentId, userId, platform);

    res.json({
      success: true,
      message: 'Share tracked',
    });
  })
);

// ============================================================================
// COLLECTIONS
// ============================================================================

const createCollectionSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isPublic: z.boolean().optional().default(true),
  isCollaborative: z.boolean().optional().default(false),
  contributors: z.array(z.string().uuid()).optional().default([]),
  thumbnailUrl: z.string().url().optional(),
});

/**
 * POST /api/social/collections
 * Create a new collection
 */
router.post(
  '/collections',
  authenticate,
  userRateLimiter,
  validateBody(createCollectionSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const collection = await createCollection({
      ...req.body,
      ownerId: userId,
    });

    res.json({
      success: true,
      data: collection,
    });
  })
);

/**
 * GET /api/social/collections/:id
 * Get collection by ID
 */
router.get(
  '/collections/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    const collection = await getCollection(id, userId);

    res.json({
      success: true,
      data: collection,
    });
  })
);

/**
 * POST /api/social/collections/:id/items
 * Add content to collection
 */
router.post(
  '/collections/:id/items',
  authenticate,
  userRateLimiter,
  validateBody(z.object({
    contentId: z.string().uuid(),
    note: z.string().max(500).optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { contentId, note } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const item = await addToCollection(id, contentId, userId, note);

    res.json({
      success: true,
      data: item,
    });
  })
);

/**
 * DELETE /api/social/collections/:id/items/:contentId
 * Remove content from collection
 */
router.delete(
  '/collections/:id/items/:contentId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id, contentId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await removeFromCollection(id, contentId, userId);

    res.json({
      success: true,
      message: 'Item removed from collection',
    });
  })
);

/**
 * GET /api/social/collections/featured
 * Get featured collections
 */
router.get(
  '/collections/featured',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;

    const collections = await getFeaturedCollections(limit);

    res.json({
      success: true,
      data: collections,
    });
  })
);

/**
 * GET /api/social/collections/trending
 * Get trending collections
 */
router.get(
  '/collections/trending',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;

    const collections = await getTrendingCollections(limit);

    res.json({
      success: true,
      data: collections,
    });
  })
);

/**
 * POST /api/social/collections/:id/follow
 * Follow a collection
 */
router.post(
  '/collections/:id/follow',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await followCollection(id, userId);

    res.json({
      success: true,
      message: 'Collection followed',
    });
  })
);

/**
 * POST /api/social/collections/:id/contributors
 * Add contributor to collection
 */
router.post(
  '/collections/:id/contributors',
  authenticate,
  userRateLimiter,
  validateBody(z.object({
    contributorId: z.string().uuid(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { contributorId } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await addContributor(id, userId, contributorId);

    res.json({
      success: true,
      message: 'Contributor added',
    });
  })
);

export default router;

