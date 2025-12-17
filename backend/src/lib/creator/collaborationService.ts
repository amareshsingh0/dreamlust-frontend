/**
 * Collaboration Service
 * Manages multi-creator collaboration on content
 */

import { prisma } from '../prisma';
import { NotFoundError, UnauthorizedError } from '../errors';
import logger from '../logger';

export interface Collaborator {
  userId: string;
  role: 'editor' | 'viewer';
  permissions: string[];
}

export interface CreateCollaborationInput {
  contentId: string;
  ownerId: string;
  collaborators: Collaborator[];
}

/**
 * Create or update collaboration
 */
export async function createCollaboration(input: CreateCollaborationInput) {
  // Verify content exists and user is owner
  const content = await prisma.content.findUnique({
    where: { id: input.contentId },
    select: { creatorId: true },
  });

  if (!content) {
    throw new NotFoundError('Content not found');
  }

  // Verify owner is the content creator
  const creator = await prisma.creator.findUnique({
    where: { user_id: input.ownerId },
    select: { id: true },
  });

  if (!creator || creator.id !== content.creatorId) {
    throw new UnauthorizedError('Only content owner can manage collaborations');
  }

  const collaboration = await prisma.collaboration.upsert({
    where: { contentId: input.contentId },
    create: {
      contentId: input.contentId,
      ownerId: input.ownerId,
      collaborators: input.collaborators as any,
      status: 'active',
    },
    update: {
      collaborators: input.collaborators as any,
    },
  });

  logger.info('Collaboration created/updated', {
    contentId: input.contentId,
    collaboratorCount: input.collaborators.length,
  });

  return collaboration;
}

/**
 * Get collaboration for content
 */
export async function getCollaboration(contentId: string) {
  const collaboration = await prisma.collaboration.findUnique({
    where: { contentId },
    include: {
      owner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      },
    },
  });

  if (!collaboration) {
    return null;
  }

  // Enrich collaborators with user data
  const collaborators = collaboration.collaborators as Collaborator[];
  const enrichedCollaborators = await Promise.all(
    collaborators.map(async (collab) => {
      const user = await prisma.user.findUnique({
        where: { id: collab.userId },
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar: true,
        },
      });

      return {
        ...collab,
        user,
      };
    })
  );

  return {
    ...collaboration,
    collaborators: enrichedCollaborators,
  };
}

/**
 * Add collaborator to content
 */
export async function addCollaborator(
  contentId: string,
  ownerId: string,
  collaborator: Collaborator
) {
  const collaboration = await prisma.collaboration.findUnique({
    where: { contentId },
  });

  const collaborators = collaboration
    ? (collaboration.collaborators as Collaborator[])
    : [];

  // Check if collaborator already exists
  if (collaborators.some(c => c.userId === collaborator.userId)) {
    throw new Error('Collaborator already exists');
  }

  collaborators.push(collaborator);

  await createCollaboration({
    contentId,
    ownerId,
    collaborators,
  });
}

/**
 * Update collaborator role
 */
export async function updateCollaborator(
  contentId: string,
  ownerId: string,
  userId: string,
  role: 'editor' | 'viewer',
  permissions?: string[]
) {
  const collaboration = await prisma.collaboration.findUnique({
    where: { contentId },
  });

  if (!collaboration) {
    throw new NotFoundError('Collaboration not found');
  }

  const collaborators = collaboration.collaborators as Collaborator[];
  const collaboratorIndex = collaborators.findIndex(c => c.userId === userId);

  if (collaboratorIndex === -1) {
    throw new NotFoundError('Collaborator not found');
  }

  collaborators[collaboratorIndex] = {
    userId,
    role,
    permissions: permissions || collaborators[collaboratorIndex].permissions,
  };

  await createCollaboration({
    contentId,
    ownerId,
    collaborators,
  });
}

/**
 * Remove collaborator
 */
export async function removeCollaborator(
  contentId: string,
  ownerId: string,
  userId: string
) {
  const collaboration = await prisma.collaboration.findUnique({
    where: { contentId },
  });

  if (!collaboration) {
    throw new NotFoundError('Collaboration not found');
  }

  const collaborators = (collaboration.collaborators as Collaborator[]).filter(
    c => c.userId !== userId
  );

  await createCollaboration({
    contentId,
    ownerId,
    collaborators,
  });
}

/**
 * Check if user has permission to edit content
 */
export async function canUserEditContent(contentId: string, userId: string): Promise<boolean> {
  // Check if user is content owner
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: {
        select: { user_id: true },
      },
    },
  });

  if (!content) {
    return false;
  }

  if (content.creator.user_id === userId) {
    return true;
  }

  // Check if user is a collaborator with editor role
  const collaboration = await prisma.collaboration.findUnique({
    where: { contentId },
  });

  if (!collaboration) {
    return false;
  }

  const collaborators = collaboration.collaborators as Collaborator[];
  const collaborator = collaborators.find(c => c.userId === userId);

  return collaborator?.role === 'editor' || false;
}

/**
 * Check if user can view content (for private drafts)
 */
export async function canUserViewContent(contentId: string, userId: string): Promise<boolean> {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      creator: {
        select: { user_id: true },
      },
    },
  });

  if (!content) {
    return false;
  }

  // Public content is viewable by all
  if (content.isPublic && content.status === 'PUBLISHED') {
    return true;
  }

  // Owner can always view
  if (content.creator.user_id === userId) {
    return true;
  }

  // Check if user is a collaborator
  const collaboration = await prisma.collaboration.findUnique({
    where: { contentId },
  });

  if (!collaboration) {
    return false;
  }

  const collaborators = collaboration.collaborators as Collaborator[];
  return collaborators.some(c => c.userId === userId);
}

