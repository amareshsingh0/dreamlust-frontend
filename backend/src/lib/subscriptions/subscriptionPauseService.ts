/**
 * Subscription Pause Service
 * Handles subscription pause/resume logic
 */

import { prisma } from '../prisma';

/**
 * Process subscription pauses - resume subscriptions that have reached resume date
 */
export async function processSubscriptionPauses(): Promise<void> {
  const now = new Date();
  
  // Find subscriptions that should be resumed
  const pausesToResume = await prisma.subscriptionPause.findMany({
    where: {
      resumeAt: {
        lte: now,
      },
    },
    include: {
      subscription: true,
    },
  });

  for (const pause of pausesToResume) {
    // Resume subscription
    await prisma.userSubscription.update({
      where: { id: pause.subscriptionId },
      data: {
        status: 'active',
      },
    });

    // Delete pause record
    await prisma.subscriptionPause.delete({
      where: { id: pause.id },
    });

    console.log(`Resumed subscription ${pause.subscriptionId}`);
  }
}


