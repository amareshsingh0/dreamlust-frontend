/**
 * Query Optimization Utilities
 * Provides optimized query patterns to avoid N+1 problems
 */

import { Prisma } from '@prisma/client';

/**
 * Standard content include for optimized queries
 * Includes all related data in a single query to avoid N+1
 */
export const contentInclude = {
  creator: {
    select: {
      id: true,
      handle: true,
      display_name: true,
      avatar: true,
      is_verified: true,
      follower_count: true,
    },
  },
  categories: {
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
          icon: true,
        },
      },
    },
  },
  tags: {
    include: {
      tag: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  },
} satisfies Prisma.ContentInclude;

/**
 * Optimized content query with all relations
 * Use this instead of fetching content and then creator/categories separately
 */
export function getOptimizedContentQuery(where?: Prisma.ContentWhereInput) {
  return {
    where: {
      ...where,
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
    },
    include: contentInclude,
  };
}

/**
 * Optimized content list query
 * Fetches content with creator, categories, and tags in a single query
 */
export async function getContentList(
  prisma: any,
  options: {
    where?: Prisma.ContentWhereInput;
    orderBy?: Prisma.ContentOrderByWithRelationInput | Prisma.ContentOrderByWithRelationInput[];
    take?: number;
    skip?: number;
  } = {}
) {
  return prisma.content.findMany({
    ...getOptimizedContentQuery(options.where),
    orderBy: options.orderBy || { publishedAt: 'desc' },
    take: options.take,
    skip: options.skip,
  });
}

/**
 * Optimized content by category query
 * Uses index on categoryId for fast lookups
 */
export async function getContentByCategory(
  prisma: any,
  categoryId: string,
  options: {
    orderBy?: Prisma.ContentOrderByWithRelationInput;
    take?: number;
    skip?: number;
  } = {}
) {
  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      categories: {
        some: {
          categoryId,
        },
      },
    },
    include: contentInclude,
    orderBy: options.orderBy || { publishedAt: 'desc' },
    take: options.take,
    skip: options.skip,
  });
}

/**
 * Optimized content by creator query
 * Uses index on creatorId for fast lookups
 */
export async function getContentByCreator(
  prisma: any,
  creatorId: string,
  options: {
    orderBy?: Prisma.ContentOrderByWithRelationInput;
    take?: number;
    skip?: number;
  } = {}
) {
  return prisma.content.findMany({
    where: {
      creatorId,
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
    },
    include: contentInclude,
    orderBy: options.orderBy || { viewCount: 'desc' },
    take: options.take,
    skip: options.skip,
  });
}

/**
 * Optimized trending content query
 * Uses indexes on viewCount and publishedAt
 */
export async function getTrendingContent(
  prisma: any,
  options: {
    take?: number;
    hoursSincePublish?: number; // Only include content published within this time
  } = {}
) {
  const { take = 20, hoursSincePublish = 168 } = options;
  const since = new Date(Date.now() - hoursSincePublish * 60 * 60 * 1000);

  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      publishedAt: {
        gte: since,
      },
    },
    include: contentInclude,
    orderBy: [
      { viewCount: 'desc' },
      { likeCount: 'desc' },
      { publishedAt: 'desc' },
    ],
    take,
  });
}

