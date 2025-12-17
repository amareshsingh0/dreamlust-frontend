/**
 * Content Recommendations v2 Service
 * Implements hybrid recommendation engine with session-based tracking,
 * explore/exploit balance, cold start handling, and context-based re-ranking
 */

import { prisma } from '../prisma';
import { getSessionBehavior } from './sessionTracking';

export interface Content {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  duration?: number;
  views: number;
  likes: number;
  createdAt: Date;
  creator: {
    id: string;
    name: string;
    username: string;
    avatar?: string;
    isVerified: boolean;
  };
  type: string;
  quality?: string[];
  tags: string[];
  category: string;
  isPremium: boolean;
  baseScore?: number; // For re-ranking
  categoryIds?: string[];
  tagIds?: string[];
  creatorId?: string;
  mobileOptimized?: boolean;
}

export interface UserContext {
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  device: 'mobile' | 'tablet' | 'desktop';
  recentCategories: string[];
  recentCreators: string[];
}

export interface OnboardingPreferences {
  categories: string[];
  interests?: string[];
}

/**
 * Hybrid Recommendation Engine
 * Combines multiple recommendation strategies:
 * - Collaborative filtering: 40%
 * - Content-based: 30%
 * - Trending: 20%
 * - Diversity: 10%
 */
export async function getRecommendations(
  userId: string | null,
  sessionId: string | null,
  limit: number = 20
): Promise<Content[]> {
  const recommendations = {
    collaborative: await getCollaborativeFiltering(userId, sessionId, Math.ceil(limit * 0.4)),
    contentBased: await getContentBasedFiltering(userId, sessionId, Math.ceil(limit * 0.3)),
    trending: await getTrendingContent(Math.ceil(limit * 0.2)),
    diversity: await getDiverseContent(userId, sessionId, Math.ceil(limit * 0.1)),
  };

  // Combine and deduplicate
  const allContent: Content[] = [];
  const seenIds = new Set<string>();

  // Add collaborative (40%)
  recommendations.collaborative.forEach(item => {
    if (!seenIds.has(item.id)) {
      seenIds.add(item.id);
      allContent.push(item);
    }
  });

  // Add content-based (30%)
  recommendations.contentBased.forEach(item => {
    if (!seenIds.has(item.id) && allContent.length < limit * 0.7) {
      seenIds.add(item.id);
      allContent.push(item);
    }
  });

  // Add trending (20%)
  recommendations.trending.forEach(item => {
    if (!seenIds.has(item.id) && allContent.length < limit * 0.9) {
      seenIds.add(item.id);
      allContent.push(item);
    }
  });

  // Add diversity (10%)
  recommendations.diversity.forEach(item => {
    if (!seenIds.has(item.id) && allContent.length < limit) {
      seenIds.add(item.id);
      allContent.push(item);
    }
  });

  return allContent.slice(0, limit);
}

/**
 * Collaborative Filtering (40%)
 * Finds content based on similar users' preferences
 */
async function getCollaborativeFiltering(
  userId: string | null,
  sessionId: string | null,
  limit: number
): Promise<Content[]> {
  if (userId) {
    // Get user's watch history
    const userViews = await prisma.view.findMany({
      where: { userId },
      select: { contentId: true },
      orderBy: { watchedAt: 'desc' },
      take: 100,
      distinct: ['contentId'],
    });

    const userHistory = userViews.map(v => v.contentId);

    if (userHistory.length === 0) {
      return [];
    }

    // Find similar users (users who watched similar content)
    const similarUsers = await findSimilarUsers(userHistory, userId);

    if (similarUsers.length === 0) {
      return [];
    }

    // Get content watched by similar users but not by current user
    const recommendations = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        id: { notIn: userHistory },
        views: {
          some: {
            userId: { in: similarUsers },
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            display_name: true,
            avatar: true,
            is_verified: true,
          },
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      take: limit * 2,
    });

    return transformContent(recommendations).slice(0, limit);
  } else if (sessionId) {
    // Session-based collaborative filtering
    const sessionBehavior = await getSessionBehavior(sessionId);
    if (sessionBehavior.viewedContent.length === 0) {
      return [];
    }

    // Find content similar to session behavior
    const recommendations = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        id: { notIn: sessionBehavior.viewedContent },
        OR: [
          {
            categories: {
              some: {
                categoryId: { in: sessionBehavior.categories },
              },
            },
          },
          {
            tags: {
              some: {
                tagId: { in: sessionBehavior.tags },
              },
            },
          },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            display_name: true,
            avatar: true,
            is_verified: true,
          },
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      take: limit,
    });

    return transformContent(recommendations);
  }

  return [];
}

/**
 * Content-Based Filtering (30%)
 * Finds content similar to what user has watched
 */
