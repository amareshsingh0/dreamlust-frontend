import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { z } from 'zod';
import { trackEvent, getOrCreateSessionId, EventTypes } from '../lib/analytics/tracker';
import { Prisma } from '@prisma/client';

const router = Router();

const trackEventSchema = z.object({
  eventType: z.string().min(1),
  eventData: z.record(z.unknown()).optional(),
});

const getAnalyticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  eventType: z.string().optional(),
  userId: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  page: z.coerce.number().int().min(1).default(1),
});

/**
 * POST /api/analytics/track
 * Track an analytics event
 */
router.post(
  '/track',
  optionalAuth,
  userRateLimiter,
  validateBody(trackEventSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { eventType, eventData } = req.body;

    // Get or create session ID
    const sessionId = getOrCreateSessionId(req, res);

    // Track the event
    await trackEvent(req, eventType, eventData, userId);

    res.json({
      success: true,
      message: 'Event tracked',
    });
  })
);

/**
 * GET /api/analytics/events
 * Get analytics events (admin or own events)
 */
router.get(
  '/events',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'MODERATOR';

    // Parse query parameters
    const {
      startDate,
      endDate,
      eventType,
      userId: queryUserId,
      limit,
      page,
    } = req.query as any;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.AnalyticsEventWhereInput = {};

    // Non-admins can only see their own events
    if (!isAdmin) {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    }

    if (startDate || endDate) {
      where.timestamp = {};
      if (startDate) {
        where.timestamp.gte = new Date(startDate);
      }
      if (endDate) {
        where.timestamp.lte = new Date(endDate);
      }
    }

    if (eventType) {
      where.eventType = eventType;
    }

    const [events, total] = await Promise.all([
      prisma.analyticsEvent.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userId: true,
          sessionId: true,
          eventType: true,
          eventData: true,
          device: true,
          browser: true,
          os: true,
          country: true,
          city: true,
          referrer: true,
          timestamp: true,
        },
      }),
      prisma.analyticsEvent.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        events: events.map((e) => ({
          ...e,
          timestamp: e.timestamp.toISOString(),
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  })
);

/**
 * GET /api/analytics/stats
 * Get aggregated analytics statistics
 */
router.get(
  '/stats',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'MODERATOR';

    if (!isAdmin) {
      throw new UnauthorizedError('Admin access required');
    }

    const { startDate, endDate } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default 30 days
    const end = endDate ? new Date(endDate) : new Date();

    // Get daily stats for the period
    const dailyStats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'desc' },
    });

    // Get event type counts
    const eventTypeCounts = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get device breakdown
    const deviceBreakdown = await prisma.analyticsEvent.groupBy({
      by: ['device'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    // Get browser breakdown
    const browserBreakdown = await prisma.analyticsEvent.groupBy({
      by: ['browser'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Get country breakdown
    const countryBreakdown = await prisma.analyticsEvent.groupBy({
      by: ['country'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
        country: {
          not: null,
        },
      },
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Calculate totals
    const totalEvents = await prisma.analyticsEvent.count({
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });

    const uniqueUsers = await prisma.analyticsEvent.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
        userId: {
          not: null,
        },
      },
    });

    const uniqueSessions = await prisma.analyticsEvent.groupBy({
      by: ['sessionId'],
      where: {
        timestamp: {
          gte: start,
          lte: end,
        },
      },
    });

    res.json({
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        totals: {
          events: totalEvents,
          uniqueUsers: uniqueUsers.length,
          uniqueSessions: uniqueSessions.length,
        },
        dailyStats: dailyStats.map((stat) => ({
          date: stat.date.toISOString().split('T')[0],
          totalUsers: stat.totalUsers,
          activeUsers: stat.activeUsers,
          newUsers: stat.newUsers,
          totalViews: stat.totalViews,
          totalWatchTime: stat.totalWatchTime,
          avgSessionDuration: stat.avgSessionDuration,
          topContent: stat.topContent,
          topCategories: stat.topCategories,
        })),
        eventTypeCounts: eventTypeCounts.map((e) => ({
          eventType: e.eventType,
          count: e._count.id,
        })),
        deviceBreakdown: deviceBreakdown.map((d) => ({
          device: d.device,
          count: d._count.id,
        })),
        browserBreakdown: browserBreakdown.map((b) => ({
          browser: b.browser,
          count: b._count.id,
        })),
        countryBreakdown: countryBreakdown.map((c) => ({
          country: c.country,
          count: c._count.id,
        })),
      },
    });
  })
);

/**
 * GET /api/analytics/daily-stats
 * Get daily statistics
 */
router.get(
  '/daily-stats',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userRole = req.user!.role;
    const isAdmin = userRole === 'ADMIN' || userRole === 'MODERATOR';

    if (!isAdmin) {
      throw new UnauthorizedError('Admin access required');
    }

    const { startDate, endDate, limit = 30 } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - Number(limit) * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const stats = await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'desc' },
    });

    res.json({
      success: true,
      data: {
        stats: stats.map((stat) => ({
          date: stat.date.toISOString().split('T')[0],
          totalUsers: stat.totalUsers,
          activeUsers: stat.activeUsers,
          newUsers: stat.newUsers,
          totalViews: stat.totalViews,
          totalWatchTime: stat.totalWatchTime,
          avgSessionDuration: stat.avgSessionDuration,
          topContent: stat.topContent,
          topCategories: stat.topCategories,
        })),
      },
    });
  })
);

/**
 * GET /api/analytics/user-stats
 * Get user-specific analytics
 */
router.get(
  '/user-stats',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { startDate, endDate } = req.query as any;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    // Get user events
    const events = await prisma.analyticsEvent.findMany({
      where: {
        userId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // Group by event type
    const eventTypeCounts = await prisma.analyticsEvent.groupBy({
      by: ['eventType'],
      where: {
        userId,
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      _count: {
        id: true,
      },
    });

    // Calculate watch time from video events
    const videoEvents = events.filter(
      (e) => e.eventType === EventTypes.VIDEO_PLAY || e.eventType === EventTypes.VIDEO_COMPLETE
    );
    const totalWatchTime = videoEvents.reduce((total, event) => {
      const duration = (event.eventData as any)?.duration || 0;
      return total + duration;
    }, 0);

    res.json({
      success: true,
      data: {
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        totalEvents: events.length,
        totalWatchTime,
        eventTypeCounts: eventTypeCounts.map((e) => ({
          eventType: e.eventType,
          count: e._count.id,
        })),
        recentEvents: events.slice(0, 20).map((e) => ({
          id: e.id,
          eventType: e.eventType,
          eventData: e.eventData,
          timestamp: e.timestamp.toISOString(),
        })),
      },
    });
  })
);

export default router;
