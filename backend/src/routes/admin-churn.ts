/**
 * Admin Churn Prediction Routes
 * Admin dashboard for churn prediction and management
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError } from '../lib/errors';
import { getChurnPredictions } from '../lib/subscriptions/churnPrediction';
import { calculateRetentionMetrics, getMetricsByCampaignType } from '../lib/analytics/retentionAnalytics';
import { prisma } from '../lib/prisma';

const router = Router();

/**
 * GET /api/admin/churn/predictions
 * Get all churn predictions
 */
router.get(
  '/predictions',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Check if user is admin

    const { limit = 50 } = req.query;

    const predictions = await getChurnPredictions(Number(limit));

    res.json({
      success: true,
      data: predictions,
    });
  })
);

/**
 * GET /api/admin/churn/retention-metrics
 * Get retention campaign metrics
 */
router.get(
  '/retention-metrics',
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
 * GET /api/admin/churn/retention-by-type
 * Get retention metrics by campaign type
 */
router.get(
  '/retention-by-type',
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
 * GET /api/admin/churn/campaigns
 * Get all retention campaigns
 */
router.get(
  '/campaigns',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Check if user is admin

    const { limit = 100, offset = 0 } = req.query;

    const campaigns = await prisma.retentionCampaign.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
      skip: Number(offset),
    });

    res.json({
      success: true,
      data: campaigns,
    });
  })
);

export default router;


