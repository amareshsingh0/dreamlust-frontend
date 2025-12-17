/**
 * Follow Service
 * Manages user following relationships
 */

import { prisma } from '../prisma';
import { NotFoundError } from '../errors';
import { trackFollowActivity } from './activityFeedService';
import logger from '../logger';

/**
 * Follow a user or creator
 */
export async function followUser(
  followerId: string,
  followingId: string,
  followingType: 'user' | 'creator' = 'user'
) {
  if (followerId === followingId) {
    throw new Error('Cannot follow yourself');
  }

  // Check if already following
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (existing) {
    return existing;
  }

  const follow = await prisma.follow.create({
    data: {
      followerId,
      followingId,
      followingType,
      notificationsEnabled: true,
    },
  });

  // Update follower counts
  await updateFollowerCounts(followingId);

  // Track activity
  await trackFollowActivity(followerId, followingId);

  logger.info('User followed', { followerId, followingId, followingType });

  return follow;
}

/**
 * Unfollow a user or creator
 */
export async function unfollowUser(followerId: string, followingId: string) {
  const follow = await prisma.follow.deleteMany({
    where: {
      followerId,
      followingId,
    },
  });

  if (follow.count > 0) {
    // Update follower counts
    await updateFollowerCounts(followingId);
  }

  logger.info('User unfollowed', { followerId, followingId });

  return follow.count > 0;
}

/**
 * Check if user is following another user
 */
export async function isFollowing(followerId: string, followingId: string): Promise<boolean> {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  return !!follow;
}

/**
 * Get followers for a user
 */
export async function getFollowers(userId: string, limit: number = 50, offset: number = 0) {
  const followers = await prisma.follow.findMany({
    where: { followingId: userId },
    include: {
      follower: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return followers.map(f => f.follower);
}

/**
 * Get users that a user is following
 */
export async function getFollowing(userId: string, limit: number = 50, offset: number = 0) {
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    include: {
      following: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip: offset,
  });

  return following.map(f => f.following);
}

/**
 * Update follower counts for a user
 */
async function updateFollowerCounts(userId: string) {
  const followerCount = await prisma.follow.count({
    where: { followingId: userId },
  });

  const followingCount = await prisma.follow.count({
    where: { followerId: userId },
  });

  // Update user's creator profile if they are a creator
  const creator = await prisma.creator.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (creator) {
    await prisma.creator.update({
      where: { id: creator.id },
      data: {
        follower_count: followerCount,
        following_count: followingCount,
      },
    });
  }
}

/**
 * Toggle follow notifications
 */
export async function toggleFollowNotifications(
  followerId: string,
  followingId: string,
  enabled: boolean
) {
  const follow = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId,
        followingId,
      },
    },
  });

  if (!follow) {
    throw new NotFoundError('Follow relationship not found');
  }

  return await prisma.follow.update({
    where: { id: follow.id },
    data: { notificationsEnabled: enabled },
  });
}

