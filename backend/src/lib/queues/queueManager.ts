/**
 * Queue Manager
 * Centralized queue management using BullMQ
 * Queues are optional and only created if Redis is available
 */

import { Queue, QueueOptions } from 'bullmq';
import { env } from '../../config/env';
import { redis } from '../redis';

// Check if queues should be enabled
const isQueueEnabled = !!env.REDIS_URL;

let connection: any = undefined;
let defaultQueueOptions: QueueOptions | undefined = undefined;

if (isQueueEnabled && env.REDIS_URL) {
  try {
    connection = {
      host: new URL(env.REDIS_URL).hostname,
      port: parseInt(new URL(env.REDIS_URL).port || '6379'),
      password: new URL(env.REDIS_URL).password || undefined,
    };

    defaultQueueOptions = {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600, // Keep completed jobs for 24 hours
          count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    };
  } catch (error) {
    console.warn('⚠️  Invalid REDIS_URL. Queues will be disabled.');
  }
}

// Video processing queue (optional)
export const videoProcessingQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('video-processing', defaultQueueOptions) 
  : null;

// Thumbnail generation queue (optional)
export const thumbnailQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('thumbnail-generation', defaultQueueOptions) 
  : null;

// Notification queue (optional)
export const notificationQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('notifications', defaultQueueOptions) 
  : null;

// Trending scores calculation queue (optional)
export const trendingQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('trending-scores', defaultQueueOptions) 
  : null;

// Recommendations generation queue (optional)
export const recommendationsQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('recommendations', defaultQueueOptions) 
  : null;

// Cleanup queue (optional)
export const cleanupQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('cleanup', defaultQueueOptions) 
  : null;

// Analytics aggregation queue (optional)
export const analyticsQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('analytics', defaultQueueOptions) 
  : null;

// Email queue (optional)
export const emailQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('email', defaultQueueOptions) 
  : null;

// Scheduler queue (optional)
export const schedulerQueue = isQueueEnabled && defaultQueueOptions 
  ? new Queue('scheduler', defaultQueueOptions) 
  : null;

/**
 * Add job to video processing queue
 */
export async function queueVideoTranscoding(data: {
  contentId: string;
  videoUrl: string;
  qualities?: string[];
}) {
  if (!videoProcessingQueue) {
    console.warn('⚠️  Video processing queue not available. Skipping job.');
    return null;
  }
  return videoProcessingQueue.add('transcode', data, {
    priority: 1,
    jobId: `transcode-${data.contentId}`,
  });
}

/**
 * Add job to thumbnail generation queue
 */
export async function queueThumbnailGeneration(data: {
  contentId: string;
  videoUrl?: string;
  imageBuffer?: Buffer;
  timestamp?: number;
}) {
  if (!thumbnailQueue) {
    console.warn('⚠️  Thumbnail generation queue not available. Skipping job.');
    return null;
  }
  return thumbnailQueue.add('generate', data, {
    priority: 2,
    jobId: `thumbnail-${data.contentId}`,
  });
}

/**
 * Add job to notification queue
 */
export async function queueNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, any>;
}) {
  if (!notificationQueue) {
    console.warn('⚠️  Notification queue not available. Skipping job.');
    return null;
  }
  return notificationQueue.add('send', data, {
    priority: 3,
  });
}

/**
 * Add job to trending scores calculation
 */
export async function queueTrendingCalculation(data?: {
  period?: 'today' | 'week' | 'month';
}) {
  if (!trendingQueue) {
    console.warn('⚠️  Trending queue not available. Skipping job.');
    return null;
  }
  return trendingQueue.add('calculate', data || {}, {
    priority: 4,
    repeat: {
      pattern: '0 */6 * * *', // Every 6 hours
    },
  });
}

/**
 * Add job to recommendations generation
 */
export async function queueRecommendationsGeneration(data: {
  userId: string;
  limit?: number;
}) {
  if (!recommendationsQueue) {
    console.warn('⚠️  Recommendations queue not available. Skipping job.');
    return null;
  }
  return recommendationsQueue.add('generate', data, {
    priority: 5,
  });
}

/**
 * Add job to cleanup old temp files
 */
export async function queueCleanup(data?: {
  olderThanDays?: number;
}) {
  if (!cleanupQueue) {
    console.warn('⚠️  Cleanup queue not available. Skipping job.');
    return null;
  }
  return cleanupQueue.add('cleanup-temp-files', data || { olderThanDays: 7 }, {
    priority: 6,
    repeat: {
      pattern: '0 2 * * *', // Daily at 2 AM
    },
  });
}

/**
 * Add job to analytics aggregation queue
 */
export async function queueAnalyticsAggregation(data?: {
  timestamp?: Date;
  type?: 'hourly' | 'daily';
}) {
  if (!analyticsQueue) {
    console.warn('⚠️  Analytics queue not available. Skipping job.');
    return null;
  }
  return analyticsQueue.add('aggregate-hourly', data || { timestamp: new Date(), type: 'hourly' }, {
    priority: 5,
    repeat: {
      pattern: '0 * * * *', // Every hour
    },
  });
}

/**
 * Add email to queue
 */
export async function queueEmail(data: {
  to: string;
  template: string;
  data: any;
  subject: string;
}) {
  if (!emailQueue) {
    console.warn('⚠️  Email queue not available. Skipping job.');
    return null;
  }
  return emailQueue.add('send', data, {
    priority: 3,
  });
}

/**
 * Alias for queueEmail (for backward compatibility)
 */
export const queueEmailJob = queueEmail;

/**
 * Add job to scheduler queue
 */
export async function queueScheduledContentProcessing() {
  if (!schedulerQueue) {
    console.warn('⚠️  Scheduler queue not available. Skipping job.');
    return null;
  }
  return schedulerQueue.add('process-scheduled', { type: 'process-scheduled' }, {
    priority: 1,
    repeat: {
      pattern: '*/5 * * * *', // Every 5 minutes
    },
  });
}

/**
 * Get queue status
 */
export async function getQueueStatus(queueName: string) {
  const queues = {
    'video-processing': videoProcessingQueue,
    'thumbnail-generation': thumbnailQueue,
    'notifications': notificationQueue,
    'trending-scores': trendingQueue,
    'recommendations': recommendationsQueue,
    'cleanup': cleanupQueue,
    'analytics': analyticsQueue,
    'email': emailQueue,
    'scheduler': schedulerQueue,
  };

  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found or not available (Redis required)`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

/**
 * Check if queues are available
 */
export function areQueuesAvailable(): boolean {
  return isQueueEnabled && videoProcessingQueue !== null;
}
