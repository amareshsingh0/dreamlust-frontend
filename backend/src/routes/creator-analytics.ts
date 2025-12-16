import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { requireCreator } from '../middleware/authorize';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { NotFoundError } from '../lib/errors';
import { Prisma } from '@prisma/client';

const router = Router();

// Calculate date range from time range string
function getDateRange(timeRange: string): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (timeRange) {
    case '7d':
      start.setDate(start.getDate() - 7);
      break;
    case '30d':
      start.setDate(start.getDate() - 30);
      break;
    case '90d':
      start.setDate(start.getDate() - 90);
      break;
    case '1y':
      start.setFullYear(start.getFullYear() - 1);
      break;
    case 'all':
      start.setFullYear(2020); // Set to a very early date
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return { start, end };
}

/**
 * GET /api/creator-analytics/overview
 * Get creator analytics overview
 */
router.get(
  '/overview',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';

    // Get creator
    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { start, end } = getDateRange(timeRange);
    const previousStart = new Date(start.getTime() - (end.getTime() - start.getTime()));

    // Get current period stats
    const [currentViews, previousViews] = await Promise.all([
      prisma.view.count({
        where: {
          content: {
            creatorId: creator.id,
          },
          watchedAt: {
            gte: start,
            lte: end,
          },
        },
      }),
      prisma.view.count({
        where: {
          content: {
            creatorId: creator.id,
          },
          watchedAt: {
            gte: previousStart,
            lt: start,
          },
        },
      }),
    ]);

    // Get watch time
    const [currentWatchTime, previousWatchTime] = await Promise.all([
      prisma.view.aggregate({
        where: {
          content: {
            creatorId: creator.id,
          },
          watchedAt: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          duration: true,
        },
      }),
      prisma.view.aggregate({
        where: {
          content: {
            creatorId: creator.id,
          },
          watchedAt: {
            gte: previousStart,
            lt: start,
          },
        },
        _sum: {
          duration: true,
        },
      }),
    ]);

    const totalWatchTime = currentWatchTime._sum.duration || 0;
    const previousTotalWatchTime = previousWatchTime._sum.duration || 0;

    // Get followers
    const [currentFollowers, previousFollowers] = await Promise.all([
      prisma.subscription.count({
        where: {
          creator_id: creator.id,
          status: 'ACTIVE',
          created_at: {
            lte: end,
          },
        },
      }),
      prisma.subscription.count({
        where: {
          creator_id: creator.id,
          status: 'ACTIVE',
          created_at: {
            lt: start,
          },
        },
      }),
    ]);

    // Get earnings
    const [currentEarnings, previousEarnings] = await Promise.all([
      prisma.tip.aggregate({
        where: {
          to_creator_id: creator.id,
          status: 'completed',
          created_at: {
            gte: start,
            lte: end,
          },
        },
        _sum: {
          amount: true,
        },
      }),
      prisma.tip.aggregate({
        where: {
          to_creator_id: creator.id,
          status: 'completed',
          created_at: {
            gte: previousStart,
            lt: start,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const earnings = currentEarnings._sum.amount || 0;
    const previousEarningsAmount = previousEarnings._sum.amount || 0;

    // Calculate changes
    const viewsChange = previousViews > 0 
      ? ((currentViews - previousViews) / previousViews) * 100 
      : currentViews > 0 ? 100 : 0;
    
    const watchTimeChange = previousTotalWatchTime > 0
      ? ((totalWatchTime - previousTotalWatchTime) / previousTotalWatchTime) * 100
      : totalWatchTime > 0 ? 100 : 0;

    const followersChange = previousFollowers > 0
      ? ((currentFollowers - previousFollowers) / previousFollowers) * 100
      : currentFollowers > 0 ? 100 : 0;

    const earningsChange = previousEarningsAmount > 0
      ? ((Number(earnings) - Number(previousEarningsAmount)) / Number(previousEarningsAmount)) * 100
      : Number(earnings) > 0 ? 100 : 0;

    res.json({
      success: true,
      data: {
        timeRange,
        period: {
          start: start.toISOString(),
          end: end.toISOString(),
        },
        metrics: {
          totalViews: {
            value: currentViews,
            change: viewsChange,
            trend: viewsChange >= 0 ? 'up' : 'down',
          },
          totalWatchTime: {
            value: totalWatchTime,
            change: watchTimeChange,
            trend: watchTimeChange >= 0 ? 'up' : 'down',
          },
          followers: {
            value: currentFollowers,
            change: followersChange,
            trend: followersChange >= 0 ? 'up' : 'down',
          },
          earnings: {
            value: Number(earnings),
            change: earningsChange,
            trend: earningsChange >= 0 ? 'up' : 'down',
          },
        },
      },
    });
  })
);

/**
 * GET /api/creator-analytics/views-over-time
 * Get views over time data for chart
 */
router.get(
  '/views-over-time',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';

    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { start, end } = getDateRange(timeRange);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const interval = days <= 7 ? 'day' : days <= 30 ? 'day' : days <= 90 ? 'week' : 'month';

    // Get views grouped by date
    const views = await prisma.view.findMany({
      where: {
        content: {
          creatorId: creator.id,
        },
        watchedAt: {
          gte: start,
          lte: end,
        },
      },
      select: {
        watchedAt: true,
      },
    });

    // Group by date
    const viewsByDate: Record<string, number> = {};
    views.forEach((view) => {
      const date = new Date(view.watchedAt || view.watchedAt);
      let key: string;
      
      if (interval === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (interval === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      viewsByDate[key] = (viewsByDate[key] || 0) + 1;
    });

    const viewsData = Object.entries(viewsByDate)
      .map(([date, views]) => ({ date, views }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      success: true,
      data: {
        viewsData,
        interval,
      },
    });
  })
);

/**
 * GET /api/creator-analytics/top-content
 * Get top performing content
 */
router.get(
  '/top-content',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';
    const limit = parseInt((req.query.limit as string) || '10') || 10;

    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { start, end } = getDateRange(timeRange);

    // Get content with view counts
    const content = await prisma.content.findMany({
      where: {
        creatorId: creator.id,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
        thumbnail: true,
        viewCount: true,
        likeCount: true,
        publishedAt: true,
      },
      orderBy: {
        viewCount: 'desc',
      },
      take: limit,
    });

    // Get watch time for each content
    const contentWithWatchTime = await Promise.all(
      content.map(async (item) => {
        const watchTime = await prisma.view.aggregate({
          where: {
            contentId: item.id,
            watchedAt: {
              gte: start,
              lte: end,
            },
          },
          _sum: {
            duration: true,
          },
        });

        return {
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          views: item.viewCount || 0,
          watchTime: watchTime._sum.duration || 0,
          likes: item.likeCount || 0,
          engagement: item.viewCount && item.likeCount 
            ? ((item.likeCount / item.viewCount) * 100).toFixed(1)
            : '0',
        };
      })
    );

    res.json({
      success: true,
      data: {
        topContent: contentWithWatchTime,
      },
    });
  })
);

/**
 * GET /api/creator-analytics/traffic-sources
 * Get traffic sources breakdown
 */
router.get(
  '/traffic-sources',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';

    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { start, end } = getDateRange(timeRange);

    // Get analytics events for this creator's content
    const contentIds = await prisma.content.findMany({
      where: {
        creatorId: creator.id,
      },
      select: { id: true },
    }).then(items => items.map(i => i.id));

    // Get referrer data from analytics events
    // Note: Prisma JSON filtering is limited, so we'll get all page_view events
    // and filter in memory for content views
    const events = await prisma.analyticsEvent.findMany({
      where: {
        eventType: 'page_view',
        timestamp: {
          gte: start,
          lte: end,
        },
      },
      select: {
        referrer: true,
        eventData: true,
      },
    });

    // Filter for content views (path contains /watch/)
    const contentViewEvents = events.filter((event) => {
      const eventData = event.eventData as any;
      return eventData?.path?.includes('/watch/');
    });

    // Group by referrer
    const sources: Record<string, number> = {
      direct: 0,
      internal: 0,
      external: 0,
    };

    contentViewEvents.forEach((event) => {
      if (!event.referrer) {
        sources.direct++;
      } else {
        // Check if referrer is from same domain (internal) or external
        try {
          const referrerUrl = new URL(event.referrer);
          // For now, assume internal if referrer exists (can be enhanced with actual domain check)
          sources.internal++;
        } catch {
          // Invalid URL, treat as direct
          sources.direct++;
        }
      }
    });

    const trafficSources = Object.entries(sources).map(([source, count]) => ({
      source: source.charAt(0).toUpperCase() + source.slice(1),
      count,
    }));

    res.json({
      success: true,
      data: {
        trafficSources,
      },
    });
  })
);

