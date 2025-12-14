import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { validateQuery } from '../middleware/validation';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { z } from 'zod';

const router = Router();

/**
 * GET /api/earnings
 * Get creator earnings (tips, subscriptions, etc.)
 */
router.get(
  '/',
  authenticate,
  userRateLimiter,
  validateQuery(z.object({
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    type: z.enum(['tips', 'subscriptions', 'all']).default('all'),
  })),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    // Get creator profile
    const creator = await prisma.creator.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { startDate, endDate, type } = req.query as {
      startDate?: string;
      endDate?: string;
      type: 'tips' | 'subscriptions' | 'all';
    };

    // Build date filter
    const dateFilter: any = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

    const whereClause: any = {
      toCreatorId: creator.id,
      status: 'completed', // Only count completed payments
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
    };

    // Get tips
    const tips = type === 'subscriptions' ? [] : await prisma.tip.findMany({
      where: whereClause,
      select: {
        id: true,
        amount: true,
        currency: true,
        message: true,
        isAnonymous: true,
        createdAt: true,
        fromUser: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get subscriptions (if needed)
    const subscriptions = type === 'tips' ? [] : await prisma.subscription.findMany({
      where: {
        creatorId: creator.id,
        status: 'ACTIVE',
        ...(Object.keys(dateFilter).length > 0 && { startedAt: dateFilter }),
      },
      select: {
        id: true,
        amount: true,
        currency: true,
        tier: true,
        startedAt: true,
        subscriber: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatar: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    // Calculate totals
    const tipsTotal = tips.reduce((sum, tip) => sum + Number(tip.amount), 0);
    const subscriptionsTotal = subscriptions.reduce((sum, sub) => sum + Number(sub.amount), 0);
    const totalEarnings = tipsTotal + subscriptionsTotal;

    // Get earnings by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const monthlyTips = await prisma.tip.groupBy({
      by: ['createdAt'],
      where: {
        toCreatorId: creator.id,
        status: 'completed',
        createdAt: { gte: twelveMonthsAgo },
      },
      _sum: {
        amount: true,
      },
    });

    // Group by month
    const monthlyEarnings: Record<string, number> = {};
    monthlyTips.forEach((item) => {
      const month = new Date(item.createdAt).toISOString().slice(0, 7); // YYYY-MM
      monthlyEarnings[month] = (monthlyEarnings[month] || 0) + Number(item._sum.amount || 0);
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalEarnings: totalEarnings,
          tipsTotal: tipsTotal,
          subscriptionsTotal: subscriptionsTotal,
          tipsCount: tips.length,
          subscriptionsCount: subscriptions.length,
        },
        tips: tips.map(tip => ({
          ...tip,
          fromUser: tip.isAnonymous ? null : tip.fromUser,
        })),
        subscriptions,
        monthlyEarnings: Object.entries(monthlyEarnings).map(([month, amount]) => ({
          month,
          amount,
        })),
      },
    });
  }
);

/**
 * GET /api/earnings/stats
 * Get earnings statistics
 */
router.get(
  '/stats',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;

    const creator = await prisma.creator.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Get stats for different time periods
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today);
    thisWeek.setDate(today.getDate() - 7);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisYear = new Date(now.getFullYear(), 0, 1);

    const [todayTips, weekTips, monthTips, yearTips] = await Promise.all([
      prisma.tip.aggregate({
        where: {
          toCreatorId: creator.id,
          status: 'completed',
          createdAt: { gte: today },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.tip.aggregate({
        where: {
          toCreatorId: creator.id,
          status: 'completed',
          createdAt: { gte: thisWeek },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.tip.aggregate({
        where: {
          toCreatorId: creator.id,
          status: 'completed',
          createdAt: { gte: thisMonth },
        },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.tip.aggregate({
        where: {
          toCreatorId: creator.id,
          status: 'completed',
          createdAt: { gte: thisYear },
        },
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      success: true,
      data: {
        today: {
          amount: Number(todayTips._sum.amount || 0),
          count: todayTips._count,
        },
        week: {
          amount: Number(weekTips._sum.amount || 0),
          count: weekTips._count,
        },
        month: {
          amount: Number(monthTips._sum.amount || 0),
          count: monthTips._count,
        },
        year: {
          amount: Number(yearTips._sum.amount || 0),
          count: yearTips._count,
        },
      },
    });
  }
);

export default router;

