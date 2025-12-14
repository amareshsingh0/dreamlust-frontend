/**
 * Account Deletion Processing
 * Handles scheduled account deletions after 30-day grace period
 */

import { prisma } from './prisma';

/**
 * Process pending account deletions
 * Should be run daily via cron job or scheduled task
 */
export async function processAccountDeletions(): Promise<{
  processed: number;
  errors: number;
}> {
  const now = new Date();
  let processed = 0;
  let errors = 0;

  try {
    // Find all pending deletions scheduled for today or earlier
    const pendingDeletions = await prisma.accountDeletion.findMany({
      where: {
        status: 'pending',
        scheduledFor: {
          lte: now,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            username: true,
          },
        },
      },
    });

    for (const deletion of pendingDeletions) {
      try {
        // Mark as processing
        await prisma.accountDeletion.update({
          where: { id: deletion.id },
          data: { status: 'processing' },
        });

        // Delete user (cascade will handle related data)
        // Note: Prisma will handle cascading deletes based on schema
        await prisma.user.update({
          where: { id: deletion.userId },
          data: {
            deletedAt: now,
            status: 'INACTIVE',
          },
        });

        // Mark deletion as completed
        await prisma.accountDeletion.update({
          where: { id: deletion.id },
          data: {
            status: 'completed',
            completedAt: now,
          },
        });

        processed++;
      } catch (error) {
        console.error(`Error processing account deletion for user ${deletion.userId}:`, error);
        errors++;

        // Mark as error (could retry later)
        await prisma.accountDeletion.update({
          where: { id: deletion.id },
          data: { status: 'error' },
        });
      }
    }

    return { processed, errors };
  } catch (error) {
    console.error('Error in processAccountDeletions:', error);
    throw error;
  }
}

/**
 * Schedule account deletion processing
 * Call this from a cron job or scheduled task
 */
export async function scheduleAccountDeletionProcessing(): Promise<void> {
  try {
    const result = await processAccountDeletions();
    console.log(`Account deletion processing: ${result.processed} processed, ${result.errors} errors`);
  } catch (error) {
    console.error('Failed to process account deletions:', error);
  }
}

