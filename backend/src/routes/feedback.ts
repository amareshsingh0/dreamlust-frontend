/**
 * Feedback API Routes
 * 
 * Handles user feedback submission and management
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';
import logger from '../lib/logger';
import { z } from 'zod';

const router = Router();

/**
 * Feedback submission schema
 */
const feedbackSchema = z.object({
  type: z.enum(['bug_report', 'feature_request', 'general_feedback']),
  message: z.string().min(10).max(5000),
  screenshot: z.string().url().optional(),
  url: z.string().url().optional(),
  metadata: z.record(z.any()).optional(),
});

/**
 * POST /api/feedback
 * Submit user feedback
 */
router.post(
  '/',
  optionalAuth, // Allow anonymous feedback
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // Validate request body
    const validationResult = feedbackSchema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid feedback data', validationResult.error.errors);
    }

    const { type, message, screenshot, url, metadata } = validationResult.data;

    // Get user agent and additional context
    const userAgent = req.get('user-agent') || undefined;
    const currentUrl = url || req.get('referer') || undefined;

    // Collect metadata
    const feedbackMetadata = {
      ...metadata,
      browser: req.get('user-agent'),
      ip: req.ip,
      timestamp: new Date().toISOString(),
    };

    // Create feedback
    const feedback = await prisma.feedback.create({
      data: {
        userId: req.user?.userId || null,
        type,
        message,
        screenshot: screenshot || null,
        url: currentUrl,
        userAgent,
        status: 'new',
        metadata: feedbackMetadata,
      },
      select: {
        id: true,
        type: true,
        message: true,
        status: true,
        createdAt: true,
      },
    });

    logger.info('Feedback submitted', {
      feedbackId: feedback.id,
      type: feedback.type,
      userId: req.user?.userId || 'anonymous',
    });

    res.status(201).json({
      success: true,
      data: feedback,
      message: 'Thank you for your feedback!',
    });
  })
);

/**
 * GET /api/feedback
 * Get user's feedback (authenticated users only)
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { status, type, page = '1', limit = '20' } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where: any = {
      userId,
    };

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    // Get feedback
    const [feedback, total] = await Promise.all([
      prisma.feedback.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          type: true,
          message: true,
          screenshot: true,
          url: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.feedback.count({ where }),
    ]);

    res.json({
      success: true,
      data: feedback,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  })
);

/**
 * GET /api/feedback/:id
 * Get specific feedback (user's own feedback or admin)
 */
router.get(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const isAdmin = req.user!.role === 'ADMIN';

    const feedback = await prisma.feedback.findUnique({
      where: { id },
      select: {
        id: true,
        type: true,
        message: true,
        screenshot: true,
        url: true,
        status: true,
        userAgent: isAdmin,
        metadata: isAdmin,
        createdAt: true,
        updatedAt: true,
        user: isAdmin
          ? {
              select: {
                id: true,
                email: true,
                username: true,
                display_name: true,
              },
            }
          : false,
      },
    });

    if (!feedback) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Feedback not found',
        },
      });
    }

    // Check if user owns this feedback or is admin
    if (!isAdmin && feedback.userId !== userId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to view this feedback',
        },
      });
    }

    res.json({
      success: true,
      data: feedback,
    });
  })
);

/**
 * PATCH /api/feedback/:id/status
 * Update feedback status (admin only)
 */
router.patch(
  '/:id/status',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    if (req.user!.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin access required',
        },
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!['new', 'in_progress', 'resolved', "won't_fix"].includes(status)) {
      throw new ValidationError('Invalid status value');
    }

    const feedback = await prisma.feedback.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        status: true,
        updatedAt: true,
      },
    });

    logger.info('Feedback status updated', {
      feedbackId: id,
      status,
      updatedBy: req.user!.userId,
    });

    res.json({
      success: true,
      data: feedback,
    });
  })
);

export default router;


