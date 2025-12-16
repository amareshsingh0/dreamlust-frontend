/**
 * Send New Upload Email
 * Sends email notifications to followers when a creator uploads new content
 */

import { prisma } from '../prisma';
import { queueEmailToSend } from './service';

interface Content {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  creatorId: string;
}

interface Creator {
  id: string;
  display_name: string;
  handle?: string;
  avatar?: string;
}

/**
 * Send new upload email to all followers
 */
export async function sendNewUploadEmail(content: Content, creator: Creator) {
  try {
    // Get all active subscriptions (followers) for this creator
    // Note: Subscription model uses subscriber_id which references User
    const subscriptions = await prisma.subscription.findMany({
      where: {
        creator_id: creator.id,
        status: 'ACTIVE',
      },
    });

    if (subscriptions.length === 0) {
      console.log(`[Email] No active subscribers for creator ${creator.id}`);
      return; // No followers to notify
    }

    // Get all subscriber user IDs
    const subscriberIds = subscriptions.map(s => s.subscriber_id);

    // Get all subscribers with their notification preferences
    const subscribers = await prisma.user.findMany({
      where: {
        id: { in: subscriberIds },
      },
      include: {
        notificationPreferences: true,
      },
    });

    if (subscriptions.length === 0) {
      return; // No followers to notify
    }

    // Get creator's user info for better email data
    const creatorUser = await prisma.creator.findUnique({
      where: { id: creator.id },
      select: {
        display_name: true,
        handle: true,
        avatar: true,
      },
    });

    const creatorName = creatorUser?.display_name || creator.display_name;
    const creatorHandle = creatorUser?.handle;

    // Process each follower
    for (const subscriber of subscribers) {
      const prefs = subscriber.notificationPreferences;

      // Check if user wants email notifications for new uploads
      if (!prefs) {
        // No preferences, default to sending
        await queueEmailToSend(
          subscriber.email,
          'newUpload',
          {
            creator: {
              name: creatorName,
              handle: creatorHandle,
              avatar: creatorUser?.avatar,
            },
            content: {
              id: content.id,
              title: content.title,
              description: content.description,
              thumbnailUrl: content.thumbnail,
            },
            user: {
              username: subscriber.username,
              display_name: subscriber.display_name,
            },
          },
          `${creatorName} uploaded: ${content.title}`
        );
        continue;
      }

      // Check preferences
      const emailPrefs = prefs.email as any;
      const shouldSend =
        emailPrefs?.newUpload !== false &&
        !prefs.unsubscribedAll;

      if (shouldSend) {
        await queueEmailToSend(
          subscriber.email,
          'newUpload',
          {
            creator: {
              name: creatorName,
              handle: creatorHandle,
              avatar: creatorUser?.avatar,
            },
            content: {
              id: content.id,
              title: content.title,
              description: content.description,
              thumbnailUrl: content.thumbnail,
            },
            user: {
              username: subscriber.username,
              display_name: subscriber.display_name,
            },
          },
          `${creatorName} uploaded: ${content.title}`
        );
      }
    }

    console.log(`[Email] Queued new upload emails for ${subscribers.length} followers`);
  } catch (error) {
    console.error('[Email] Failed to send new upload emails:', error);
    // Don't throw - we don't want to fail content upload if email fails
  }
}

