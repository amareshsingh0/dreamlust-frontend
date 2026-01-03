import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { awardPoints } from '../lib/loyalty/points';
import { trackLikeActivity } from '../lib/social/activityFeedService';
import { getCachedContent, invalidateContentCache } from '../lib/cache/contentCache';
import { verifyUserAge } from '../lib/auth/ageVerification';
import { s3Storage } from '../lib/storage/s3Storage';

const router = Router();

const trackViewSchema = z.object({
  duration: z.number().int().min(0).optional(),
}).passthrough(); // Allow empty body or additional fields

/**
 * POST /api/content/:id/view
 * Track a view for content
 */
router.post(
  '/:id/view',
  optionalAuth,
  userRateLimiter,
  validateBody(trackViewSchema),
  asyncHandler(async (req: Request, res: Response) => {
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

    // Check age restriction for age-restricted or NSFW content
    if (content.ageRestricted || content.isNSFW) {
      if (!userId) {
        throw new ForbiddenError(
          'This content is age-restricted. Please sign in and verify your age to access it.'
        );
      }

      // Verify user meets age requirement (18+)
      const ageVerification = await verifyUserAge(userId, 18);
      if (!ageVerification.allowed) {
        throw new ForbiddenError(
          ageVerification.reason || 'You must be 18 or older to view this content.'
        );
      }
    }

    // Check user preferences if authenticated
    let shouldRecordHistory = true;
    let shouldTrackAnalytics = true;

    if (userId) {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: userId },
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
  })
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

      // Invalidate cache
      await invalidateContentCache(id);

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

      // Invalidate cache
      await invalidateContentCache(id);

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
                  displayName: true,
                  avatar: true,
                  isVerified: true,
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

    // Serialize BigInt fields in content
    const serializedContent = likes.map(like => ({
      ...like.content,
      viewCount: Number(like.content?.viewCount || 0),
      likeCount: Number(like.content?.likeCount || 0),
      commentCount: Number(like.content?.commentCount || 0),
      duration: like.content?.duration ? Number(like.content.duration) : null,
      fileSize: like.content?.fileSize ? Number(like.content.fileSize) : null,
    }));

    res.json({
      success: true,
      data: {
        content: serializedContent,
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
                  displayName: true,
                  avatar: true,
                  isVerified: true,
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

    // Serialize BigInt fields in content
    const serializedContent = views.map(view => ({
      ...view.content,
      viewCount: Number(view.content?.viewCount || 0),
      likeCount: Number(view.content?.likeCount || 0),
      commentCount: Number(view.content?.commentCount || 0),
      duration: view.content?.duration ? Number(view.content.duration) : null,
      fileSize: view.content?.fileSize ? Number(view.content.fileSize) : null,
      watchedAt: view.watchedAt,
      watchDuration: view.duration,
    }));

    res.json({
      success: true,
      data: {
        content: serializedContent,
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
 * DELETE /api/content/history
 * Clear user's watch history
 */
router.delete(
  '/history',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Delete all view records for this user
    const deleted = await prisma.view.deleteMany({
      where: { userId },
    });

    res.json({
      success: true,
      message: 'Watch history cleared successfully',
      data: {
        deletedCount: deleted.count,
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

    // Try to get from cache first
    let content = await getCachedContent(id);

    // If not in cache, fetch from database
    if (!content) {
      content = await prisma.content.findUnique({
        where: { id },
        include: {
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
    }

    // Type assertion for content with age restriction fields
    const contentData = content as any;

    // Check age restriction for age-restricted or NSFW content
    if (contentData.ageRestricted || contentData.isNSFW) {
      if (!userId) {
        throw new ForbiddenError(
          'This content is age-restricted. Please sign in and verify your age to access it.'
        );
      }

      // Verify user meets age requirement (18+)
      const ageVerification = await verifyUserAge(userId, 18);
      if (!ageVerification.allowed) {
        throw new ForbiddenError(
          ageVerification.reason || 'You must be 18 or older to view this content.'
        );
      }
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

    // Convert BigInt fields to Number for JSON serialization
    // Also handle nested creator object which may have BigInt totalViews
    const serializedCreator = contentData.creator ? {
      ...contentData.creator,
      totalViews: contentData.creator.totalViews ? Number(contentData.creator.totalViews) : 0,
    } : null;

    const serializedContent = {
      ...contentData,
      viewCount: Number(contentData.viewCount || 0),
      likeCount: Number(contentData.likeCount || 0),
      commentCount: Number(contentData.commentCount || 0),
      duration: contentData.duration ? Number(contentData.duration) : null,
      fileSize: contentData.fileSize ? Number(contentData.fileSize) : null,
      creator: serializedCreator,
      isLiked,
    };

    res.json({
      success: true,
      data: serializedContent,
    });
  })
);

// Schema for content update
const updateContentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  isPremium: z.boolean().optional(),
  quality: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
  thumbnail: z.string().url().optional(),
});

/**
 * PUT /api/content/:id
 * Update content details (creator only)
 * Allows updating title, description, premium status, quality, etc.
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  validateBody(updateContentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { title, description, isPremium, quality, isPublic, thumbnail } = req.body;

    // Find the content
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if the user is the creator
    if (content.creator.userId !== userId) {
      throw new ForbiddenError('You do not have permission to update this content');
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (isPremium !== undefined) updateData.isPremium = isPremium;
    if (quality !== undefined) updateData.quality = quality;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    if (thumbnail !== undefined) updateData.thumbnail = thumbnail;

    // Update the content
    const updatedContent = await prisma.content.update({
      where: { id },
      data: updateData,
      include: {
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
    });

    // Invalidate cache
    await invalidateContentCache(id);

    // Serialize BigInt fields to Numbers for JSON response
    res.json({
      success: true,
      data: {
        ...updatedContent,
        viewCount: Number(updatedContent.viewCount || 0),
        likeCount: Number(updatedContent.likeCount || 0),
        commentCount: Number(updatedContent.commentCount || 0),
        duration: updatedContent.duration ? Number(updatedContent.duration) : null,
        fileSize: updatedContent.fileSize ? Number(updatedContent.fileSize) : null,
      },
    });
  })
);

/**
 * DELETE /api/content/:id
 * Delete content and its associated files from cloud storage
 * Only the creator of the content can delete it
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Find the content
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if the user is the creator
    if (content.creator.userId !== userId) {
      throw new ForbiddenError('You do not have permission to delete this content');
    }

    // Extract file keys from URLs for deletion
    const filesToDelete: string[] = [];

    // Extract key from media URL
    if (content.mediaUrl) {
      const mediaKey = extractKeyFromUrl(content.mediaUrl);
      if (mediaKey) filesToDelete.push(mediaKey);
    }

    // Extract key from thumbnail URL
    if (content.thumbnail) {
      const thumbnailKey = extractKeyFromUrl(content.thumbnail);
      if (thumbnailKey) filesToDelete.push(thumbnailKey);
    }

    // Find playlists that contain this content to update their counts
    const playlistItems = await prisma.playlistItem.findMany({
      where: { contentId: id },
      select: { playlistId: true },
    });
    const playlistIds = [...new Set(playlistItems.map(item => item.playlistId))];

    // Delete associated records first (to maintain referential integrity)
    await prisma.$transaction([
      // Delete views
      prisma.view.deleteMany({ where: { contentId: id } }),
      // Delete likes
      prisma.like.deleteMany({ where: { contentId: id } }),
      // Delete comments
      prisma.comment.deleteMany({ where: { contentId: id } }),
      // Delete playlist items
      prisma.playlistItem.deleteMany({ where: { contentId: id } }),
      // Delete content tags
      prisma.contentTag.deleteMany({ where: { contentId: id } }),
      // Delete content categories
      prisma.contentCategory.deleteMany({ where: { contentId: id } }),
      // Delete downloads
      prisma.download.deleteMany({ where: { contentId: id } }),
      // Finally delete the content itself
      prisma.content.delete({ where: { id } }),
    ]);

    // Update playlist item counts
    if (playlistIds.length > 0) {
      await Promise.all(
        playlistIds.map(playlistId =>
          prisma.playlist.update({
            where: { id: playlistId },
            data: { itemCount: { decrement: 1 } },
          })
        )
      );
    }

    // Delete files from cloud storage (non-blocking)
    const deletePromises = filesToDelete.map(async (key) => {
      try {
        await s3Storage.deleteFile(key);
        console.log(`Deleted file from storage: ${key}`);
      } catch (error) {
        console.error(`Failed to delete file from storage: ${key}`, error);
      }
    });

    // Wait for all deletions but don't fail if some fail
    await Promise.allSettled(deletePromises);

    // Invalidate content cache
    await invalidateContentCache(id);

    // Update creator's content count
    await prisma.creator.update({
      where: { id: content.creatorId },
      data: {
        contentCount: { decrement: 1 },
      },
    });

    res.json({
      success: true,
      message: 'Content deleted successfully',
      data: {
        deletedFiles: filesToDelete.length,
      },
    });
  })
);

/**
 * Helper function to extract storage key from URL
 */
function extractKeyFromUrl(url: string): string | null {
  try {
    // Handle R2/S3 URLs
    // Format: https://pub-xxx.r2.dev/folder/filename.ext
    // Or: https://bucket.s3.region.amazonaws.com/folder/filename.ext
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Remove leading slash
    const key = pathname.startsWith('/') ? pathname.slice(1) : pathname;

    // Only return if it looks like a valid key
    if (key && key.includes('/')) {
      return key;
    }
    return null;
  } catch {
    return null;
  }
}

export default router;

