/**
 * Funnel Analysis Routes
 * Handles funnel creation, analysis, and visualization
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { BadRequestError, NotFoundError, UnauthorizedError } from '../lib/errors';
import {
  analyzeFunnel,
  analyzeFunnelBySegment,
} from '../lib/analytics/funnelAnalysis';
import type { FunnelStep } from '../lib/analytics/funnelAnalysis';
import { FUNNEL_TEMPLATES, createFunnelFromTemplate } from '../lib/analytics/funnelTemplates';

const router = Router();

/**
 * GET /api/funnels/templates
 * Get available funnel templates
 */
router.get(
  '/templates',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: FUNNEL_TEMPLATES.map(t => ({
        name: t.name,
        description: t.description,
        template: t.template,
        steps: t.steps,
      })),
    });
  })
);

/**
 * POST /api/funnels/from-template
 * Create a funnel from a template
 */
router.post(
  '/from-template',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { templateName, variant } = req.body;
    const userId = req.user?.userId;

    if (!templateName) {
      throw new BadRequestError('Template name is required');
    }

    const funnelData = createFunnelFromTemplate(templateName, userId!, variant);

    if (!funnelData) {
      throw new NotFoundError(`Template "${templateName}" not found`);
    }

    const funnel = await prisma.funnel.create({
      data: {
        name: funnelData.name,
        description: funnelData.description,
        steps: funnelData.steps as any, // Prisma Json type
        createdBy: userId!,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: funnel,
    });
  })
);

/**
 * GET /api/funnels
 * Get all funnels
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Check if user is admin

    const funnels = await prisma.funnel.findMany({
      where: {
        createdBy: req.user!.userId,
      },
      include: {
        _count: {
          select: { results: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: funnels.map(f => ({
        id: f.id,
        name: f.name,
        description: f.description,
        steps: f.steps,
        isActive: f.isActive,
        resultsCount: f._count.results,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
      })),
    });
  })
);

/**
 * GET /api/funnels/:id
 * Get funnel details
 */
router.get(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const funnel = await prisma.funnel.findUnique({
      where: { id },
      include: {
        results: {
          orderBy: [{ stepIndex: 'asc' }, { date: 'desc' }],
          take: 100, // Get latest results
        },
      },
    });

    if (!funnel) {
      throw new NotFoundError('Funnel not found');
    }

    res.json({
      success: true,
      data: funnel,
    });
  })
);

/**
 * POST /api/funnels
 * Create a new funnel
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, description, steps } = req.body;

    if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
      throw new BadRequestError('Name and at least one step are required');
    }

    // Validate steps
    for (const step of steps) {
      if (!step.event) {
        throw new BadRequestError('Each step must have an event name');
      }
    }

    const funnel = await prisma.funnel.create({
      data: {
        name,
        description: description || null,
        steps: steps as any, // Prisma Json type
        createdBy: req.user!.userId,
      },
    });

    res.json({
      success: true,
      data: funnel,
    });
  })
);

/**
 * PUT /api/funnels/:id
 * Update funnel
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, steps, isActive } = req.body;

    const funnel = await prisma.funnel.findUnique({
      where: { id },
    });

    if (!funnel) {
      throw new NotFoundError('Funnel not found');
    }

    if (funnel.createdBy !== req.user!.userId) {
      throw new BadRequestError('You can only update your own funnels');
    }

    // Validate steps if provided
    if (steps && Array.isArray(steps)) {
      for (const step of steps) {
        if (!step.event) {
          throw new BadRequestError('Each step must have an event name');
        }
      }
    }

    const updated = await prisma.funnel.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(steps && { steps: steps as FunnelStep[] }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/funnels/:id
 * Delete funnel
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const funnel = await prisma.funnel.findUnique({
      where: { id },
    });

    if (!funnel) {
      throw new NotFoundError('Funnel not found');
    }

    if (funnel.createdBy !== req.user!.userId) {
      throw new BadRequestError('You can only delete your own funnels');
    }

    await prisma.funnel.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Funnel deleted',
    });
  })
);

/**
 * POST /api/funnels/:id/analyze
 * Analyze funnel
 */
router.post(
  '/:id/analyze',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.body;

    const dateRange = startDate && endDate
      ? { start: new Date(startDate), end: new Date(endDate) }
      : undefined;

    if (!id) {
      throw new BadRequestError('Funnel ID is required');
    }
    const results = await analyzeFunnel(id, dateRange);

    res.json({
      success: true,
      data: results,
    });
  })
);

/**
 * POST /api/funnels/:id/analyze-segments
 * Analyze funnel by segments
 */
router.post(
  '/:id/analyze-segments',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { segments } = req.body;

    if (!id) {
      throw new BadRequestError('Funnel ID is required');
    }
    
    const segmentResults = await analyzeFunnelBySegment(
      id,
      segments || ['all', 'newUsers', 'returning', 'premium']
    );

    res.json({
      success: true,
      data: segmentResults,
    });
  })
);

