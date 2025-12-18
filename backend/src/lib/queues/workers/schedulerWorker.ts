/**
 * Content Scheduler Worker
 * Processes scheduled content publication
 */

import { Worker, Job } from 'bullmq';
import { env } from '../../../config/env';
import { getScheduledContentToPublish, publishScheduledContent } from '../../creator/schedulerService';
import logger from '../../logger';

export interface SchedulerJob {
  type: 'process-scheduled';
}

/**
 * Process scheduled content
 */
async function processScheduledContent(job: Job<SchedulerJob>) {
  try {
    const scheduledItems = await getScheduledContentToPublish();

    logger.info(`Processing ${scheduledItems.length} scheduled content items`);

    for (const item of scheduledItems) {
      try {
        await publishScheduledContent(item.id);
      } catch (error) {
        logger.error('Failed to publish scheduled content', {
          scheduledId: item.id,
          contentId: item.contentId,
          error,
        });
      }
    }

    return {
      success: true,
      processed: scheduledItems.length,
    };
  } catch (error) {
    logger.error('Scheduler worker error', { error });
    throw error;
  }
}

/**
 * Create scheduler worker
 */
export function createSchedulerWorker() {
  if (!env.REDIS_URL) {
    logger.warn('Redis not available, scheduler worker disabled');
    return null;
  }

  const worker = new Worker<SchedulerJob>(
    'scheduler',
    async (job) => {
      if (job.name === 'process-scheduled') {
        return await processScheduledContent(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    },
    {
      connection: {
        host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
        port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
        password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
      },
      concurrency: 1, // Process one at a time to avoid conflicts
      limiter: {
        max: 10,
        duration: 60000, // Max 10 jobs per minute
      },
    }
  );

  worker.on('completed', (job) => {
    logger.info(`✅ Scheduler job completed: ${job.id}`);
  });

  worker.on('failed', (job, err) => {
    logger.error(`❌ Scheduler job failed: ${job?.id}`, err);
  });

  return worker;
}

