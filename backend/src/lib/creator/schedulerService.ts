/**
 * Content Scheduler Service
 * Handles scheduling content for future publication
 */

import { prisma } from '../prisma';
import { queueNotification } from '../queues/queueManager';
import logger from '../logger';

export interface ScheduleContentInput {
  contentId: string;
  publishAt: Date;
  notifyFollowers?: boolean;
  socialMediaCrosspost?: {
    twitter?: boolean;
    instagram?: boolean;
  };
}

/**
 * Schedule content for future publication
 */
export async function scheduleContent(input: ScheduleContentInput) {
  const scheduled = await prisma.scheduledContent.create({
    data: {
      contentId: input.contentId,
      publishAt: input.publishAt,
      notifyFollowers: input.notifyFollowers ?? true,
      socialMediaCrosspost: input.socialMediaCrosspost || null,
      status: 'scheduled',
    },
    include: {
      content: {
        include: {
          creator: true,
        },
      },
    },
  });

  // Update content scheduledAt field
  await prisma.content.update({
    where: { id: input.contentId },
    data: { scheduledAt: input.publishAt },
  });

  logger.info('Content scheduled', { contentId: input.contentId, publishAt: input.publishAt });

  return scheduled;
}

/**
 * Publish scheduled content
 */
export async function publishScheduledContent(scheduledId: string) {
  const scheduled = await prisma.scheduledContent.findUnique({
    where: { id: scheduledId },
    include: {
      content: {
        include: {
          creator: true,
        },
      },
    },
  });

  if (!scheduled || scheduled.status !== 'scheduled') {
    throw new Error('Scheduled content not found or already processed');
  }

  try {
    // Publish the content
    await prisma.content.update({
      where: { id: scheduled.contentId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        scheduledAt: null,
      },
    });

    // Notify followers if enabled
    if (scheduled.notifyFollowers) {
      await notifyFollowers(scheduled.contentId, scheduled.content.creator.id);
    }

    // Crosspost to social media if configured
    if (scheduled.socialMediaCrosspost) {
      await crosspostToSocial(scheduled.contentId, scheduled.socialMediaCrosspost);
    }

    // Update scheduled content status
    await prisma.scheduledContent.update({
      where: { id: scheduledId },
      data: { status: 'published' },
    });

    logger.info('Scheduled content published', { contentId: scheduled.contentId });
  } catch (error) {
    // Mark as failed
    await prisma.scheduledContent.update({
      where: { id: scheduledId },
      data: { status: 'failed' },
    });

    logger.error('Failed to publish scheduled content', { scheduledId, error });
    throw error;
  }
}

/**
 * Notify followers about new content
 */
async function notifyFollowers(contentId: string, creatorId: string) {
  // Get creator's followers
  const followers = await prisma.subscription.findMany({
    where: {
      creator_id: creatorId,
      status: 'ACTIVE',
    },
    select: {
      subscriber_id: true,
    },
  });

  // Queue notifications for each follower
  for (const follower of followers) {
    await queueNotification({
      userId: follower.subscriber_id,
      type: 'NEW_UPLOAD',
      title: 'New Content Available',
      message: 'A creator you follow has published new content',
      link: `/content/${contentId}`,
      metadata: {
        contentId,
        creatorId,
      },
    });
  }

  logger.info('Notified followers', { contentId, followerCount: followers.length });
}

/**
 * Crosspost content to social media
 */
async function crosspostToSocial(
  contentId: string,
  crosspostConfig: { twitter?: boolean; instagram?: boolean }
) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: true,
    },
  });

  if (!content) {
    throw new Error('Content not found');
  }

  // TODO: Implement actual social media API integrations
  // For now, just log the action
  logger.info('Crossposting to social media', {
    contentId,
    crosspostConfig,
    // In production, this would call Twitter/Instagram APIs
  });

  // Example implementation would be:
  // if (crosspostConfig.twitter) {
  //   await twitterClient.post(content);
  // }
  // if (crosspostConfig.instagram) {
  //   await instagramClient.post(content);
  // }
}

/**
 * Get scheduled content that should be published now
 */
export async function getScheduledContentToPublish() {
  const now = new Date();
  
  return await prisma.scheduledContent.findMany({
    where: {
      publishAt: { lte: now },
      status: 'scheduled',
    },
    include: {
      content: true,
    },
  });
}

/**
 * Cancel scheduled content
 */
export async function cancelScheduledContent(contentId: string) {
  const scheduled = await prisma.scheduledContent.findFirst({
    where: {
      contentId,
      status: 'scheduled',
    },
  });

  if (scheduled) {
    await prisma.scheduledContent.update({
      where: { id: scheduled.id },
      data: { status: 'failed' }, // Mark as failed/cancelled
    });

    await prisma.content.update({
      where: { id: contentId },
      data: { scheduledAt: null },
    });
  }
}

