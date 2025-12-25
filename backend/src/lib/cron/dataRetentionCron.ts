/**
 * Data Retention Cron Job
 * Runs daily to clean up old data according to retention policies
 */

import cron from 'node-cron';
import { dataRetentionService } from '../compliance/dataRetention';
import logger from '../logger';

/**
 * Schedule data retention cleanup
 * Runs daily at 2 AM
 */
export function scheduleDataRetention() {
  // Run every day at 2 AM
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled data retention cleanup');

    try {
      const results = await dataRetentionService.executeAllPolicies();

      let totalDeleted = 0;
      let successCount = 0;
      let failureCount = 0;

      for (const [table, count] of results.entries()) {
        if (count === -1) {
          failureCount++;
          logger.error(`Failed to clean ${table}`);
        } else {
          successCount++;
          totalDeleted += count;
          logger.info(`Cleaned ${count} records from ${table}`);
        }
      }

      logger.info(`Data retention completed: ${totalDeleted} total records deleted, ${successCount} succeeded, ${failureCount} failed`);
    } catch (error) {
      logger.error('Data retention job failed:', error);
    }
  });

  logger.info('Data retention cron job scheduled (daily at 2 AM)');
}

/**
 * Run retention immediately (for testing)
 */
export async function runDataRetentionNow() {
  logger.info('Running data retention manually');
  const results = await dataRetentionService.executeAllPolicies();
  return results;
}
