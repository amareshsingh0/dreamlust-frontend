/**
 * Advanced Creator Tools Routes
 * Content Scheduler, Bulk Upload, A/B Testing, Collaboration
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCreator } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import {
  scheduleContent,
  cancelScheduledContent,
  getScheduledContentToPublish,
} from '../lib/creator/schedulerService';
import {
  createThumbnailTest,
  getThumbnail,
  trackThumbnailClick,
} from '../lib/creator/thumbnailTestService';
import {
  createCollaboration,
  getCollaboration,
  addCollaborator,
  updateCollaborator,
  removeCollaborator,
} from '../lib/creator/collaborationService';
import { NotFoundError, UnauthorizedError } from '../lib/errors';

const router = Router();

// ============================================================================
// CONTENT SCHEDULER
// ============================================================================

const scheduleContentSchema = z.object({
  contentId: z.string().uuid(),
  publishAt: z.string().datetime(),
  notifyFollowers: z.boolean().optional().default(true),
  socialMediaCrosspost: z.object({
    twitter: z.boolean().optional(),
    instagram: z.boolean().optional(),
  }).optional(),
});

/**
 * POST /api/creator-tools/schedule
 * Schedule content for future publication
 */
router.post(
  '/schedule',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(scheduleContentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { contentId, publishAt, notifyFollowers, socialMediaCrosspost } = req.body;

    // Verify user owns the content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: {
          select: { user_id: true },
        },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    if (content.creator.user_id !== userId) {
      throw new UnauthorizedError('Only content owner can schedule content');
    }

    const scheduled = await scheduleContent({
      contentId,
      publishAt: new Date(publishAt),
      notifyFollowers,
      socialMediaCrosspost,
    });

    res.json({
      success: true,
      data: scheduled,
    });
  })
);

/**
 * DELETE /api/creator-tools/schedule/:contentId
 * Cancel scheduled content
 */
router.delete(
  '/schedule/:contentId',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user owns the content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: {
          select: { user_id: true },
        },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    if (content.creator.user_id !== userId) {
      throw new UnauthorizedError('Only content owner can cancel scheduled content');
    }

    await cancelScheduledContent(contentId);

    res.json({
      success: true,
      message: 'Scheduled content cancelled',
    });
  })
);

/**
 * GET /api/creator-tools/scheduled
 * Get user's scheduled content
 */
router.get(
  '/scheduled',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get creator ID
    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new UnauthorizedError('Creator profile not found');
    }

    const scheduled = await prisma.scheduledContent.findMany({
      where: {
        content: {
          creatorId: creator.id,
        },
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            status: true,
          },
        },
      },
      orderBy: {
        publishAt: 'asc',
      },
    });

    res.json({
      success: true,
      data: scheduled,
    });
  })
);

// ============================================================================
// THUMBNAIL A/B TESTING
// ============================================================================

const createThumbnailTestSchema = z.object({
  contentId: z.string().uuid(),
  variants: z.array(z.object({
    url: z.string().url(),
  })).min(2).max(5),
});

/**
 * POST /api/creator-tools/thumbnail-test
 * Create thumbnail A/B test
 */
router.post(
  '/thumbnail-test',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(createThumbnailTestSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId, variants } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Verify user owns the content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        creator: {
          select: { user_id: true },
        },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    if (content.creator.user_id !== userId) {
      throw new UnauthorizedError('Only content owner can create thumbnail tests');
    }

    const test = await createThumbnailTest({ contentId, variants });

    res.json({
      success: true,
      data: test,
    });
  })
);

/**
 * GET /api/creator-tools/thumbnail-test/:contentId
 * Get thumbnail test results
 */
router.get(
  '/thumbnail-test/:contentId',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const test = await prisma.thumbnailTest.findUnique({
      where: { contentId },
    });

    if (!test) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: test,
    });
  })
);

/**
 * POST /api/creator-tools/thumbnail-click
 * Track thumbnail click for A/B testing
 */
