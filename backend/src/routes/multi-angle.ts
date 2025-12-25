/**
 * Multi-Angle Content Routes
 * Handles multi-camera and angle selection for content
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError } from '../lib/errors';
import { requireAdminOrCreator } from '../middleware/admin';

const router = Router();

/**
 * GET /api/multi-angle/:contentId
 * Get multi-angle configuration for content
 */
router.get(
  '/:contentId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const multiAngle = await prisma.multiAngleContent.findUnique({
      where: { contentId },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    if (!multiAngle) {
      return res.json({
        success: true,
        data: null,
      });
    }

    res.json({
      success: true,
      data: multiAngle,
    });
  })
);

/**
 * POST /api/multi-angle
 * Create multi-angle configuration (creator/admin only)
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId, mainAngle, alternateAngles, allowSwitching } = req.body;

    if (!contentId || !mainAngle) {
      throw new BadRequestError('contentId and mainAngle are required');
    }

    if (!Array.isArray(alternateAngles)) {
      throw new BadRequestError('alternateAngles must be an array');
    }

    // Validate alternate angles structure
    for (const angle of alternateAngles) {
      if (!angle.name || !angle.url) {
        throw new BadRequestError('Each alternate angle must have name and url');
      }
      if (angle.syncOffset === undefined) {
        angle.syncOffset = 0; // Default sync offset
      }
    }

    // Check if content exists and user has permission
    const content = await prisma.content.findUnique({
      where: { id: contentId },
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

    // Check if user is creator or admin
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      select: { role: true, status: true },
    });
    
    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedError('Account is not active');
    }
    
    if (content.creator.userId !== req.user!.userId && user.role !== 'ADMIN') {
      throw new ForbiddenError('You do not have permission to modify this content');
    }

    const multiAngle = await prisma.multiAngleContent.upsert({
      where: { contentId },
      create: {
        contentId,
        mainAngle,
        alternateAngles,
        allowSwitching: allowSwitching !== undefined ? allowSwitching : true,
      },
      update: {
        mainAngle,
        alternateAngles,
        allowSwitching: allowSwitching !== undefined ? allowSwitching : true,
      },
    });

    res.status(201).json({
      success: true,
      data: multiAngle,
    });
  })
);

/**
 * PUT /api/multi-angle/:contentId
 * Update multi-angle configuration (creator/admin only)
 */
router.put(
  '/:contentId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const { mainAngle, alternateAngles, allowSwitching } = req.body;

    const existing = await prisma.multiAngleContent.findUnique({
      where: { contentId },
      include: {
        content: {
          include: {
            creator: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Multi-angle configuration not found');
    }

    // Check if user is creator or admin
    if (existing.content.creator.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new UnauthorizedError('You do not have permission to modify this content');
    }

    // Validate alternate angles if provided
    if (alternateAngles && Array.isArray(alternateAngles)) {
      for (const angle of alternateAngles) {
        if (!angle.name || !angle.url) {
          throw new BadRequestError('Each alternate angle must have name and url');
        }
        if (angle.syncOffset === undefined) {
          angle.syncOffset = 0;
        }
      }
    }

    const updated = await prisma.multiAngleContent.update({
      where: { contentId },
      data: {
        ...(mainAngle && { mainAngle }),
        ...(alternateAngles && { alternateAngles }),
        ...(allowSwitching !== undefined && { allowSwitching }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/multi-angle/:contentId
 * Delete multi-angle configuration (creator/admin only)
 */
router.delete(
  '/:contentId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    const existing = await prisma.multiAngleContent.findUnique({
      where: { contentId },
      include: {
        content: {
          include: {
            creator: {
              select: {
                id: true,
                userId: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundError('Multi-angle configuration not found');
    }

    // Check if user is creator or admin
    if (existing.content.creator.userId !== req.user!.userId && req.user!.role !== 'ADMIN') {
      throw new UnauthorizedError('You do not have permission to modify this content');
    }

    await prisma.multiAngleContent.delete({
      where: { contentId },
    });

    res.json({
      success: true,
      message: 'Multi-angle configuration deleted',
    });
  })
);

export default router;

