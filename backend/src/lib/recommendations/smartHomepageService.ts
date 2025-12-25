/**
 * Smart Homepage Algorithm Service
 * Generates personalized homepage sections based on user behavior and context
 */

import { prisma } from '../prisma';
import { getUserContext, type EnhancedUserContext } from './userContextService';
import { adjustRankingByContext } from './contextRankingService';

export interface SectionConfig {
  type: string;
  title: string;
  limit: number;
}

export interface Section extends SectionConfig {
  items: any[];
}

export interface HomepageSection {
  type: string;
  title: string;
  items: any[];
  description?: string;
}

/**
 * Generate personalized homepage based on user type and context
 */
export async function generatePersonalizedHomepage(
  userId: string | null,
  context: EnhancedUserContext
): Promise<HomepageSection[]> {
  const user = userId ? await getUserWithPreferences(userId) : null;
  const userContext = await getUserContext(user, context);

  // Determine user type
  const userType = user ? determineUserType(user) : 'new';

  // Define sections based on user type
  const sectionConfigs: SectionConfig[] = [];

  if (userType === 'new') {
    // New users (< 7 days)
    sectionConfigs.push(
      { type: 'popular_overall', title: 'Trending Now', limit: 20 },
      { type: 'category_showcase', title: 'Explore Categories', limit: 24 },
      { type: 'top_creators', title: 'Popular Creators', limit: 12 },
      { type: 'curated_playlists', title: 'Staff Picks', limit: 8 }
    );
  } else if (userType === 'active') {
    // Active users (7-30 days)
    sectionConfigs.push(
      { type: 'continue_watching', title: 'Continue Watching', limit: 10 },
      { type: 'recommended_for_you', title: 'Recommended', limit: 20 },
      { type: 'similar_to_watched', title: `More like "${user?.lastWatched?.title || 'Your Recent Watch'}"`, limit: 12 },
      { type: 'trending_in_categories', title: 'Trending in Your Interests', limit: 15 },
      { type: 'new_from_following', title: 'Latest from Creators You Follow', limit: 12 }
    );
  } else if (userType === 'power') {
    // Power users (> 30 days, high engagement)
    sectionConfigs.push(
      { type: 'continue_watching', title: 'Continue Watching', limit: 8 },
      { type: 'deep_personalized', title: 'Just for You', limit: 24 },
      { type: 'new_from_following', title: 'New Uploads', limit: 16 },
      { type: 'discover_new', title: 'Discover Something New', limit: 12 },
      { type: 'trending_global', title: 'Trending Worldwide', limit: 12 },
      { type: 'watch_later_reminder', title: 'Your Watch Later', limit: 8 }
    );
  }

  // Always add time-sensitive sections
  sectionConfigs.push(
    { type: 'live_now', title: '🔴 Live Now', limit: 6 },
    { type: 'premieres', title: 'Upcoming Premieres', limit: 4 }
  );

  // Execute section queries in parallel
  const sectionData = await Promise.all(
    sectionConfigs.map(config => generateSection(config, user, userContext))
  );

  // Filter out empty sections and apply context-aware ranking
  return sectionData
    .filter(section => section.items.length > 0)
    .map(section => ({
      ...section,
      items: adjustRankingByContext(section.items, userContext)
    }));
}

/**
 * Get user with preferences and watch history
 */
async function getUserWithPreferences(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      userPreferences: true,
      views: {
        orderBy: { watchedAt: 'desc' },
        take: 1,
        include: {
          content: {
            select: {
              id: true,
              title: true,
            }
          }
        }
      }
    }
  });

  if (!user) {
    return null;
  }

  // Calculate user engagement metrics
  const viewCount = await prisma.view.count({
    where: { userId }
  });

  const daysSinceSignup = user.createdAt
    ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const avgWatchTime = await calculateAvgWatchTime(userId);

  return {
    ...user,
    viewCount,
    daysSinceSignup,
    avgWatchTime,
    lastWatched: user.views[0]?.content || null,
    preferredCategories: await getPreferredCategories(userId),
    preferredDuration: await getPreferredDuration(userId, avgWatchTime)
  };
}

/**
 * Determine user type based on engagement
 */
function determineUserType(user: any): 'new' | 'active' | 'power' {
  if (user.daysSinceSignup < 7) {
    return 'new';
  } else if (user.daysSinceSignup < 30 || user.viewCount < 50) {
    return 'active';
  } else {
    return 'power';
  }
}

/**
 * Generate section content
 */