router.post(
  '/thumbnail-click',
  optionalAuth,
  userRateLimiter,
  validateBody(z.object({
    contentId: z.string().uuid(),
    thumbnailUrl: z.string().url(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId, thumbnailUrl } = req.body;

    await trackThumbnailClick(contentId, thumbnailUrl);

    res.json({
      success: true,
      message: 'Click tracked',
    });
  })
);

// ============================================================================
// COLLABORATION
// ============================================================================

const createCollaborationSchema = z.object({
  contentId: z.string().uuid(),
  collaborators: z.array(z.object({
    userId: z.string().uuid(),
    role: z.enum(['editor', 'viewer']),
    permissions: z.array(z.string()).optional().default([]),
  })),
});

/**
 * POST /api/creator-tools/collaboration
 * Create or update collaboration
 */
router.post(
  '/collaboration',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(createCollaborationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId, collaborators } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const collaboration = await createCollaboration({
      contentId,
      ownerId: userId,
      collaborators,
    });

    res.json({
      success: true,
      data: collaboration,
    });
  })
);

/**
 * GET /api/creator-tools/collaboration/:contentId
 * Get collaboration for content
 */
router.get(
  '/collaboration/:contentId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const collaboration = await getCollaboration(contentId);

    res.json({
      success: true,
      data: collaboration,
    });
  })
);

/**
 * POST /api/creator-tools/collaboration/:contentId/add
 * Add collaborator
 */
router.post(
  '/collaboration/:contentId/add',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(z.object({
    userId: z.string().uuid(),
    role: z.enum(['editor', 'viewer']),
    permissions: z.array(z.string()).optional().default([]),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId } = req.params;
    const { userId: collaboratorUserId, role, permissions } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await addCollaborator(contentId, userId, {
      userId: collaboratorUserId,
      role,
      permissions: permissions || [],
    });

    res.json({
      success: true,
      message: 'Collaborator added',
    });
  })
);

/**
 * PATCH /api/creator-tools/collaboration/:contentId/update
 * Update collaborator role
 */
router.patch(
  '/collaboration/:contentId/update',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(z.object({
    userId: z.string().uuid(),
    role: z.enum(['editor', 'viewer']),
    permissions: z.array(z.string()).optional(),
  })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId } = req.params;
    const { userId: collaboratorUserId, role, permissions } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await updateCollaborator(contentId, userId, collaboratorUserId, role, permissions);

    res.json({
      success: true,
      message: 'Collaborator updated',
    });
  })
);

/**
 * DELETE /api/creator-tools/collaboration/:contentId/remove/:userId
 * Remove collaborator
 */
router.delete(
  '/collaboration/:contentId/remove/:userId',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { contentId, userId: collaboratorUserId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    await removeCollaborator(contentId, userId, collaboratorUserId);

    res.json({
      success: true,
      message: 'Collaborator removed',
    });
  })
);

import { optionalAuth } from '../middleware/auth';
import multer from 'multer';

// Configure multer for bulk uploads
const bulkUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB max per file
    files: 10, // Max 10 files at once
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed for bulk upload'));
    }
  },
});

// ============================================================================
// BULK UPLOAD
// ============================================================================

/**
 * POST /api/creator-tools/bulk-upload
 * Upload multiple videos at once
 */
router.post(
  '/bulk-upload',
  authenticate,
  requireCreator,
  userRateLimiter,
  bulkUpload.array('videos', 10),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No files uploaded',
      });
    }

    // Get creator
    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new UnauthorizedError('Creator profile not found');
    }

    // Process each file (in production, this would be queued)
    const uploads = await Promise.all(
      files.map(async (file) => {
        try {
          // Generate unique filename
          const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.originalname}`;
          
          // Upload to storage (simplified - in production would use queue)
          const { s3Storage } = await import('../lib/storage/s3Storage');
          const uploadResult = await s3Storage.uploadFile(
            file.buffer,
            filename,
            'content'
          );

          // Create content record (draft status, user will fill in details)
          const content = await prisma.content.create({
            data: {
              creatorId: creator.id,
              title: file.originalname.replace(/\.[^/.]+$/, ''), // Remove extension
              description: null,
              type: 'VIDEO',
              status: 'DRAFT',
              thumbnail: null,
              mediaUrl: uploadResult.cdnUrl || uploadResult.url,
              mediaType: file.mimetype,
              fileSize: BigInt(file.size),
            },
          });

          return {
            id: content.id,
            filename: file.originalname,
            title: content.title,
            status: 'uploaded',
            contentId: content.id,
            thumbnail: null,
            progress: 100,
          };
        } catch (error: any) {
          return {
            id: `error-${Date.now()}`,
            filename: file.originalname,
            title: file.originalname,
            status: 'error',
            error: error.message,
            progress: 0,
          };
        }
      })
    );

    res.json({
      success: true,
      data: uploads,
    });
  })
);

export default router;

