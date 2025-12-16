/**
 * Notification Service
 * Handles in-app notifications and email notifications
 */

import { prisma } from '../prisma';
import { queueEmailToSend } from '../email/service';
import { sendPushNotification } from '../push/service';

export type NotificationType = 
  | 'upload' 
  | 'like' 
  | 'comment' 
  | 'tip' 
  | 'milestone' 
  | 'system'
  | 'follower'
  | 'subscriber';

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  sendEmail?: boolean;
}

/**
 * Get or create notification preferences for user
 */
export async function getNotificationPreferences(userId: string) {
  let preferences = await prisma.notificationPreferences.findUnique({
    where: { userId },
  });

  if (!preferences) {
    // Create default preferences
    preferences = await prisma.notificationPreferences.create({
      data: {
        userId,
        email: {
          newUpload: true,
          likes: true,
          comments: true,
          tips: true,
          milestones: true,
          system: true,
        },
        push: {
          newUpload: true,
          likes: true,
          comments: true,
          tips: true,
          milestones: true,
          system: true,
        },
        inApp: {
          newUpload: true,
          likes: true,
          comments: true,
          tips: true,
          milestones: true,
          system: true,
        },
        frequency: 'instant',
        unsubscribedAll: false,
      },
    });
  }

  return preferences;
}

/**
 * Check if user wants to receive email for this notification type
 */
async function shouldSendEmail(userId: string, type: NotificationType): Promise<boolean> {
  const preferences = await getNotificationPreferences(userId);
  
  if (preferences.unsubscribedAll) {
    return false;
  }

  const emailPrefs = preferences.email as any;
  const typeMap: Record<NotificationType, string> = {
    upload: 'newUpload',
    like: 'likes',
    comment: 'comments',
    tip: 'tips',
    milestone: 'milestones',
    system: 'system',
    follower: 'followers',
    subscriber: 'subscribers',
  };

  const prefKey = typeMap[type] || 'system';
  return emailPrefs[prefKey] !== false;
}

/**
 * Create a notification
 */
export async function createNotification(params: CreateNotificationParams) {
  const { userId, type, title, message, link, metadata, sendEmail } = params;

  // Check if user wants in-app notifications
  const preferences = await getNotificationPreferences(userId);
  const inAppPrefs = preferences.inApp as any;
  const typeMap: Record<NotificationType, string> = {
    upload: 'newUpload',
    like: 'likes',
    comment: 'comments',
    tip: 'tips',
    milestone: 'milestones',
    system: 'system',
    follower: 'followers',
    subscriber: 'subscribers',
  };

  const prefKey = typeMap[type] || 'system';
  const shouldCreateInApp = inAppPrefs[prefKey] !== false;

  // Create in-app notification
  let notification = null;
  if (shouldCreateInApp) {
    // Map notification type to enum
    const typeMap: Record<NotificationType, string> = {
      upload: 'NEW_UPLOAD',
      like: 'NEW_LIKE',
      comment: 'NEW_COMMENT',
      tip: 'PAYMENT_RECEIVED',
      milestone: 'SYSTEM_ANNOUNCEMENT',
      system: 'SYSTEM_ANNOUNCEMENT',
      follower: 'NEW_FOLLOWER',
      subscriber: 'NEW_SUBSCRIBER',
    };

    notification = await prisma.notification.create({
      data: {
        user_id: userId,
        type: (typeMap[type] || 'SYSTEM_ANNOUNCEMENT') as any,
        title,
        message,
        link,
        metadata: metadata || {},
        is_read: false,
      },
    });
  }

  // Send email if requested and user preferences allow
  if (sendEmail !== false) {
    const shouldEmail = await shouldSendEmail(userId, type);
    if (shouldEmail) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user?.email) {
        const emailTemplateMap: Record<NotificationType, string> = {
          upload: 'newUpload',
          like: 'newLike',
          comment: 'newComment',
          tip: 'newTip',
          milestone: 'milestone',
          system: 'system',
          follower: 'system',
          subscriber: 'system',
        };

        const template = emailTemplateMap[type] || 'system';
        await queueEmailToSend(user.email, template, {
          ...metadata,
          title,
          message,
          link,
        });
      }
    }
  }

  // Send push notification if user preferences allow
  const shouldSendPush = await shouldSendPushNotification(userId, type);
  if (shouldSendPush) {
    await sendPushNotification(userId, {
      title,
      body: message,
      url: link,
      data: metadata,
      tag: type,
    });
  }

  return notification;
}

/**
 * Check if user wants to receive push notifications for this type
 */
async function shouldSendPushNotification(userId: string, type: NotificationType): Promise<boolean> {
  const preferences = await getNotificationPreferences(userId);
  
  if (preferences.unsubscribedAll) {
    return false;
  }

  const pushPrefs = preferences.push as any;
  const typeMap: Record<NotificationType, string> = {
    upload: 'newUpload',
    like: 'likes',
    comment: 'comments',
    tip: 'tips',
    milestone: 'milestones',
    system: 'system',
    follower: 'followers',
    subscriber: 'subscribers',
  };

  const prefKey = typeMap[type] || 'system';
  return pushPrefs[prefKey] !== false;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: string, userId: string) {
  return prisma.notification.updateMany({
    where: {
      id: notificationId,
      user_id: userId,
    },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });
}

/**
 * Mark all notifications as read for user
 */
export async function markAllNotificationsAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: {
      user_id: userId,
      is_read: false,
    },
    data: {
      is_read: true,
      read_at: new Date(),
    },
  });
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({
    where: {
      user_id: userId,
      is_read: false,
    },
  });
}