async function generateSection(
  section: SectionConfig,
  user: any,
  context: EnhancedUserContext
): Promise<HomepageSection> {
  let items: any[] = [];

  switch (section.type) {
    case 'popular_overall':
      items = await getPopularOverall(section.limit);
      break;
    case 'category_showcase':
      items = await getCategoryShowcase(section.limit);
      break;
    case 'top_creators':
      items = await getTopCreators(section.limit);
      break;
    case 'curated_playlists':
      items = await getCuratedPlaylists(section.limit);
      break;
    case 'continue_watching':
      if (user) {
        items = await getContinueWatching(user.id, section.limit);
      }
      break;
    case 'recommended_for_you':
      if (user) {
        items = await getRecommendedForYou(user.id, section.limit);
      }
      break;
    case 'similar_to_watched':
      if (user && user.lastWatched) {
        items = await getSimilarToWatched(user.lastWatched.id, section.limit);
      }
      break;
    case 'trending_in_categories':
      if (user) {
        items = await getTrendingInCategories(user.preferredCategories, section.limit);
      }
      break;
    case 'new_from_following':
      if (user) {
        items = await getNewFromFollowing(user.id, section.limit);
      }
      break;
    case 'deep_personalized':
      if (user) {
        items = await getDeepPersonalized(user.id, section.limit);
      }
      break;
    case 'discover_new':
      if (user) {
        items = await getDiscoverNew(user.id, section.limit);
      }
      break;
    case 'trending_global':
      items = await getTrendingGlobal(section.limit);
      break;
    case 'watch_later_reminder':
      if (user) {
        items = await getWatchLaterReminder(user.id, section.limit);
      }
      break;
    case 'live_now':
      items = await getLiveNow(section.limit);
      break;
    case 'premieres':
      items = await getPremieres(section.limit);
      break;
  }

  return {
    type: section.type,
    title: section.title,
    items: transformContent(items),
    description: getSectionDescription(section.type)
  };
}

/**
 * Section content generators
 */
async function getPopularOverall(limit: number) {
  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });
}

async function getCategoryShowcase(limit: number) {
  // Get top content from different categories
  const categories = await prisma.category.findMany({
    where: { isActive: true },
    take: 6,
  });

  const items: any[] = [];
  const perCategory = Math.ceil(limit / categories.length);

  for (const category of categories) {
    const categoryContent = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        categories: {
          some: { categoryId: category.id }
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { viewCount: 'desc' },
      take: perCategory,
    });
    items.push(...categoryContent);
  }

  return items.slice(0, limit);
}

async function getTopCreators(limit: number) {
  // This would return creator info, but for now return their top content
  const creators = await prisma.creator.findMany({
    where: { isVerified: true },
    orderBy: { followerCount: 'desc' },
    take: limit,
  });

  const items: any[] = [];
  for (const creator of creators) {
    const topContent = await prisma.content.findFirst({
      where: {
        creatorId: creator.id,
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
      },
      include: {
        creator: {
          select: {
            id: true,
            handle: true,
            displayName: true,
            avatar: true,
            isVerified: true,
          },
        },
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
      orderBy: { viewCount: 'desc' },
    });
    if (topContent) items.push(topContent);
  }

  return items;
}

async function getCuratedPlaylists(limit: number) {
  // Staff picks - high quality content with good engagement
  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      viewCount: { gt: 10000 },
      likeCount: { gt: 100 },
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: [
      { likeCount: 'desc' },
      { viewCount: 'desc' }
    ],
    take: limit,
  });
}

async function getContinueWatching(userId: string, limit: number) {
  const views = await prisma.view.findMany({
    where: { userId },
    include: {
      content: {
        include: {
          creator: {
            select: {
              id: true,
              handle: true,
              displayName: true,
              avatar: true,
              isVerified: true,
            },
          },
          categories: { include: { category: true } },
          tags: { include: { tag: true } },
        },
      },
    },
    orderBy: { watchedAt: 'desc' },
    take: limit * 2,
  });

  // Filter incomplete views
  return views
    .filter(v => {
      if (!v.duration || !v.content.duration) return false;
      return v.duration / v.content.duration < 0.9;
    })
    .map(v => v.content)
    .slice(0, limit);
}

async function getRecommendedForYou(userId: string, limit: number) {
  // Use existing recommendation service logic
  const { getRecommendations } = await import('./recommendationService');
  return getRecommendations(userId, null, limit);
}

async function getSimilarToWatched(contentId: string, limit: number) {
  const content = await prisma.content.findUnique({
    where: { id: contentId },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
  });

  if (!content) return [];

  const categoryIds = content.categories.map(c => c.categoryId);
  const tagIds = content.tags.map(t => t.tagId);

  return prisma.content.findMany({
    where: {
      id: { not: contentId },
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      OR: [
        { categories: { some: { categoryId: { in: categoryIds } } } },
        { tags: { some: { tagId: { in: tagIds } } } },
        { creatorId: content.creatorId },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });
}

async function getTrendingInCategories(categoryIds: string[], limit: number) {
  if (categoryIds.length === 0) return [];

  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - 24);

  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      publishedAt: { gte: sinceDate },
      categories: {
        some: { categoryId: { in: categoryIds } }
      }
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });
}

async function getNewFromFollowing(userId: string, limit: number) {
  // Get creators user follows via Follow model
  const follows = await prisma.follow.findMany({
    where: {
      followerId: userId,
    },
    select: { followingId: true },
  });

  if (follows.length === 0) return [];

  // Get creator IDs from user IDs
  const followingUserIds = follows.map(f => f.followingId).filter((id): id is string => id !== null);
  const creators = await prisma.creator.findMany({
    where: {
      userId: { in: followingUserIds },
    },
    select: { id: true },
  });

  const creatorIds = creators.map(c => c.id);
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 7);

  return prisma.content.findMany({
    where: {
      creatorId: { in: creatorIds },
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
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { publishedAt: 'desc' },
    take: limit,
  });
}

