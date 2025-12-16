/**
 * Analytics Aggregation Worker
 * Aggregates view events into stats tables hourly
 */

import { Worker, Job } from 'bullmq';
import { prisma } from '../../prisma';
import { redis } from '../../redis';
import { env } from '../../../config/env';

export interface AnalyticsAggregationJob {
  timestamp?: Date;
  type?: 'hourly' | 'daily';
}

/**
 * Aggregate view events into content stats
 */
async function aggregateViewEvents(job: Job<AnalyticsAggregationJob>) {
  const { timestamp, type = 'hourly' } = job.data;
  const now = timestamp ? new Date(timestamp) : new Date();
  
  // Calculate time range based on type
  const timeRange = type === 'hourly' ? 3600000 : 86400000; // 1 hour or 1 day
  const startTime = new Date(now.getTime() - timeRange);
  
  console.log(`[Analytics Worker] Aggregating ${type} analytics from ${startTime.toISOString()} to ${now.toISOString()}`);

  try {
    // Get all view events in the time range
    const views = await prisma.view.findMany({
      where: {
        watchedAt: {
          gte: startTime,
          lte: now,
        },
      },
      select: {
        contentId: true,
        duration: true,
        watchedAt: true,
      },
    });

    if (views.length === 0) {
      console.log(`[Analytics Worker] No views found in the time range`);
      return;
    }

    // Aggregate by content
    const contentStats: Record<string, { views: number; watchTime: number }> = {};
    
    views.forEach((view) => {
      const contentId = view.contentId;
      if (!contentStats[contentId]) {
        contentStats[contentId] = { views: 0, watchTime: 0 };
      }
      contentStats[contentId].views++;
      contentStats[contentId].watchTime += view.duration || 0;
    });

    console.log(`[Analytics Worker] Aggregating stats for ${Object.keys(contentStats).length} content items`);

    // Update content stats in batches
    const updates = Object.entries(contentStats).map(async ([contentId, stats]) => {
      try {
        await prisma.content.update({
          where: { id: contentId },
          data: {
            viewCount: { increment: stats.views },
            // Note: We don't have a totalWatchTime field in Content model,
            // but we can track this in analytics events or a separate table
          },
        });
      } catch (error) {
        console.error(`[Analytics Worker] Failed to update content ${contentId}:`, error);
      }
    });

    await Promise.all(updates);

    // Aggregate analytics events for daily stats
    if (type === 'daily') {
      await aggregateDailyStats(startTime, now);
    }

    // Aggregate by creator
    await aggregateCreatorStats(views, startTime, now);

    console.log(`[Analytics Worker] Successfully aggregated ${views.length} views`);
  } catch (error) {
    console.error('[Analytics Worker] Error aggregating view events:', error);
    throw error;
  }
}

/**
 * Aggregate daily statistics
 */
