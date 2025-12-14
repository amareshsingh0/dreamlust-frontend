import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';

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
        where: { userId },
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
 * GET /api/content/:id
 * Get content details
 */
router.get(
  '/:id',
  optionalAuth,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;

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

    res.json({
      success: true,
      data: content,
    });
  }
);

export default router;

