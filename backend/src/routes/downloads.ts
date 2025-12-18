/**
 * Download Routes
 * Handles offline content downloads
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { validateBody, validateParams, validateQuery } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import {
  createDownload,
  getUserDownloads,
  updateDownloadProgress,
  cancelDownload,
  deleteDownload,
  getDownloadUrl,
} from '../lib/download/downloadService';
import { NotFoundError, ValidationError } from '../lib/errors';
import { queueDownload } from '../lib/queues/queueManager';

const router = Router();

/**
 * POST /api/downloads
 * Create a new download
 */
router.post(
  '/',
  authenticate,
  validateBody(
    z.object({
      contentId: z.string().uuid(),
      quality: z.enum(['auto', '1080p', '720p', '480p', '360p']).optional(),
      expiresInDays: z.number().int().min(1).max(90).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contentId, quality, expiresInDays } = req.body;

    const download = await createDownload(userId, contentId, {
      quality,
      expiresInDays,
    });

    res.status(201).json({
      success: true,
      data: download,
      message: 'Download started',
    });
  })
);

/**
 * GET /api/downloads
 * Get user's downloads
 */
router.get(
  '/',
  authenticate,
  validateQuery(
    z.object({
      status: z.enum(['pending', 'downloading', 'completed', 'failed', 'expired', 'cancelled']).optional(),
      page: z.string().transform(Number).default('1'),
      limit: z.string().transform(Number).default('20'),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { status, page, limit } = req.query as {
      status?: string;
      page: number;
      limit: number;
    };

    const result = await getUserDownloads(userId, status, page, limit);

    res.json({
      success: true,
      data: result.downloads,
      pagination: result.pagination,
    });
  })
);

/**
 * GET /api/downloads/:id
 * Get download details
 */
router.get(
  '/:id',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const download = await prisma.download.findUnique({
      where: { id },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            duration: true,
            creator: {
              select: {
                display_name: true,
                handle: true,
              },
            },
          },
        },
      },
    });

    if (!download) {
      throw new NotFoundError('Download not found');
    }

    if (download.userId !== userId) {
      throw new ValidationError('Unauthorized');
    }

    res.json({
      success: true,
      data: download,
    });
  })
);

/**
 * GET /api/downloads/:id/url
 * Get download URL for playback
 */
router.get(
  '/:id/url',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    const url = await getDownloadUrl(id, userId);

    res.json({
      success: true,
      data: { url },
    });
  })
);

/**
 * PATCH /api/downloads/:id/progress
 * Update download progress (internal use by workers)
 */
router.patch(
  '/:id/progress',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  validateBody(
    z.object({
      progress: z.number().int().min(0).max(100),
      status: z.enum(['downloading', 'completed', 'failed']).optional(),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { progress, status } = req.body;

    // In production, this would verify the request is from a worker
    // For now, we'll allow authenticated users (should be restricted)

    await updateDownloadProgress(id, progress, status);

    res.json({
      success: true,
      message: 'Progress updated',
    });
  })
);

/**
 * DELETE /api/downloads/:id
 * Cancel or delete a download
 */
router.delete(
  '/:id',
  authenticate,
  validateParams(z.object({ id: z.string().uuid() })),
  validateQuery(
    z.object({
      action: z.enum(['cancel', 'delete']).default('cancel'),
    })
  ),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { action } = req.query as { action: 'cancel' | 'delete' };

    if (action === 'delete') {
      await deleteDownload(id, userId);
      res.json({
        success: true,
        message: 'Download deleted',
      });
    } else {
      await cancelDownload(id, userId);
      res.json({
        success: true,
        message: 'Download cancelled',
      });
    }
  })
);

export default router;

