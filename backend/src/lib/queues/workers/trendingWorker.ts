/**
 * Trending Scores Worker
 * Calculates and updates trending scores for content
 */

import { Worker, Job } from 'bullmq';
import { queueTrendingCalculation } from '../queueManager';
import { invalidateHomepageCache } from '../../cache/contentCache';
import { prisma } from '../../prisma';
import { env } from '../../../config/env';

export interface TrendingCalculationJob {
  period?: 'today' | 'week' | 'month';
}

/**
 * Calculate trending scores for content
 */
async function calculateTrendingScores(job: Job<TrendingCalculationJob>) {
  const { period = 'today' } = job.data;

  try {
    const hours = period === 'today' ? 24 : period === 'week' ? 168 : 720;
    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hours);

    // Get content published within the period
    const content = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        publishedAt: {
          gte: sinceDate,
        },
      },
      select: {
        id: true,
        viewCount: true,
        likeCount: true,
        commentCount: true,
        shareCount: true,
        publishedAt: true,
      },
    });

    // Calculate trending scores
    const now = Date.now();
    const scoredContent = content.map((item) => {
      const publishedAt = item.publishedAt ? new Date(item.publishedAt).getTime() : now;
      const hoursSincePublish = (now - publishedAt) / (1000 * 60 * 60);

      const viewVelocity = (item.viewCount || 0) / Math.max(hoursSincePublish, 1);
      const engagementScore =
        (item.viewCount || 0) > 0
          ? ((item.likeCount || 0) + (item.commentCount || 0) * 2 + (item.shareCount || 0) * 3) /
            (item.viewCount || 1)
          : 0;
      const timeDecay = Math.exp(-hoursSincePublish / 168); // Decay over 1 week

      const trendingScore = viewVelocity * (1 + engagementScore) * timeDecay;

      return {
        id: item.id,
        trendingScore,
      };
    });

    // Sort by trending score
    scoredContent.sort((a, b) => b.trendingScore - a.trendingScore);

    // Update top trending content (could store in a separate table or cache)
    // For now, we'll just invalidate the cache so it recalculates
    await invalidateHomepageCache();

    console.log(`✅ Calculated trending scores for ${scoredContent.length} content items (${period})`);

    return {
      success: true,
      count: scoredContent.length,
      topContent: scoredContent.slice(0, 10).map((c) => ({
        id: c.id,
        score: c.trendingScore,
      })),
    };
  } catch (error) {
    console.error(`Trending scores calculation failed:`, error);
    throw error;
  }
}

/**
 * Create trending scores worker
 */
export function createTrendingWorker() {
  const worker = new Worker<TrendingCalculationJob>(
    'trending-scores',
    async (job) => {
      if (job.name === 'calculate') {
        return await calculateTrendingScores(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 1, // Only one trending calculation at a time
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Trending scores calculated: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Trending calculation failed: ${job?.id}`, err);
  });

  return worker;
}