/**
 * GET /api/creator-analytics/audience
 * Get audience demographics
 */
router.get(
  '/audience',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';

    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { start, end } = getDateRange(timeRange);

    // Get analytics events for views
    const events = await prisma.analyticsEvent.findMany({
      where: {
        eventType: 'video_play',
        timestamp: {
          gte: start,
          lte: end,
        },
        eventData: {
          path: {
            contains: '/watch/',
          },
        },
      },
      select: {
        country: true,
        device: true,
      },
    });

    // Group by country
    const viewersByCountry: Record<string, number> = {};
    events.forEach((event) => {
      const country = event.country || 'Unknown';
      viewersByCountry[country] = (viewersByCountry[country] || 0) + 1;
    });

    // Group by device
    const viewersByDevice: Record<string, number> = {};
    events.forEach((event) => {
      const device = event.device || 'unknown';
      viewersByDevice[device] = (viewersByDevice[device] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        viewersByCountry: Object.entries(viewersByCountry)
          .map(([country, count]) => ({ country, count }))
          .sort((a, b) => b.count - a.count),
        viewersByDevice: Object.entries(viewersByDevice)
          .map(([device, count]) => ({ device, count }))
          .sort((a, b) => b.count - a.count),
      },
    });
  })
);

/**
 * GET /api/creator-analytics/content-performance
 * Get detailed content performance data
 */
