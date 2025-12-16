/**
 * Push Notification Service
 * Handles sending web push notifications
 */

import webpush from 'web-push';
import { prisma } from '../prisma';
import { initializeVAPID } from './vapid';

// Initialize VAPID on module load
const vapidInitialized = initializeVAPID();

interface PushNotification {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  data?: any;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
}

/**
 * Send push notification to a user
 */
export async function sendPushNotification(
  userId: string,
  notification: PushNotification
): Promise<number> {
  if (!vapidInitialized) {
    console.warn('⚠️  VAPID not initialized. Push notification not sent.');
    return 0;
  }

  try {
    // Get all push subscriptions for user
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) {
      return 0; // No subscriptions
    }

    let successCount = 0;
    const payload = JSON.stringify({
      title: notification.title,
      body: notification.body,
      icon: notification.icon || '/icon-192.png',
      badge: notification.badge || '/badge-72.png',
      image: notification.image,
      data: {
        url: notification.url,
        ...notification.data,
      },
      tag: notification.tag,
      requireInteraction: notification.requireInteraction || false,
    });

    // Send to all subscriptions
    const sendPromises = subscriptions.map(async (subscription) => {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys as { p256dh: string; auth: string },
        };

        await webpush.sendNotification(pushSubscription, payload);
        successCount++;
        return true;
      } catch (error: any) {
        // Handle invalid subscriptions
        if (error.statusCode === 410 || error.statusCode === 404) {
          // Subscription expired or invalid, remove it
          await prisma.pushSubscription.delete({
            where: { id: subscription.id },
          });
          console.log(`[Push] Removed invalid subscription for user ${userId}`);
        } else {
          console.error(`[Push] Failed to send notification:`, error);
        }
        return false;
      }
    });

    await Promise.all(sendPromises);
    return successCount;
  } catch (error) {
    console.error('[Push] Error sending push notification:', error);
    return 0;
  }
}

/**
 * Save push subscription
 */
export async function savePushSubscription(
  userId: string,
  subscription: any,
  userAgent?: string,
  device?: string
): Promise<void> {
  try {
    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: {
          userId,
          endpoint: subscription.endpoint,
        },
      },
      update: {
        keys: subscription.keys,
        userAgent,
        device,
        updatedAt: new Date(),
      },
      create: {
        userId,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
        device,
      },
    });
  } catch (error) {
    console.error('[Push] Failed to save subscription:', error);
    throw error;
  }
}

/**
 * Remove push subscription
 */
export async function removePushSubscription(
  userId: string,
  endpoint: string
): Promise<void> {
  try {
    await prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  } catch (error) {
    console.error('[Push] Failed to remove subscription:', error);
    throw error;
  }
}

/**
 * Get user's push subscriptions
 */
export async function getUserPushSubscriptions(userId: string) {
  return prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      id: true,
      endpoint: true,
      device: true,
      createdAt: true,
    },
  });
}