/**
 * GET /api/funnels/templates
 * Get available funnel templates
 */
router.get(
  '/templates',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    res.json({
      success: true,
      data: FUNNEL_TEMPLATES.map(t => ({
        name: t.name,
        description: t.description,
        template: t.template,
        steps: t.steps,
      })),
    });
  })
);

/**
 * POST /api/funnels/from-template
 * Create a funnel from a template
 */
router.post(
  '/from-template',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { templateName, variant } = req.body;
    const userId = req.user?.userId;

    if (!templateName) {
      throw new BadRequestError('Template name is required');
    }

    const funnelData = createFunnelFromTemplate(templateName, userId!, variant);

    if (!funnelData) {
      throw new NotFoundError(`Template "${templateName}" not found`);
    }

    const funnel = await prisma.funnel.create({
      data: {
        name: funnelData.name,
        description: funnelData.description,
        steps: funnelData.steps as any, // Prisma Json type
        createdBy: userId!,
        isActive: true,
      },
    });

    res.status(201).json({
      success: true,
      data: funnel,
    });
  })
);

/**
 * GET /api/funnels/:id/export
 * Export funnel data as CSV
 */
router.get(
  '/:id/export',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const funnel = await prisma.funnel.findUnique({
      where: { id, createdBy: userId },
    });

    if (!funnel) {
      throw new NotFoundError('Funnel not found.');
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    // Get funnel results
    const results = await prisma.funnelResult.findMany({
      where: {
        funnelId: id,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: [
        { date: 'asc' },
        { stepIndex: 'asc' },
      ],
    });

    // Generate CSV
    const csvRows: string[] = [];
    csvRows.push('Date,Step Index,Step Name,Event Name,User Count,Conversion Rate,Dropoff Rate,Segment');

    results.forEach(result => {
      csvRows.push(
        `${result.date.toISOString()},${result.stepIndex},${result.stepName},${result.eventName},${result.userCount},${Number(result.conversionRate).toFixed(4)},${result.dropoffRate ? Number(result.dropoffRate).toFixed(4) : ''},${result.segment || 'all'}`
      );
    });

    const csv = csvRows.join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="funnel-${funnel.name}-${Date.now()}.csv"`);
    res.send(csv);
  })
);

/**
 * GET /api/funnels/:id/trends
 * Get historical trend analysis for a funnel
 */
router.get(
  '/:id/trends',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { days = 30 } = req.query;

    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('User not authenticated');
    }

    const funnel = await prisma.funnel.findUnique({
      where: { id, createdBy: userId },
    });

    if (!funnel) {
      throw new NotFoundError('Funnel not found.');
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - Number(days));

    // Get daily results
    const results = await prisma.funnelResult.findMany({
      where: {
        funnelId: id,
        date: {
          gte: startDate,
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date and calculate trends
    const dailyData: Record<string, {
      date: string;
      totalUsers: number;
      conversionRate: number;
      dropoffRate: number;
      steps: Array<{
        stepIndex: number;
        stepName: string;
        userCount: number;
        conversionRate: number;
        dropoffRate: number | null;
      }>;
    }> = {};

    results.forEach(result => {
      const dateKey = result.date.toISOString().split('T')[0];
      if (!dateKey) return;
      
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          totalUsers: 0,
          conversionRate: 0,
          dropoffRate: 0,
          steps: [],
        };
      }

      dailyData[dateKey]!.steps.push({
        stepIndex: result.stepIndex,
        stepName: result.stepName,
        userCount: result.userCount,
        conversionRate: Number(result.conversionRate),
        dropoffRate: result.dropoffRate ? Number(result.dropoffRate) : null,
      });

      // Get total users from first step
      if (result.stepIndex === 0) {
        dailyData[dateKey]!.totalUsers = result.userCount;
      }

      // Get final conversion rate from last step
      const lastStep = Math.max(...dailyData[dateKey]!.steps.map((s: { stepIndex: number }) => s.stepIndex));
      if (result.stepIndex === lastStep) {
        dailyData[dateKey]!.conversionRate = Number(result.conversionRate);
      }
    });

    const trendData = Object.values(dailyData).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    res.json({
      success: true,
      data: {
        funnel: {
          id: funnel.id,
          name: funnel.name,
        },
        trends: trendData,
        summary: {
          avgConversionRate: trendData.length > 0
            ? trendData.reduce((sum, d) => sum + d.conversionRate, 0) / trendData.length
            : 0,
          avgDropoffRate: trendData.length > 0
            ? trendData.reduce((sum, d) => sum + (d.dropoffRate || 0), 0) / trendData.length
            : 0,
          totalDays: trendData.length,
        },
      },
    });
  })
);

export default router;