async function getDeepPersonalized(userId: string, limit: number) {
  // Advanced personalized recommendations using multiple signals
  const { getRecommendations } = await import('./recommendationService');
  return getRecommendations(userId, null, limit * 2).then(items => items.slice(0, limit));
}

async function getDiscoverNew(userId: string, limit: number) {
  // Content from categories/creators user hasn't explored much
  const userViews = await prisma.view.findMany({
    where: { userId },
    include: {
      content: {
        include: {
          categories: true,
        },
      },
    },
    take: 50,
  });

  const viewedCategoryIds = new Set(
    userViews.flatMap(v => v.content.categories.map(c => c.categoryId))
  );
  const viewedCreatorIds = new Set(userViews.map(v => v.content.creatorId));

  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      NOT: [
        { categories: { some: { categoryId: { in: Array.from(viewedCategoryIds) } } } },
        { creatorId: { in: Array.from(viewedCreatorIds) } },
      ],
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });
}

async function getTrendingGlobal(limit: number) {
  const sinceDate = new Date();
  sinceDate.setHours(sinceDate.getHours() - 24);

  return prisma.content.findMany({
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
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });
}

async function getWatchLaterReminder(userId: string, limit: number) {
  // This would require a watch_later table - for now return empty
  // TODO: Implement watch later feature
  return [];
}

async function getLiveNow(limit: number) {
  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      type: 'LIVE_STREAM',
      isPublic: true,
      deletedAt: null,
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { viewCount: 'desc' },
    take: limit,
  });
}

async function getPremieres(limit: number) {
  const futureDate = new Date();
  futureDate.setHours(futureDate.getHours() + 24);

  return prisma.content.findMany({
    where: {
      status: 'PUBLISHED',
      isPublic: true,
      deletedAt: null,
      scheduledAt: {
        gte: new Date(),
        lte: futureDate,
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          handle: true,
          displayName: true,
          avatar: true,
          isVerified: true,
        },
      },
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: limit,
  });
}

/**
 * Helper functions
 */
async function calculateAvgWatchTime(userId: string): Promise<number> {
  const views = await prisma.view.findMany({
    where: { userId },
    select: { duration: true },
    take: 100,
  });

  const validDurations = views.filter(v => v.duration).map(v => v.duration!);
  if (validDurations.length === 0) return 0;

  return validDurations.reduce((a, b) => a + b, 0) / validDurations.length;
}

async function getPreferredCategories(userId: string): Promise<string[]> {
  const views = await prisma.view.findMany({
    where: { userId },
    include: {
      content: {
        include: {
          categories: true,
        },
      },
    },
    take: 50,
  });

  const categoryCounts = new Map<string, number>();
  views.forEach(v => {
    v.content.categories.forEach(c => {
      categoryCounts.set(c.categoryId, (categoryCounts.get(c.categoryId) || 0) + 1);
    });
  });

  return Array.from(categoryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);
}

async function getPreferredDuration(
  userId: string,
  avgWatchTime: number
): Promise<'short' | 'medium' | 'long'> {
  if (avgWatchTime < 300) return 'short';
  if (avgWatchTime < 1200) return 'medium';
  return 'long';
}

function transformContent(items: any[]): any[] {
  return items.map(item => ({
    id: item.id,
    title: item.title,
    description: item.description || undefined,
    thumbnail: item.thumbnail || '',
    duration: item.duration || 0,
    views: item.viewCount || 0,
    likes: item.likeCount || 0,
    createdAt: item.createdAt,
    creator: {
      id: item.creator.id,
      name: item.creator.displayName,
      username: item.creator.handle,
      avatar: item.creator.avatar || '',
      isVerified: item.creator.isVerified || false,
    },
    type: mapContentType(item.type),
    quality: item.resolution ? [item.resolution] : [],
    tags: item.tags?.map((t: any) => t.tag?.name || t.name) || [],
    category: item.categories?.[0]?.category?.name || 'Uncategorized',
    isPremium: item.isPremium || false,
    baseScore: item.viewCount || 0,
    fileSize: item.fileSize || 0,
    mobileOptimized: true,
  }));
}

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

function getSectionDescription(type: string): string | undefined {
  const descriptions: Record<string, string> = {
    popular_overall: 'Most watched content right now',
    category_showcase: 'Explore different categories',
    top_creators: 'Content from verified creators',
    curated_playlists: 'Handpicked by our team',
    continue_watching: 'Pick up where you left off',
    recommended_for_you: 'Based on your viewing history',
    similar_to_watched: 'More content you might enjoy',
    trending_in_categories: 'Hot in your favorite categories',
    new_from_following: 'Fresh uploads from creators you follow',
    deep_personalized: 'Curated just for you',
    discover_new: 'Explore something different',
    trending_global: 'What\'s trending worldwide',
    watch_later_reminder: 'Don\'t forget to watch',
    live_now: 'Streaming right now',
    premieres: 'Coming soon',
  };
  return descriptions[type];
}

