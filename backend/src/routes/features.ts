/**
 * Feature Flags API Routes
 * 
 * Endpoints for managing and checking feature flags
 */

import { Router, Request, Response } from 'express';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';
import {
  isFeatureEnabled,
  getFeatureFlag,
  getAllFeatureFlags,
  upsertFeatureFlag,
  deleteFeatureFlag,
  toggleFeatureFlag,
} from '../lib/features/featureFlagService';
import { z } from 'zod';
import logger from '../lib/logger';

const router = Router();

/**
 * GET /api/features/:key
 * Check if a feature flag is enabled for the current user
 */
router.get(
  '/:key',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const userId = req.user?.userId;
    const userRole = req.user?.role;

    const enabled = await isFeatureEnabled(key, userId, userRole);
    const flag = await getFeatureFlag(key);

    if (!flag) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'FEATURE_NOT_FOUND',
          message: `Feature flag "${key}" not found`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      data: {
        key: flag.key,
        name: flag.name,
        enabled,
        rolloutPercentage: flag.rolloutPercentage,
        targetUsers: flag.targetUsers,
        targetRoles: flag.targetRoles,
      },
    });
  })
);

/**
 * GET /api/features
 * Get all feature flags (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const enabledOnly = req.query.enabledOnly === 'true';
    const flags = await getAllFeatureFlags(enabledOnly);

    res.json({
      success: true,
      data: flags,
    });
  })
);

/**
 * POST /api/features
 * Create or update a feature flag (admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      key: z.string().min(1).max(100),
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      enabled: z.boolean().default(false),
      rolloutPercentage: z.number().min(0).max(100).default(0),
      targetUsers: z.array(z.string().uuid()).default([]),
      targetRoles: z.array(z.string()).default([]),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request', validationResult.error.errors);
    }

    const flag = await upsertFeatureFlag(validationResult.data);

    logger.info('Feature flag created/updated', {
      key: flag.key,
      enabled: flag.enabled,
      rolloutPercentage: flag.rolloutPercentage,
    });

    res.json({
      success: true,
      data: flag,
    });
  })
);

/**
 * PATCH /api/features/:key/toggle
 * Toggle a feature flag (admin only)
 */
router.patch(
  '/:key/toggle',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;
    const schema = z.object({
      enabled: z.boolean(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request', validationResult.error.errors);
    }

    const flag = await toggleFeatureFlag(key, validationResult.data.enabled);

    logger.info('Feature flag toggled', {
      key: flag.key,
      enabled: flag.enabled,
    });

    res.json({
      success: true,
      data: flag,
    });
  })
);

/**
 * DELETE /api/features/:key
 * Delete a feature flag (admin only)
 */
router.delete(
  '/:key',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { key } = req.params;

    await deleteFeatureFlag(key);

    logger.info('Feature flag deleted', { key });

    res.json({
      success: true,
      message: 'Feature flag deleted',
    });
  })
);

export default router;

