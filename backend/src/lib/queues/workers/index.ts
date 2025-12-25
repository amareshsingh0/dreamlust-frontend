/**
 * Workers Index
 * Exports all workers for easy initialization
 */

import { createVideoProcessingWorker } from './videoProcessingWorker';
import { createThumbnailWorker } from './thumbnailWorker';
import { createNotificationWorker } from './notificationWorker';
import { createTrendingWorker } from './trendingWorker';
import { createRecommendationsWorker } from './recommendationsWorker';
import { createCleanupWorker } from './cleanupWorker';
import { createAnalyticsWorker } from './analyticsWorker';
import { createEmailWorker } from './emailWorker';
import { createSchedulerWorker } from './schedulerWorker';
import { createDownloadWorker } from './downloadWorker';

export { createVideoProcessingWorker };
export { createThumbnailWorker };
export { createNotificationWorker };
export { createTrendingWorker };
export { createRecommendationsWorker };
export { createCleanupWorker };
export { createAnalyticsWorker };
export { createEmailWorker };
export { createSchedulerWorker };
export { createDownloadWorker };

/**
 * Initialize all workers
 * Call this when starting the application
 */
export function initializeWorkers() {
  const workers = [
    createVideoProcessingWorker(),
    createThumbnailWorker(),
    createNotificationWorker(),
    createTrendingWorker(),
    createRecommendationsWorker(),
    createCleanupWorker(),
    createAnalyticsWorker(),
    createEmailWorker(),
    createSchedulerWorker(),
    createDownloadWorker(),
  ].filter(Boolean); // Remove null workers (when Redis is not available)

  console.log(`✅ Initialized ${workers.length} background workers`);

  // Schedule recurring jobs (only if Redis is available and workers are running)
  if (workers.length > 0) {
    import('../queueManager').then(({ queueTrendingCalculation, queueCleanup, queueAnalyticsAggregation, queueScheduledContentProcessing }) => {
      // Schedule trending calculation (runs every 6 hours)
      queueTrendingCalculation();
      // Schedule cleanup (runs daily at 2 AM)
      queueCleanup();
      // Schedule analytics aggregation (runs every hour)
      queueAnalyticsAggregation();
      // Schedule content scheduler (runs every 5 minutes)
      queueScheduledContentProcessing();
    }).catch((error) => {
      console.warn('Failed to schedule recurring jobs:', error);
    });
  } else {
    console.warn('⚠️  No workers initialized. Make sure Redis is running and REDIS_URL is set in .env');
  }

  return workers;
}
