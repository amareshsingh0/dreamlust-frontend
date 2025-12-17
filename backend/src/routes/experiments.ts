/**
 * A/B Testing Experiments API Routes
 * 
 * Endpoints for managing experiments and variant assignments
 */

import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { requireAdmin } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { ValidationError } from '../lib/errors';
import {
  createExperiment,
  assignVariant,
  getUserVariant,
  startExperiment,
  pauseExperiment,
  completeExperiment,
  analyzeExperimentResults,
  getActiveExperiments,
  getExperiment,
  getAllExperiments,
  trackExperimentMetric,
  ExperimentConfig,
} from '../lib/experiments/experimentService';
import { z } from 'zod';
import logger from '../lib/logger';

const router = Router();

/**
 * POST /api/experiments
 * Create a new experiment (admin only)
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      name: z.string().min(1).max(200),
      description: z.string().optional(),
      hypothesis: z.string().min(1),
      variants: z.array(
        z.object({
          name: z.string().min(1),
          weight: z.number().min(0).max(100),
        })
      ),
      metrics: z.array(z.string()),
      startDate: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
      endDate: z.string().optional().transform((str) => (str ? new Date(str) : undefined)),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid experiment data', validationResult.error.errors);
    }

    const config: ExperimentConfig = validationResult.data;
    const experiment = await createExperiment(config);

    res.json({
      success: true,
      data: experiment,
    });
  })
);

/**
 * GET /api/experiments
 * Get all experiments (admin only)
 */
router.get(
  '/',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { status, page, limit } = req.query;
    const result = await getAllExperiments({
      status: status as string | undefined,
      page: page ? parseInt(page as string, 10) : undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json({
      success: true,
      data: result.experiments,
      pagination: result.pagination,
    });
  })
);

/**
 * GET /api/experiments/active
 * Get all active experiments (for variant assignment)
 */
router.get(
  '/active',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const experiments = await getActiveExperiments();
    res.json({
      success: true,
      data: experiments,
    });
  })
);

/**
 * GET /api/experiments/:id
 * Get experiment by ID
 */
router.get(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const experiment = await getExperiment(id);

    if (!experiment) {
      throw new ValidationError('Experiment not found');
    }

    res.json({
      success: true,
      data: experiment,
    });
  })
);

/**
 * POST /api/experiments/assign
 * Assign user to experiment variant by name (or get existing assignment)
 * Accepts experiment name in body: { experiment: "experiment_name" }
 */
router.post(
  '/assign',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      experiment: z.string().min(1),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request', validationResult.error.errors);
    }

    const { experiment: experimentName } = validationResult.data;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    // Find experiment by name
    const { getExperimentByName } = await import('../lib/experiments/experimentService');
    const experiment = await getExperimentByName(experimentName);

    if (!experiment) {
      throw new ValidationError(`Experiment "${experimentName}" not found or not running`);
    }

    const variant = await assignVariant(userId, experiment.id);

    res.json({
      success: true,
      data: {
        experiment: experimentName,
        experimentId: experiment.id,
        variant,
      },
    });
  })
);

/**
 * POST /api/experiments/:id/assign
 * Assign user to experiment variant (or get existing assignment)
 */
router.post(
  '/:id/assign',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const variant = await assignVariant(userId, id);

    res.json({
      success: true,
      data: {
        experimentId: id,
        variant,
      },
    });
  })
);

/**
 * GET /api/experiments/:id/variant
 * Get user's assigned variant for an experiment
 */
router.get(
  '/:id/variant',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    const variant = await getUserVariant(userId, id);

    res.json({
      success: true,
      data: {
        experimentId: id,
        variant,
      },
    });
  })
);

/**
 * POST /api/experiments/:id/start
 * Start an experiment (admin only)
 */
router.post(
  '/:id/start',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const experiment = await startExperiment(id);

    res.json({
      success: true,
      data: experiment,
    });
  })
);

/**
 * POST /api/experiments/:id/pause
 * Pause an experiment (admin only)
 */
router.post(
  '/:id/pause',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const experiment = await pauseExperiment(id);

    res.json({
      success: true,
      data: experiment,
    });
  })
);

/**
 * POST /api/experiments/:id/complete
 * Complete an experiment and analyze results (admin only)
 */
router.post(
  '/:id/complete',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { analyzeResults } = req.body;
    const experiment = await completeExperiment(id, analyzeResults !== false);

    res.json({
      success: true,
      data: experiment,
    });
  })
);

/**
 * GET /api/experiments/:id/results
 * Get experiment results (admin only)
 */
router.get(
  '/:id/results',
  authenticate,
  requireAdmin,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const results = await analyzeExperimentResults(id);

    res.json({
      success: true,
      data: results,
    });
  })
);

/**
 * POST /api/experiments/track
 * Track experiment metric
 */
router.post(
  '/track',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const schema = z.object({
      experiment: z.string().min(1),
      metric: z.string().min(1),
      value: z.number(),
    });

    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      throw new ValidationError('Invalid request', validationResult.error.errors);
    }

    const { experiment: experimentName, metric, value } = validationResult.data;
    const userId = req.user?.userId;

    if (!userId) {
      throw new ValidationError('User ID required');
    }

    await trackExperimentMetric(userId, experimentName, metric, value);

    res.json({
      success: true,
      message: 'Metric tracked',
    });
  })
);

export default router;

