/**
 * Download Queue
 * Manages download jobs using BullMQ
 */

import { Queue, QueueOptions } from 'bullmq';
import { env } from '../../config/env';

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
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        },
      },
    };
  } catch (error) {
    console.warn('⚠️  Invalid REDIS_URL. Download queue will be disabled.');
  }
}

// Download queue
export const downloadQueue = isQueueEnabled && defaultQueueOptions
  ? new Queue('downloads', defaultQueueOptions)
  : null;

/**
 * Add download job to queue
 */
export async function queueDownload(data: {
  downloadId: string;
  userId: string;
  contentId: string;
  mediaUrl: string;
  quality?: 'auto' | '1080p' | '720p' | '480p' | '360p';
  fileSize?: bigint | number;
}) {
  if (!downloadQueue) {
    console.warn('⚠️  Download queue not available. Skipping job.');
    return null;
  }

  return downloadQueue.add('download', data, {
    priority: 1,
    jobId: `download-${data.downloadId}`,
  });
}

/**
 * Get download queue status
 */
export async function getDownloadQueueStatus() {
  if (!downloadQueue) {
    return null;
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    downloadQueue.getWaitingCount(),
    downloadQueue.getActiveCount(),
    downloadQueue.getCompletedCount(),
    downloadQueue.getFailedCount(),
    downloadQueue.getDelayedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
  };
}