async function aggregateDailyStats(startTime: Date, endTime: Date) {
  const date = new Date(startTime);
  date.setHours(0, 0, 0, 0); // Start of day

  try {
    // Get analytics events for the day
    const events = await prisma.analyticsEvent.findMany({
      where: {
        timestamp: {
          gte: startTime,
          lte: endTime,
        },
      },
      select: {
        userId: true,
        eventType: true,
        eventData: true,
      },
    });

    // Count unique users
    const uniqueUsers = new Set(events.filter(e => e.userId).map(e => e.userId)).size;
    const activeUsers = uniqueUsers;

    // Count new users (users created in this period)
    const newUsers = await prisma.user.count({
      where: {
        created_at: {
          gte: startTime,
          lte: endTime,
        },
      },
    });

    // Get total views from views table
    const totalViews = await prisma.view.count({
      where: {
        watchedAt: {
          gte: startTime,
          lte: endTime,
        },
      },
    });

    // Get total watch time
    const watchTimeResult = await prisma.view.aggregate({
      where: {
        watchedAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      _sum: {
        duration: true,
      },
    });

    const totalWatchTime = watchTimeResult._sum.duration || 0;

    // Calculate average session duration (simplified)
    const sessionDurations = events
      .filter(e => e.eventType === 'page_view')
      .map(e => {
        const data = e.eventData as any;
        return data?.duration || 0;
      });
    const avgSessionDuration = sessionDurations.length > 0
      ? Math.round(sessionDurations.reduce((a, b) => a + b, 0) / sessionDurations.length)
      : 0;

    // Get top content
    const topContentRaw = await prisma.view.groupBy({
      by: ['contentId'],
      where: {
        watchedAt: {
          gte: startTime,
          lte: endTime,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        duration: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    const topContent = topContentRaw.map(item => ({
      contentId: item.contentId,
      views: item._count.id,
      watchTime: item._sum.duration || 0,
    }));

    // Get top categories (simplified - would need to join with content categories)
    const topCategories: any[] = []; // TODO: Implement category aggregation

    // Upsert daily stats
    await prisma.dailyStats.upsert({
      where: { date: date },
      update: {
        totalUsers: uniqueUsers,
        activeUsers,
        newUsers,
        totalViews,
        totalWatchTime,
        avgSessionDuration,
        topContent: topContent as any,
        topCategories: topCategories as any,
      },
      create: {
        date: date,
        totalUsers: uniqueUsers,
        activeUsers,
        newUsers,
        totalViews,
        totalWatchTime,
        avgSessionDuration,
        topContent: topContent as any,
        topCategories: topCategories as any,
      },
    });

    console.log(`[Analytics Worker] Updated daily stats for ${date.toISOString().split('T')[0]}`);
  } catch (error) {
    console.error('[Analytics Worker] Error aggregating daily stats:', error);
  }
}

/**
 * Aggregate creator statistics
 */
async function aggregateCreatorStats(views: Array<{ contentId: string; duration: number | null }>, startTime: Date, endTime: Date) {
  try {
    // Get content with creator info
    const contentIds = [...new Set(views.map(v => v.contentId))];
    const content = await prisma.content.findMany({
      where: {
        id: { in: contentIds },
      },
      select: {
        id: true,
        creatorId: true,
      },
    });

    // Group views by creator
    const creatorStats: Record<string, { views: number; watchTime: number }> = {};

    views.forEach((view) => {
      const contentItem = content.find(c => c.id === view.contentId);
      if (!contentItem?.creatorId) return;

      const creatorId = contentItem.creatorId;
      if (!creatorStats[creatorId]) {
        creatorStats[creatorId] = { views: 0, watchTime: 0 };
      }
      creatorStats[creatorId].views++;
      creatorStats[creatorId].watchTime += view.duration || 0;
    });

    // Update creator stats
    const creatorUpdates = Object.entries(creatorStats).map(async ([creatorId, stats]) => {
      try {
        await prisma.creator.update({
          where: { id: creatorId },
          data: {
            total_views: { increment: BigInt(stats.views) },
            // Note: We might want to track watch time separately
          },
        });
      } catch (error) {
        console.error(`[Analytics Worker] Failed to update creator ${creatorId}:`, error);
      }
    });

    await Promise.all(creatorUpdates);
    console.log(`[Analytics Worker] Updated stats for ${Object.keys(creatorStats).length} creators`);
  } catch (error) {
    console.error('[Analytics Worker] Error aggregating creator stats:', error);
  }
}

/**
 * Create analytics worker
 */
export function createAnalyticsWorker() {
  if (!env.REDIS_URL) {
    console.warn('⚠️  Redis not available. Analytics worker will not be created.');
    return null;
  }

  const worker = new Worker<AnalyticsAggregationJob>(
    'analytics',
    async (job) => {
      console.log(`[Analytics Worker] Processing job: ${job.name} (ID: ${job.id})`);
      
      switch (job.name) {
        case 'aggregate-hourly':
          await aggregateViewEvents(job);
          break;
        case 'aggregate-daily':
          await aggregateViewEvents({ ...job, data: { ...job.data, type: 'daily' } });
          break;
        default:
          console.warn(`[Analytics Worker] Unknown job type: ${job.name}`);
      }
    },
    {
      connection: redis,
      concurrency: 1, // Process one job at a time to avoid conflicts
    }
  );

  worker.on('completed', (job) => {
    console.log(`[Analytics Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Analytics Worker] Job ${job?.id} failed:`, err);
  });

  worker.on('error', (err) => {
    console.error('[Analytics Worker] Worker error:', err);
  });

  console.log('✅ Analytics worker created');
  return worker;
}