router.get(
  '/content-performance',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const timeRange = (req.query.timeRange as string) || '30d';
    const page = parseInt((req.query.page as string) || '1') || 1;
    const limit = parseInt((req.query.limit as string) || '20') || 20;
    const skip = (page - 1) * limit;

    const creator = await prisma.creator.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const { start, end } = getDateRange(timeRange);

    const [content, total] = await Promise.all([
      prisma.content.findMany({
        where: {
          creatorId: creator.id,
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          thumbnail: true,
          viewCount: true,
          likeCount: true,
          commentCount: true,
          price: true,
          publishedAt: true,
        },
        orderBy: {
          viewCount: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.content.count({
        where: {
          creatorId: creator.id,
          deletedAt: null,
        },
      }),
    ]);

    // Get watch time and revenue for each content
    const contentStats = await Promise.all(
      content.map(async (item) => {
        const [watchTime, purchases] = await Promise.all([
          prisma.view.aggregate({
            where: {
              contentId: item.id,
              watchedAt: {
                gte: start,
                lte: end,
              },
            },
            _sum: {
              duration: true,
            },
          }),
          // Count tips/purchases for this content
          prisma.tip.count({
            where: {
              to_creator_id: creator.id,
              content_id: item.id,
              status: 'completed',
              created_at: {
                gte: start,
                lte: end,
              },
            },
          }),
        ]);

        // Get revenue from tips for this content
        const revenueData = await prisma.tip.aggregate({
          where: {
            to_creator_id: creator.id,
            content_id: item.id,
            status: 'completed',
            created_at: {
              gte: start,
              lte: end,
            },
          },
          _sum: {
            amount: true,
          },
        });

        const engagement = item.viewCount && item.likeCount
          ? ((item.likeCount / item.viewCount) * 100).toFixed(1)
          : '0';

        return {
          id: item.id,
          title: item.title,
          thumbnail: item.thumbnail,
          views: item.viewCount || 0,
          watchTime: watchTime._sum.duration || 0,
          engagement: `${engagement}%`,
          revenue: revenueData._sum.amount ? Number(revenueData._sum.amount) : (item.price ? Number(item.price) * purchases : 0),
          publishedAt: item.publishedAt?.toISOString() || null,
        };
      })
    );

    res.json({
      success: true,
      data: {
        contentStats,
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

export default router;

