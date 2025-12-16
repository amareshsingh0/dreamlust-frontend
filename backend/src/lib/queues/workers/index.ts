/**
 * Workers Index
 * Exports all workers for easy initialization
 */

export { createVideoProcessingWorker } from './videoProcessingWorker';
export { createThumbnailWorker } from './thumbnailWorker';
export { createNotificationWorker } from './notificationWorker';
export { createTrendingWorker } from './trendingWorker';
export { createRecommendationsWorker } from './recommendationsWorker';
export { createCleanupWorker } from './cleanupWorker';
export { createAnalyticsWorker } from './analyticsWorker';
export { createEmailWorker } from './emailWorker';

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
  ].filter(Boolean); // Remove null workers (when Redis is not available)

  console.log(`✅ Initialized ${workers.length} background workers`);

  // Schedule recurring jobs
  import('../queueManager').then(({ queueTrendingCalculation, queueCleanup, queueAnalyticsAggregation }) => {
    // Schedule trending calculation (runs every 6 hours)
    queueTrendingCalculation();
    // Schedule cleanup (runs daily at 2 AM)
    queueCleanup();
    // Schedule analytics aggregation (runs every hour)
    queueAnalyticsAggregation();
  });

  return workers;
}
