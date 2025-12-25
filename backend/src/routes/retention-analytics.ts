/**
 * Retention Analytics Routes
 * Handles retention campaign tracking and analytics
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError } from '../lib/errors';
import {
  calculateRetentionMetrics,
  markEmailOpened,
  markUserReturned,
  getMetricsByCampaignType,
} from '../lib/analytics/retentionAnalytics';

const router = Router();

/**
 * GET /api/retention-analytics/metrics
 * Get retention campaign metrics
 */
router.get(
  '/metrics',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Check if user is admin

    const { startDate, endDate } = req.query;

    const metrics = await calculateRetentionMetrics(
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    res.json({
      success: true,
      data: metrics,
    });
  })
);

/**
 * GET /api/retention-analytics/metrics-by-type
 * Get metrics grouped by campaign type
 */
router.get(
  '/metrics-by-type',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Check if user is admin

    const metrics = await getMetricsByCampaignType();

    res.json({
      success: true,
      data: metrics,
    });
  })
);

/**
 * POST /api/retention-analytics/email-opened
 * Mark email as opened (tracking pixel)
 */
router.post(
  '/email-opened/:campaignId',
  asyncHandler(async (req: Request, res: Response) => {
    const { campaignId } = req.params;

    await markEmailOpened(campaignId);

    // Return 1x1 transparent pixel
    const pixel = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );

    res.setHeader('Content-Type', 'image/gif');
    res.setHeader('Content-Length', pixel.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pixel);
  })
);

/**
 * POST /api/retention-analytics/user-returned
 * Mark user as returned (called on login/view)
 */
router.post(
  '/user-returned',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    await markUserReturned(userId);

    res.json({
      success: true,
      message: 'User return tracked',
    });
  })
);

export default router;


