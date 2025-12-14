/**
 * Queue Manager
 * Centralized queue management using BullMQ
 */

import { Queue, QueueOptions } from 'bullmq';
import { env } from '../../config/env';
import { redis } from '../redis';

const connection = {
  host: env.REDIS_URL ? new URL(env.REDIS_URL).hostname : 'localhost',
  port: env.REDIS_URL ? parseInt(new URL(env.REDIS_URL).port || '6379') : 6379,
  password: env.REDIS_URL ? new URL(env.REDIS_URL).password : undefined,
};

const defaultQueueOptions: QueueOptions = {
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

// Video processing queue
export const videoProcessingQueue = new Queue('video-processing', defaultQueueOptions);

// Thumbnail generation queue
export const thumbnailQueue = new Queue('thumbnail-generation', defaultQueueOptions);

// Notification queue
export const notificationQueue = new Queue('notifications', defaultQueueOptions);

// Trending scores calculation queue
export const trendingQueue = new Queue('trending-scores', defaultQueueOptions);

// Recommendations generation queue
export const recommendationsQueue = new Queue('recommendations', defaultQueueOptions);

// Cleanup queue
export const cleanupQueue = new Queue('cleanup', defaultQueueOptions);

/**
 * Add job to video processing queue
 */
export async function queueVideoTranscoding(data: {
  contentId: string;
  videoUrl: string;
  qualities?: string[];
}) {
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
  return cleanupQueue.add('cleanup-temp-files', data || { olderThanDays: 7 }, {
    priority: 6,
    repeat: {
      pattern: '0 2 * * *', // Daily at 2 AM
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
  };

  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Queue ${queueName} not found`);
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