async function getContentBasedFiltering(
  userId: string | null,
  sessionId: string | null,
  limit: number
): Promise<Content[]> {
  let categoryIds: string[] = [];
  let tagIds: string[] = [];
  let creatorIds: string[] = [];
  let excludeIds: string[] = [];

  if (userId) {
    // Get user's recent watch history
    const recentViews = await prisma.view.findMany({
      where: { userId },
      include: {
        content: {
          include: {
            categories: { include: { category: true } },
            tags: { include: { tag: true } },
          },
        },
      },
      orderBy: { watchedAt: 'desc' },
      take: 10,
    });

    excludeIds = recentViews.map(v => v.contentId);
    categoryIds = recentViews.flatMap(v =>
      v.content.categories.map(c => c.categoryId)
    );
    tagIds = recentViews.flatMap(v => v.content.tags.map(t => t.tagId));
    creatorIds = recentViews.map(v => v.content.creatorId);
  } else if (sessionId) {
    const sessionBehavior = await getSessionBehavior(sessionId);
    excludeIds = sessionBehavior.viewedContent;
    categoryIds = sessionBehavior.categories;
    tagIds = sessionBehavior.tags;
    creatorIds = sessionBehavior.creators;
  }

  if (categoryIds.length === 0 && tagIds.length === 0 && creatorIds.length === 0) {
    return [];
  }

  const recommendations = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      id: { notIn: excludeIds },
      OR: [
        { categories: { some: { categoryId: { in: categoryIds } } } },
        { tags: { some: { tagId: { in: tagIds } } } },
        { creatorId: { in: creatorIds } },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          display_name: true,
          avatar: true,
          is_verified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    take: limit,
    orderBy: { viewCount: 'desc' },
  });

  return transformContent(recommendations);
}

/**
 * Trending Content (20%)
 * Popular content from recent period
 */
async function getTrendingContent(limit: number): Promise<Content[]> {
  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - 24);

  const trending = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      publishedAt: { gte: sinceDate },
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          display_name: true,
          avatar: true,
          is_verified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });

  return transformContent(trending);
}

/**
 * Diverse Content (10%)
 * Content from different categories/creators to avoid filter bubbles
 */
async function getDiverseContent(
  userId: string | null,
  sessionId: string | null,
  limit: number
): Promise<Content[]> {
  let excludeIds: string[] = [];
  let excludeCategories: string[] = [];
  let excludeCreators: string[] = [];

  if (userId) {
    const recentViews = await prisma.view.findMany({
      where: { userId },
      include: {
        content: {
          include: {
            categories: { include: { category: true } },
          },
        },
      },
      orderBy: { watchedAt: 'desc' },
      take: 20,
    });

    excludeIds = recentViews.map(v => v.contentId);
    excludeCategories = recentViews.flatMap(v =>
      v.content.categories.map(c => c.categoryId)
    );
    excludeCreators = recentViews.map(v => v.content.creatorId);
  } else if (sessionId) {
    const sessionBehavior = await getSessionBehavior(sessionId);
    excludeIds = sessionBehavior.viewedContent;
    excludeCategories = sessionBehavior.categories;
    excludeCreators = sessionBehavior.creators;
  }

  // Get content from different categories/creators
  const diverse = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      id: { notIn: excludeIds },
      NOT: [
        { categories: { some: { categoryId: { in: excludeCategories } } } },
        { creatorId: { in: excludeCreators } },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          display_name: true,
          avatar: true,
          is_verified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });

  return transformContent(diverse);
}

/**
 * Explore vs Exploit Balance
 * 80% personalized, 20% discovery (random popular content)
 */
export function balanceRecommendations(
  personalized: Content[],
  explore: Content[],
  limit: number = 20
): Content[] {
  const recommendations: Content[] = [];
  const personalizedCopy = [...personalized];
  const exploreCopy = [...explore];
  const seenIds = new Set<string>();

  for (let i = 0; i < limit; i++) {
    if (Math.random() < 0.8 && personalizedCopy.length > 0) {
      const item = personalizedCopy.shift()!;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        recommendations.push(item);
      }
    } else if (exploreCopy.length > 0) {
      const item = exploreCopy.shift()!;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        recommendations.push(item);
      }
    } else if (personalizedCopy.length > 0) {
      const item = personalizedCopy.shift()!;
      if (!seenIds.has(item.id)) {
        seenIds.add(item.id);
        recommendations.push(item);
      }
    }
  }

  return recommendations;
}

/**
 * Cold Start Problem Solution
 * Handles new users with onboarding quiz and popular content
 */
export async function handleNewUser(
  userId: string,
  preferences?: OnboardingPreferences
): Promise<Content[]> {
  // Step 1: Get onboarding preferences (if available)
  const userPreferences = preferences || await getOnboardingPreferences(userId);

  // Step 2: Show most popular content in selected categories
  const initialRecommendations = await prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      ...(userPreferences.categories.length > 0 && {
        categories: {
          some: {
            categoryId: { in: userPreferences.categories },
          },
        },
      }),
      viewCount: { gt: 10000 },
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          display_name: true,
          avatar: true,
          is_verified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: 50,
  });

  return transformContent(initialRecommendations);
}

/**
 * Get onboarding preferences from user preferences or defaults
 */
