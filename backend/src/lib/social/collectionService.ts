/**
 * Collection Service
 * Manages collaborative collections (playlists)
 */

import { prisma } from '../prisma';
import { NotFoundError, UnauthorizedError } from '../errors';
import { createActivity } from './activityFeedService';
import logger from '../logger';

export interface CreateCollectionInput {
  name: string;
  description?: string;
  ownerId: string;
  isPublic?: boolean;
  isCollaborative?: boolean;
  contributors?: string[];
  thumbnailUrl?: string;
}

/**
 * Create a new collection
 */
export async function createCollection(input: CreateCollectionInput) {
  const collection = await prisma.collection.create({
    data: {
      name: input.name,
      description: input.description,
      ownerId: input.ownerId,
      isPublic: input.isPublic ?? true,
      isCollaborative: input.isCollaborative ?? false,
      contributors: input.contributors || [],
      thumbnailUrl: input.thumbnailUrl,
      followers: 0,
    },
  });

  // Track activity
  await createActivity({
    userId: input.ownerId,
    actorId: input.ownerId,
    type: 'collection_create',
    targetType: 'collection',
    targetId: collection.id,
  });

  logger.info('Collection created', { collectionId: collection.id, ownerId: input.ownerId });

  return collection;
}

/**
 * Get collection by ID
 */
export async function getCollection(collectionId: string, userId?: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
      items: {
        include: {
          content: {
            include: {
              creator: {
                select: {
                  id: true,
                  handle: true,
                  display_name: true,
                  avatar: true,
                },
              },
            },
          },
        },
        orderBy: {
          position: 'asc',
        },
      },
    },
  });

  if (!collection) {
    throw new NotFoundError('Collection not found');
  }

  // Check access permissions
  if (!collection.isPublic && collection.ownerId !== userId) {
    if (!collection.isCollaborative || !collection.contributors.includes(userId || '')) {
      throw new UnauthorizedError('Collection is private');
    }
  }

  return collection;
}

/**
 * Add content to collection
 */
export async function addToCollection(
  collectionId: string,
  contentId: string,
  userId: string,
  note?: string
) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new NotFoundError('Collection not found');
  }

  // Check permissions
  if (collection.ownerId !== userId) {
    if (!collection.isCollaborative || !collection.contributors.includes(userId)) {
      throw new UnauthorizedError('You do not have permission to add to this collection');
    }
  }

  // Get current max position
  const maxPosition = await prisma.collectionItem.findFirst({
    where: { collectionId },
    orderBy: { position: 'desc' },
    select: { position: true },
  });

  const newPosition = (maxPosition?.position || 0) + 1;

  const item = await prisma.collectionItem.create({
    data: {
      collectionId,
      contentId,
      addedById: userId,
      position: newPosition,
      note: note || null,
    },
  });

  logger.info('Content added to collection', { collectionId, contentId, userId });

  return item;
}

/**
 * Remove content from collection
 */
export async function removeFromCollection(collectionId: string, contentId: string, userId: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new NotFoundError('Collection not found');
  }

  // Check permissions
  if (collection.ownerId !== userId) {
    const item = await prisma.collectionItem.findFirst({
      where: {
        collectionId,
        contentId,
        addedById: userId,
      },
    });

    if (!item) {
      throw new UnauthorizedError('You can only remove items you added');
    }
  }

  await prisma.collectionItem.deleteMany({
    where: {
      collectionId,
      contentId,
    },
  });

  logger.info('Content removed from collection', { collectionId, contentId, userId });
}

/**
 * Get featured collections
 */
export async function getFeaturedCollections(limit: number = 10) {
  return await prisma.collection.findMany({
    where: {
      isPublic: true,
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: {
      followers: 'desc',
    },
    take: limit,
  });
}

/**
 * Get trending collections
 */
export async function getTrendingCollections(limit: number = 20) {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  return await prisma.collection.findMany({
    where: {
      isPublic: true,
      createdAt: {
        gte: weekAgo,
      },
    },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
      _count: {
        select: {
          items: true,
        },
      },
    },
    orderBy: {
      followers: 'desc',
    },
    take: limit,
  });
}

/**
 * Follow a collection
 */
export async function followCollection(collectionId: string, userId: string) {
  // For now, just increment follower count
  // In a full implementation, you'd have a CollectionFollow model
  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      followers: {
        increment: 1,
      },
    },
  });
}

/**
 * Add contributor to collection
 */
export async function addContributor(collectionId: string, ownerId: string, contributorId: string) {
  const collection = await prisma.collection.findUnique({
    where: { id: collectionId },
  });

  if (!collection) {
    throw new NotFoundError('Collection not found');
  }

  if (collection.ownerId !== ownerId) {
    throw new UnauthorizedError('Only collection owner can add contributors');
  }

  const contributors = [...collection.contributors];
  if (!contributors.includes(contributorId)) {
    contributors.push(contributorId);
  }

  await prisma.collection.update({
    where: { id: collectionId },
    data: {
      contributors,
      isCollaborative: true,
    },
  });
}


