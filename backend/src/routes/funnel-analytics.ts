/**
 * Funnel Analytics API Routes
 * 
 * Endpoints for analyzing conversion funnels
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';
import {
  analyzeFunnel,
  analyzeMultipleFunnels,
  getFunnelDropoffSummary,
  compareFunnelPeriods,
  FUNNELS,
  FunnelName,
  DateRange,
} from '../lib/analytics/funnels';
import { z } from 'zod';

const router = Router();

/**
 * Date range validation schema
 */
const dateRangeSchema = z.object({
  start: z.string().transform((str) => new Date(str)),
  end: z.string().transform((str) => new Date(str)),
});

/**
 * GET /api/funnel-analytics/funnels
 * Get list of available funnels
 */
router.get(
  '/funnels',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const funnels = Object.keys(FUNNELS).map((name) => ({
      name,
      steps: FUNNELS[name as FunnelName],
      stepCount: FUNNELS[name as FunnelName].length,
    }));

    res.json({
      success: true,
      data: funnels,
    });
  })
);

/**
 * POST /api/funnel-analytics/analyze
 * Analyze a single funnel
 */
router.post(
  '/analyze',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      funnelName: z.enum(['signup', 'video_watch', 'creator_conversion', 'subscription', 'content_upload']),
      startDate: z.string(),
      endDate: z.string(),
      userId: z.string().optional(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request data', validationResult.error.errors);
    }

    const { funnelName, startDate, endDate, userId } = validationResult.data;

    const timeRange: DateRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };

    // Validate date range
    if (timeRange.start >= timeRange.end) {
      throw new ValidationError('Start date must be before end date');
    }

    // Limit date range to 90 days
    const maxDays = 90;
    const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      throw new ValidationError(`Date range cannot exceed ${maxDays} days`);
    }

    const analysis = await analyzeFunnel(funnelName, timeRange, userId);

    res.json({
      success: true,
      data: analysis,
    });
  })
);

/**
 * POST /api/funnel-analytics/analyze-multiple
 * Analyze multiple funnels at once
 */
router.post(
  '/analyze-multiple',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      funnelNames: z.array(z.enum(['signup', 'video_watch', 'creator_conversion', 'subscription', 'content_upload'])),
      startDate: z.string(),
      endDate: z.string(),
      userId: z.string().optional(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request data', validationResult.error.errors);
    }

    const { funnelNames, startDate, endDate, userId } = validationResult.data;

    const timeRange: DateRange = {
      start: new Date(startDate),
      end: new Date(endDate),
    };

    // Validate date range
    if (timeRange.start >= timeRange.end) {
      throw new ValidationError('Start date must be before end date');
    }

    // Limit date range to 90 days
    const maxDays = 90;
    const daysDiff = (timeRange.end.getTime() - timeRange.start.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff > maxDays) {
      throw new ValidationError(`Date range cannot exceed ${maxDays} days`);
    }

    const analyses = await analyzeMultipleFunnels(funnelNames, timeRange, userId);

    res.json({
      success: true,
      data: analyses,
    });
  })
);

/**
 * GET /api/funnel-analytics/summary/:funnelName
 * Get quick summary of funnel dropoff
 */
router.get(
  '/summary/:funnelName',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { funnelName } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      throw new ValidationError('startDate and endDate query parameters are required');
    }

    if (!['signup', 'video_watch', 'creator_conversion', 'subscription', 'content_upload'].includes(funnelName)) {
      throw new ValidationError('Invalid funnel name');
    }

    const timeRange: DateRange = {
      start: new Date(startDate as string),
      end: new Date(endDate as string),
    };

    // Validate date range
    if (timeRange.start >= timeRange.end) {
      throw new ValidationError('Start date must be before end date');
    }

    const summary = await getFunnelDropoffSummary(funnelName as FunnelName, timeRange);

    res.json({
      success: true,
      data: summary,
    });
  })
);

/**
 * POST /api/funnel-analytics/compare
 * Compare funnel performance across two time periods
 */
router.post(
  '/compare',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      funnelName: z.enum(['signup', 'video_watch', 'creator_conversion', 'subscription', 'content_upload']),
      period1Start: z.string(),
      period1End: z.string(),
      period2Start: z.string(),
      period2End: z.string(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request data', validationResult.error.errors);
    }

    const { funnelName, period1Start, period1End, period2Start, period2End } = validationResult.data;

    const period1: DateRange = {
      start: new Date(period1Start),
      end: new Date(period1End),
    };

    const period2: DateRange = {
      start: new Date(period2Start),
      end: new Date(period2End),
    };

    // Validate date ranges
    if (period1.start >= period1.end || period2.start >= period2.end) {
      throw new ValidationError('Start date must be before end date for both periods');
    }

    const comparison = await compareFunnelPeriods(funnelName, period1, period2);

    res.json({
      success: true,
      data: comparison,
    });
  })
);

export default router;


