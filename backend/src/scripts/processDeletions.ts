/**
 * Account Deletion Processing Script
 * Run this daily via cron job: 0 2 * * * (2 AM daily)
 * Or use a task scheduler
 */

import { scheduleAccountDeletionProcessing } from '../lib/accountDeletion';

// Run immediately if called directly
if (import.meta.main) {
  scheduleAccountDeletionProcessing()
    .then(() => {
      console.log('Account deletion processing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Account deletion processing failed:', error);
      process.exit(1);
    });
}

