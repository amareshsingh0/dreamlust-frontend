/**
 * Cron Service
 * Manages scheduled tasks using node-cron
 */

import cron, { ScheduledTask } from 'node-cron';
import { identifyChurnRisk } from '../subscriptions/churnPrediction';
import { processSubscriptionPauses } from '../subscriptions/subscriptionPauseService';
import { generateAutomaticCohorts } from '../analytics/cohortGeneration';
import { calculateAllCohortMetrics } from '../analytics/cohortAnalysis';

let cronJobs: ScheduledTask[] = [];

/**
 * Start all cron jobs
 */
export function startCronJobs() {
  console.log('Starting cron jobs...');

  // Churn prediction - Run daily at 2 AM
  const churnJob = cron.schedule('0 2 * * *', async () => {
    console.log('Running churn prediction job...');
    try {
      await identifyChurnRisk();
      console.log('Churn prediction job completed');
    } catch (error) {
      console.error('Churn prediction job failed:', error);
    }
  }, {
    timezone: 'UTC',
  });
  cronJobs.push(churnJob);

  // Subscription pause processing - Run every hour
  const pauseJob = cron.schedule('0 * * * *', async () => {
    console.log('Processing subscription pauses...');
    try {
      await processSubscriptionPauses();
      console.log('Subscription pause processing completed');
    } catch (error) {
      console.error('Subscription pause processing failed:', error);
    }
  }, {
    timezone: 'UTC',
  });
  cronJobs.push(pauseJob);

  // Retention campaign follow-up - Run daily at 10 AM
  const retentionJob = cron.schedule('0 10 * * *', async () => {
    console.log('Running retention campaign follow-up...');
    try {
      // Check for users who received campaigns but haven't returned
      // This will be handled by retention analytics
      console.log('Retention campaign follow-up completed');
    } catch (error) {
      console.error('Retention campaign follow-up failed:', error);
    }
  }, {
    timezone: 'UTC',
  });
  cronJobs.push(retentionJob);

  // Cohort generation and metrics - Run weekly on Monday at 2 AM
  const cohortJob = cron.schedule('0 2 * * 1', async () => {
    console.log('Running weekly cohort generation and metrics calculation...');
    try {
      // Generate automatic cohorts
      await generateAutomaticCohorts();

      // Calculate metrics for all cohorts
      await calculateAllCohortMetrics();

      console.log('Weekly cohort job completed');
    } catch (error) {
      console.error('Weekly cohort job failed:', error);
    }
  }, {
    timezone: 'UTC',
  });
  cronJobs.push(cohortJob);

  console.log(`Started ${cronJobs.length} cron jobs`);
}

/**
 * Stop all cron jobs
 */
export function stopCronJobs() {
  console.log('Stopping cron jobs...');
  cronJobs.forEach(job => job.stop());
  cronJobs = [];
  console.log('All cron jobs stopped');
}

/**
 * Manually trigger churn prediction (for testing)
 */
export async function triggerChurnPrediction() {
  console.log('Manually triggering churn prediction...');
  await identifyChurnRisk();
}

