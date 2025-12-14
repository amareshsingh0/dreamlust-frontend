/**
 * Recommendations Generation Worker
 * Generates personalized content recommendations for users
 */

import { Worker, Job } from 'bullmq';
import { queueRecommendationsGeneration } from '../queueManager';
import { prisma } from '../../prisma';
import { env } from '../../../config/env';

export interface RecommendationsJob {
  userId: string;
  limit?: number;
}

/**
 * Generate personalized recommendations for a user
 */
async function generateRecommendations(job: Job<RecommendationsJob>) {
  const { userId, limit = 20 } = job.data;

  try {
    // Get user's viewing history and preferences
    const userViews = await prisma.view.findMany({
      where: { userId },
      include: {
        content: {
          include: {
            categories: {
              include: { category: true },
            },
            tags: {
              include: { tag: true },
            },
          },
        },
      },
      orderBy: { watchedAt: 'desc' },
      take: 50,
    });

    // Extract preferred categories and tags
    const categoryCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};

    userViews.forEach((view) => {
      view.content.categories.forEach((cc) => {
        const categoryId = cc.categoryId;
        categoryCounts[categoryId] = (categoryCounts[categoryId] || 0) + 1;
      });
      view.content.tags.forEach((ct) => {
        const tagId = ct.tagId;
        tagCounts[tagId] = (tagCounts[tagId] || 0) + 1;
      });
    });

    // Get top categories and tags
    const topCategories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id);

    const topTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([id]) => id);

    // Get viewed content IDs to exclude
    const viewedContentIds = userViews.map((v) => v.contentId);

    // Find recommended content based on preferences
    const recommendations = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        id: {
          notIn: viewedContentIds,
        },
        OR: [
          {
            categories: {
              some: {
                categoryId: {
                  in: topCategories,
                },
              },
            },
          },
          {
            tags: {
              some: {
                tagId: {
                  in: topTags,
                },
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            display_name: true,
            avatar: true,
            is_verified: true,
          },
        },
        categories: {
          include: { category: true },
        },
        tags: {
          include: { tag: true },
        },
      },
      orderBy: {
        viewCount: 'desc',
      },
      take: limit * 2, // Get more to filter
    });

    // Score recommendations based on relevance
    const scored = recommendations.map((content) => {
      let score = 0;

      // Category match
      const categoryMatches = content.categories.filter((cc) =>
        topCategories.includes(cc.categoryId)
      ).length;
      score += categoryMatches * 10;

      // Tag match
      const tagMatches = content.tags.filter((ct) => topTags.includes(ct.tagId)).length;
      score += tagMatches * 5;

      // Recency boost
      if (content.publishedAt) {
        const daysSincePublish =
          (Date.now() - new Date(content.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
        score += Math.max(0, 10 - daysSincePublish);
      }

      // Popularity boost
      score += Math.log10((content.viewCount || 0) + 1) * 2;

      return { content, score };
    });

    // Sort by score and take top recommendations
    scored.sort((a, b) => b.score - a.score);
    const topRecommendations = scored.slice(0, limit).map((s) => s.content.id);

    // Store recommendations (could use a cache or separate table)
    // For now, we'll just return them

    console.log(`✅ Generated ${topRecommendations.length} recommendations for user ${userId}`);

    return {
      success: true,
      userId,
      recommendations: topRecommendations,
      count: topRecommendations.length,
    };
  } catch (error) {
    console.error(`Recommendations generation failed for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create recommendations worker
 */
export function createRecommendationsWorker() {
  const worker = new Worker<RecommendationsJob>(
    'recommendations',
    async (job) => {
      if (job.name === 'generate') {
        return await generateRecommendations(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 3, // Process 3 recommendation generations at a time
      limiter: {
        max: 30,
        duration: 60000, // Max 30 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Recommendations generated: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Recommendations generation failed: ${job?.id}`, err);
  });

  return worker;
}
