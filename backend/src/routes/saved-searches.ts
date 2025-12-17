/**
 * Saved Searches API Routes
 * 
 * Manage saved searches for users
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';
import { z } from 'zod';
import logger from '../lib/logger';

const router = Router();

/**
 * GET /api/saved-searches
 * Get all saved searches for the current user
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const savedSearches = await prisma.savedSearch.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: savedSearches,
    });
  })
);

/**
 * POST /api/saved-searches
 * Create a new saved search
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      query: z.string().min(1),
      filters: z.record(z.unknown()).optional().default({}),
      name: z.string().optional(),
      notifyOnNew: z.boolean().default(false),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request', validationResult.error.errors);
    }

    const userId = req.user?.userId;
    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const savedSearch = await prisma.savedSearch.create({
      data: {
        userId,
        query: validationResult.data.query,
        filters: validationResult.data.filters as any,
        name: validationResult.data.name,
        notifyOnNew: validationResult.data.notifyOnNew,
      },
    });

    logger.info('Saved search created', {
      userId,
      savedSearchId: savedSearch.id,
      query: savedSearch.query,
    });

    res.status(201).json({
      success: true,
      data: savedSearch,
    });
  })
);

/**
 * PUT /api/saved-searches/:id
 * Update a saved search
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().optional(),
      notifyOnNew: z.boolean().optional(),
      filters: z.record(z.unknown()).optional(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request', validationResult.error.errors);
    }

    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    // Verify ownership
    const existing = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError('Saved search not found');
    }

    if (existing.userId !== userId) {
      throw new ValidationError('Unauthorized');
    }

    const updated = await prisma.savedSearch.update({
      where: { id },
      data: {
        name: validationResult.data.name,
        notifyOnNew: validationResult.data.notifyOnNew,
        filters: validationResult.data.filters as any,
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/saved-searches/:id
 * Delete a saved search
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    // Verify ownership
    const existing = await prisma.savedSearch.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new ValidationError('Saved search not found');
    }

    if (existing.userId !== userId) {
      throw new ValidationError('Unauthorized');
    }

    await prisma.savedSearch.delete({
      where: { id },
    });

    logger.info('Saved search deleted', {
      userId,
      savedSearchId: id,
    });

    res.json({
      success: true,
      message: 'Saved search deleted',
    });
  })
);

export default router;

