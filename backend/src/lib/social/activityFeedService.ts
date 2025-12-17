/**
 * Activity Feed Service
 * Tracks and manages user activity feed
 */

import { prisma } from '../prisma';
import logger from '../logger';

export interface CreateActivityInput {
  userId: string;
  actorId: string;
  type: 'upload' | 'like' | 'comment' | 'follow' | 'playlist_create' | 'collection_create';
  targetType: 'content' | 'playlist' | 'user' | 'collection';
  targetId: string;
  metadata?: Record<string, any>;
}

/**
 * Create activity feed entry
 */
export async function createActivity(input: CreateActivityInput) {
  const activity = await prisma.activityFeed.create({
    data: {
      userId: input.userId,
      actorId: input.actorId,
      type: input.type,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata || null,
    },
  });

  logger.debug('Activity created', { activityId: activity.id, type: input.type });

  return activity;
}

/**
 * Get activity feed for user
 */
export async function getActivityFeed(
  userId: string,
  options: {
    limit?: number;
    offset?: number;
    type?: string;
  } = {}
) {
  const { limit = 50, offset = 0, type } = options;

  const where: any = {
    userId,
  };

  if (type) {
    where.type = type;
  }

  const activities = await prisma.activityFeed.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: limit,
    skip: offset,
  });

  // Enrich with actor information
  const enrichedActivities = await Promise.all(
    activities.map(async (activity) => {
      const actor = await prisma.user.findUnique({
        where: { id: activity.actorId },
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      });

      return {
        ...activity,
        actor,
      };
    })
  );

  return enrichedActivities;
}

/**
 * Get activity text for display
 */
export function getActivityText(activity: any): string {
  const actorName = activity.actor?.display_name || activity.actor?.username || 'Someone';
  
  switch (activity.type) {
    case 'upload':
      return `${actorName} uploaded new content`;
    case 'like':
      return `${actorName} liked content`;
    case 'comment':
      return `${actorName} commented on content`;
    case 'follow':
      return `${actorName} started following`;
    case 'playlist_create':
      return `${actorName} created a playlist`;
    case 'collection_create':
      return `${actorName} created a collection`;
    default:
      return `${actorName} performed an action`;
  }
}

/**
 * Track content upload activity
 */
export async function trackUploadActivity(contentId: string, creatorId: string) {
  // Get creator's user ID
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    select: { user_id: true },
  });

  if (!creator) return;

  // Get creator's followers
  const followers = await prisma.follow.findMany({
    where: {
      followingId: creator.user_id,
      notificationsEnabled: true,
    },
    select: {
      followerId: true,
    },
  });

  // Create activity for each follower
  await Promise.all(
    followers.map(follower =>
      createActivity({
        userId: follower.followerId,
        actorId: creator.user_id,
        type: 'upload',
        targetType: 'content',
        targetId: contentId,
      })
    )
  );
}

/**
 * Track like activity
 */
export async function trackLikeActivity(contentId: string, userId: string, contentCreatorId: string) {
  // Get content creator's user ID
  const creator = await prisma.creator.findUnique({
    where: { id: contentCreatorId },
    select: { user_id: true },
  });

  if (!creator) return;

  // Create activity for content creator
  await createActivity({
    userId: creator.user_id,
    actorId: userId,
    type: 'like',
    targetType: 'content',
    targetId: contentId,
  });
}

/**
 * Track follow activity
 */
export async function trackFollowActivity(followerId: string, followingId: string) {
  // Create activity for the person being followed
  await createActivity({
    userId: followingId,
    actorId: followerId,
    type: 'follow',
    targetType: 'user',
    targetId: followingId,
  });
}