async function getOnboardingPreferences(userId: string): Promise<OnboardingPreferences> {
  const preferences = await prisma.userPreferences.findUnique({
    where: { user_id: userId },
  });

  // If user has preferences, extract categories
  // For now, return empty (will show general popular content)
  return {
    categories: [],
  };
}

/**
 * Re-ranking based on user context
 */
export function rerankByContext(content: Content[], context: UserContext): Content[] {
  return content
    .map(item => ({
      ...item,
      score: calculateContextualScore(item, context),
    }))
    .sort((a, b) => (b.score || 0) - (a.score || 0));
}

/**
 * Calculate contextual score for content
 */
function calculateContextualScore(content: Content, context: UserContext): number {
  let score = content.baseScore || content.views || 0;

  // Time of day (e.g., shorter videos in morning)
  if (context.timeOfDay === 'morning' && content.duration && content.duration < 600) {
    score *= 1.2;
  }

  // Device (e.g., prefer mobile-optimized on phone)
  if (context.device === 'mobile' && content.mobileOptimized) {
    score *= 1.15;
  }

  // Previously watched similar content
  if (content.categoryIds && context.recentCategories.some(cat => content.categoryIds?.includes(cat))) {
    score *= 1.1;
  }

  // Avoid fatigue (don't show same creator too much)
  if (content.creatorId && context.recentCreators.filter(c => c === content.creatorId).length > 2) {
    score *= 0.7;
  }

  return score;
}

/**
 * Find similar users based on watch history
 */
async function findSimilarUsers(
  userHistory: string[],
  currentUserId: string,
  minSimilarity: number = 0.1,
  maxUsers: number = 50
): Promise<string[]> {
  if (userHistory.length === 0) {
    return [];
  }

  // Get all users who watched at least one content from user's history
  const usersWithOverlap = await prisma.view.findMany({
    where: {
      contentId: { in: userHistory },
      userId: { not: currentUserId },
    },
    select: {
      userId: true,
      contentId: true,
    },
    distinct: ['userId', 'contentId'],
  });

  // Group by userId and calculate similarity
  const userOverlaps = new Map<string, Set<string>>();

  for (const view of usersWithOverlap) {
    if (!view.userId) continue;

    if (!userOverlaps.has(view.userId)) {
      userOverlaps.set(view.userId, new Set());
    }
    userOverlaps.get(view.userId)!.add(view.contentId);
  }

  // Calculate Jaccard similarity for each user
  const userSimilarities: Array<{ userId: string; similarity: number }> = [];
  const userHistorySet = new Set(userHistory);

  for (const [userId, watchedContent] of userOverlaps.entries()) {
    // Get full watch history for this user
    const fullHistory = await prisma.view.findMany({
      where: { userId },
      select: { contentId: true },
      orderBy: { watchedAt: 'desc' },
      take: 100,
      distinct: ['contentId'],
    });

    const fullHistorySet = new Set(fullHistory.map(v => v.contentId));

    // Calculate intersection and union
    const intersection = new Set([...watchedContent].filter(x => userHistorySet.has(x)));
    const union = new Set([...userHistorySet, ...fullHistorySet]);

    const similarity = union.size > 0 ? intersection.size / union.size : 0;

    if (similarity >= minSimilarity) {
      userSimilarities.push({ userId, similarity });
    }
  }

  // Sort by similarity (descending) and take top users
  userSimilarities.sort((a, b) => b.similarity - a.similarity);

  return userSimilarities.slice(0, maxUsers).map(u => u.userId);
}

/**
 * Transform Prisma content to Content interface
 */
function transformContent(items: any[]): Content[] {
  return items.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description || undefined,
    thumbnail: item.thumbnail || undefined,
    duration: item.duration || undefined,
    views: item.viewCount || 0,
    likes: item.likeCount || 0,
    createdAt: item.createdAt,
    creator: {
      id: item.creator.id,
      name: item.creator.display_name,
      username: item.creator.handle,
      avatar: item.creator.avatar || undefined,
      isVerified: item.creator.is_verified || false,
    },
    type: mapContentType(item.type),
    quality: item.resolution ? [item.resolution] : [],
    tags: item.tags.map((t: any) => t.tag.name),
    category: item.categories[0]?.category.name || 'Uncategorized',
    isPremium: item.isPremium || false,
    baseScore: item.viewCount || 0,
    categoryIds: item.categories.map((c: any) => c.categoryId),
    tagIds: item.tags.map((t: any) => t.tagId),
    creatorId: item.creatorId,
    mobileOptimized: true, // Assume all content is mobile-optimized
  }));
}

/**
 * Map ContentType enum to frontend type string
 */
function mapContentType(type: string): 'video' | 'photo' | 'gallery' | 'vr' | 'live' {
  const typeMap: Record<string, 'video' | 'photo' | 'gallery' | 'vr' | 'live'> = {
    VIDEO: 'video',
    PHOTO: 'photo',
    VR: 'vr',
    LIVE_STREAM: 'live',
    AUDIO: 'video',
  };
  return typeMap[type] || 'video';
}

