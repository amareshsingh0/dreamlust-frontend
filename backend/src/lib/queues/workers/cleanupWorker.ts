/**
 * Cleanup Worker
 * Handles cleanup of old temporary files and expired data
 */

import { Worker, Job } from 'bullmq';
import { queueCleanup } from '../queueManager';
import { s3Storage } from '../../storage/s3Storage';
import { prisma } from '../../prisma';
import { env } from '../../../config/env';

export interface CleanupJob {
  olderThanDays?: number;
}

/**
 * Cleanup old temporary files and expired data
 */
async function cleanupOldFiles(job: Job<CleanupJob>) {
  const { olderThanDays = 7 } = job.data;

  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Cleanup old draft content that was never published
    const deletedDrafts = await prisma.content.deleteMany({
      where: {
        status: 'DRAFT',
        createdAt: {
          lt: cutoffDate,
        },
        publishedAt: null,
      },
    });

    // Cleanup old soft-deleted content (after 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Note: In production, you might want to actually delete from storage
    // For now, we'll just log what would be deleted
    const oldDeletedContent = await prisma.content.findMany({
      where: {
        deletedAt: {
          lt: thirtyDaysAgo,
        },
      },
      select: {
        id: true,
        thumbnail: true,
        mediaUrl: true,
      },
    });

    // Cleanup old temp files from S3/R2 (if configured)
    // This would require tracking temp file keys, which we'll skip for now
    // In production, you'd maintain a table of temp files with creation dates

    // Cleanup old expired sessions (if using database sessions)
    // This is handled by Redis TTL, but if using DB sessions:
    // await prisma.session.deleteMany({
    //   where: {
    //     expiresAt: { lt: new Date() }
    //   }
    // });

    console.log(
      `✅ Cleanup completed: ${deletedDrafts.count} drafts deleted, ${oldDeletedContent.length} old deleted content found`
    );

    return {
      success: true,
      deletedDrafts: deletedDrafts.count,
      oldDeletedContent: oldDeletedContent.length,
      cutoffDate: cutoffDate.toISOString(),
    };
  } catch (error) {
    console.error(`Cleanup failed:`, error);
    throw error;
  }
}

/**
 * Create cleanup worker
 */
export function createCleanupWorker() {
  const worker = new Worker<CleanupJob>(
    'cleanup',
    async (job) => {
      if (job.name === 'cleanup-temp-files') {
        return await cleanupOldFiles(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 1, // Only one cleanup at a time
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ Cleanup completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Cleanup failed: ${job?.id}`, err);
  });

  return worker;
}
