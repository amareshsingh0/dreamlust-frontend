import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuth, authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { getCachedTrendingContent, invalidateHomepageCache } from '../lib/cache/contentCache';
import { asyncHandler } from '../middleware/asyncHandler';
import {
  getRecommendations,
  balanceRecommendations,
  handleNewUser,
  rerankByContext,
  type UserContext,
} from '../lib/recommendations/recommendationService';
import {
  trackContentView,
  trackContentLike,
  getSessionBehavior,
} from '../lib/recommendations/sessionTracking';

const router = Router();

/**
 * GET /api/recommendations/similar/:id
 * Get similar content based on content-based filtering
 * Scoring:
 * - Same category: +5 points
 * - Shared tags: +2 per tag
 * - Same creator: +3 points
 * - Similar duration: +1 if within 20%
 */
router.get(
  '/similar/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get the content to find similar items for
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        creator: true,
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Get category IDs
    const categoryIds = content.categories.map(c => c.categoryId);
    
    // Get tag IDs
    const tagIds = content.tags.map(t => t.tagId);

    // Calculate duration range (within 20%)
    const contentDuration = content.duration || 0;
    const durationMin = contentDuration * 0.8;
    const durationMax = contentDuration * 1.2;

    // Find similar content
    const similarContent = await prisma.content.findMany({
      where: {
        id: { not: id },
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        OR: [
          // Same category
          {
            categories: {
              some: {
                categoryId: { in: categoryIds },
              },
            },
          },
          // Shared tags
          {
            tags: {
              some: {
                tagId: { in: tagIds },
              },
            },
          },
          // Same creator
          {
            creatorId: content.creatorId,
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
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: limit * 2, // Get more to score and filter
    });

    // Score and sort the results
    const scoredContent = similarContent.map(item => {
      let score = 0;

      // Same category: +5 points
      const itemCategoryIds = item.categories.map(c => c.categoryId);
      const sharedCategories = categoryIds.filter(id => itemCategoryIds.includes(id));
      score += sharedCategories.length * 5;

      // Shared tags: +2 per tag
      const itemTagIds = item.tags.map(t => t.tagId);
      const sharedTags = tagIds.filter(id => itemTagIds.includes(id));
      score += sharedTags.length * 2;

      // Same creator: +3 points
      if (item.creatorId === content.creatorId) {
        score += 3;
      }

      // Similar duration: +1 if within 20%
      if (item.duration && contentDuration > 0) {
        if (item.duration >= durationMin && item.duration <= durationMax) {
          score += 1;
        }
      }

      return {
        ...item,
        _score: score,
      };
    });

    // Sort by score (descending), then by views, then by rating
    scoredContent.sort((a, b) => {
      if (b._score !== a._score) {
        return b._score - a._score;
      }
      if (b.viewCount !== a.viewCount) {
        return b.viewCount - a.viewCount;
      }
      return 0; // Could add rating comparison here if available
    });

    // Take top results and remove score from response
    const topResults = scoredContent.slice(0, limit).map(({ _score, ...item }) => item);

    // Transform to match frontend Content type
    const transformedResults = topResults.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.viewCount,
      likes: item.likeCount,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.display_name,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.is_verified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: mapContentType(item.type),
      quality: item.resolution ? [item.resolution] : [],
      tags: item.tags.map(t => t.tag.name),
      category: item.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.isPremium,
    }));

    res.json({
      success: true,
      data: transformedResults,
    });
  })
);

/**
 * Helper function to format duration in seconds to "MM:SS" or "HH:MM:SS"
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Helper function to map ContentType enum to frontend type string
 */
function mapContentType(type: string): 'video' | 'photo' | 'gallery' | 'vr' | 'live' {
  const typeMap: Record<string, 'video' | 'photo' | 'gallery' | 'vr' | 'live'> = {
    VIDEO: 'video',
    PHOTO: 'photo',
    VR: 'vr',
    LIVE_STREAM: 'live',
    AUDIO: 'video', // Map audio to video for now
  };
  return typeMap[type] || 'video';
}

/**
 * Helper function to get user watch history
 */
async function getWatchHistory(userId: string, limit: number = 100): Promise<string[]> {
  const views = await prisma.view.findMany({
    where: {
      userId,
    },
    select: {
      contentId: true,
    },
    orderBy: {
      watchedAt: 'desc',
    },
    take: limit,
    distinct: ['contentId'],
  });

  return views.map(v => v.contentId);
}

/**
 * Helper function to find similar users based on watch history
 * Uses Jaccard similarity: intersection / union
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
    const fullHistory = await getWatchHistory(userId, 100);
    const fullHistorySet = new Set(fullHistory);

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
 * GET /api/recommendations/user
 * Get personalized recommendations based on collaborative filtering
 * "Because you watched X" - finds users with similar watch history
 */
router.get(
  '/user',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const limit = parseInt(req.query.limit as string) || 50;

    try {
      // Get user's watch history
      const userHistory = await getWatchHistory(userId, 100);

      if (userHistory.length === 0) {
        // If user has no history, return trending content
        const trendingContent = await prisma.content.findMany({
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
                display_name: true,
                avatar: true,
                is_verified: true,
              },
            },
            categories: {
              include: {
                category: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            viewCount: 'desc',
          },
          take: limit,
        });

        const transformedResults = trendingContent.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          thumbnail: item.thumbnail || '',
          duration: item.duration ? formatDuration(item.duration) : '0:00',
          views: item.viewCount,
          likes: item.likeCount,
          createdAt: item.createdAt.toISOString(),
          creator: {
            id: item.creator.id,
            name: item.creator.display_name,
            username: item.creator.handle,
            avatar: item.creator.avatar || '',
            isVerified: item.creator.is_verified,
            followers: 0,
            views: 0,
            contentCount: 0,
            bio: '',
          },
          type: mapContentType(item.type),
          quality: item.resolution ? [item.resolution] : [],
          tags: item.tags.map(t => t.tag.name),
          category: item.categories[0]?.category.name || 'Uncategorized',
          isPremium: item.isPremium,
        }));

        return res.json({
          success: true,
          data: transformedResults,
          message: 'Trending content (no watch history)',
        });
      }

      // Find similar users
      const similarUsers = await findSimilarUsers(userHistory, userId, 0.1, 50);

      if (similarUsers.length === 0) {
        // Fallback to trending if no similar users found
        const trendingContent = await prisma.content.findMany({
          where: {
            status: 'PUBLISHED',
            isPublic: true,
            deletedAt: null,
            id: { notIn: userHistory },
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
            categories: {
              include: {
                category: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
          orderBy: {
            viewCount: 'desc',
          },
          take: limit,
        });

        const transformedResults = trendingContent.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          thumbnail: item.thumbnail || '',
          duration: item.duration ? formatDuration(item.duration) : '0:00',
          views: item.viewCount,
          likes: item.likeCount,
          createdAt: item.createdAt.toISOString(),
          creator: {
            id: item.creator.id,
            name: item.creator.display_name,
            username: item.creator.handle,
            avatar: item.creator.avatar || '',
            isVerified: item.creator.is_verified,
            followers: 0,
            views: 0,
            contentCount: 0,
            bio: '',
          },
          type: mapContentType(item.type),
          quality: item.resolution ? [item.resolution] : [],
          tags: item.tags.map(t => t.tag.name),
          category: item.categories[0]?.category.name || 'Uncategorized',
          isPremium: item.isPremium,
        }));

        return res.json({
          success: true,
          data: transformedResults,
          message: 'Trending content (no similar users found)',
        });
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
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
          views: {
            where: {
              userId: { in: similarUsers },
            },
            select: {
              userId: true,
            },
            distinct: ['userId'],
          },
        },
        take: limit * 2, // Get more to score
      });

      // Score recommendations by how many similar users watched them
      const scoredRecommendations = recommendations.map(item => ({
        ...item,
        _score: item.views.length, // Number of similar users who watched this
      }));

      // Sort by score (descending), then by view count
      scoredRecommendations.sort((a, b) => {
        if (b._score !== a._score) {
          return b._score - a._score;
        }
        return b.viewCount - a.viewCount;
      });

      // Take top results and remove score from response
      const topResults = scoredRecommendations.slice(0, limit).map(({ _score, views, ...item }) => item);

      // Transform to match frontend Content type
      const transformedResults = topResults.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        thumbnail: item.thumbnail || '',
        duration: item.duration ? formatDuration(item.duration) : '0:00',
        views: item.viewCount,
        likes: item.likeCount,
        createdAt: item.createdAt.toISOString(),
        creator: {
          id: item.creator.id,
          name: item.creator.display_name,
          username: item.creator.handle,
          avatar: item.creator.avatar || '',
          isVerified: item.creator.is_verified,
          followers: 0,
          views: 0,
          contentCount: 0,
          bio: '',
        },
        type: mapContentType(item.type),
        quality: item.resolution ? [item.resolution] : [],
        tags: item.tags.map(t => t.tag.name),
        category: item.categories[0]?.category.name || 'Uncategorized',
        isPremium: item.isPremium,
      }));

      res.json({
        success: true,
        data: transformedResults,
        message: 'Personalized recommendations based on similar users',
      });
    } catch (error) {
      console.error('Error generating recommendations:', error);
      throw error;
    }
  }
);

/**
 * GET /api/recommendations/continue-watching
 * Get content from watch history with completion rate < 0.9
 */
router.get(
  '/continue-watching',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      // Return empty array for unauthenticated users
      return res.json({
        success: true,
        data: [],
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    // Get incomplete views (where duration is less than 90% of content duration)
    // First get user's views with full content information
    const userViews = await prisma.view.findMany({
      where: {
        userId,
      },
      include: {
        content: {
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
            categories: {
              include: {
                category: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
        },
      },
      orderBy: {
        watchedAt: 'desc',
      },
    });

    // Filter views where watched duration < 90% of content duration
    const incompleteViews = userViews.filter(view => {
      if (!view.duration || !view.content.duration) return false;
      const completionRate = view.duration / view.content.duration;
      return completionRate < 0.9;
    });

    // Get unique content IDs (distinct by contentId)
    const seenContentIds = new Set<string>();
    const uniqueIncompleteViews = incompleteViews.filter(view => {
      if (seenContentIds.has(view.contentId)) return false;
      seenContentIds.add(view.contentId);
      return true;
    }).slice(0, limit);

    // Transform to Content type
    const transformedResults = uniqueIncompleteViews.map(item => {
      const completionRate = item.duration && item.content.duration 
        ? item.duration / item.content.duration 
        : 0;
      return {
      id: item.content.id,
      title: item.content.title,
      description: item.content.description || undefined,
      thumbnail: item.content.thumbnail || '',
      duration: item.content.duration ? formatDuration(item.content.duration) : '0:00',
      views: item.content.viewCount,
      likes: item.content.likeCount,
      createdAt: item.content.createdAt.toISOString(),
      creator: {
        id: item.content.creator.id,
        name: item.content.creator.display_name,
        username: item.content.creator.handle,
        avatar: item.content.creator.avatar || '',
        isVerified: item.content.creator.is_verified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: mapContentType(item.content.type),
      quality: item.content.resolution ? [item.content.resolution] : [],
      tags: item.content.tags.map(t => t.tag.name),
      category: item.content.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.content.isPremium,
      completionRate, // Include completion rate
      };
    });

    res.json({
      success: true,
      data: transformedResults,
    });
  })
);

/**
 * GET /api/recommendations/followed-creators
 * Get new releases from creators the user follows
 */
router.get(
  '/followed-creators',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      // Return empty array for unauthenticated users
      return res.json({
        success: true,
        data: [],
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const daysSince = parseInt(req.query.days as string) || 7; // Last 7 days

    // Get creators user follows
    const followedCreators = await prisma.subscription.findMany({
      where: {
        subscriber_id: userId,
        status: 'ACTIVE',
      },
      select: {
        creator_id: true,
      },
    });

    if (followedCreators.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    const creatorIds = followedCreators.map(s => s.creator_id);
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - daysSince);

    // Get new content from followed creators
    const newContent = await prisma.content.findMany({
      where: {
        creator_id: { in: creatorIds },
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        publishedAt: {
          gte: sinceDate,
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
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: {
        publishedAt: 'desc',
      },
      take: limit,
    });

    // Transform to Content type
    const transformedResults = newContent.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.viewCount,
      likes: item.likeCount,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.display_name,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.is_verified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: mapContentType(item.type),
      quality: item.resolution ? [item.resolution] : [],
      tags: item.tags.map(t => t.tag.name),
      category: item.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.isPremium,
    }));

    res.json({
      success: true,
      data: transformedResults,
    });
  })
);

/**
 * GET /api/recommendations/trending-now
 * Get trending content for today (calculated hourly)
 */
router.get(
  '/trending-now',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    const hours = parseInt(req.query.hours as string) || 24; // Last 24 hours
    const period = hours <= 24 ? 'today' : hours <= 168 ? 'week' : 'today';

    // Try cache first
    const cachedTrending = await getCachedTrendingContent(period);
    if (cachedTrending && cachedTrending.length > 0) {
      // Transform cached results
      const transformedResults = cachedTrending.slice(0, limit).map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        thumbnail: item.thumbnail || '',
        duration: item.duration ? formatDuration(item.duration) : '0:00',
        views: item.viewCount,
        likes: item.likeCount,
        createdAt: item.createdAt.toISOString(),
        creator: {
          id: item.creator.id,
          name: item.creator.display_name,
          username: item.creator.handle,
          avatar: item.creator.avatar || '',
          isVerified: item.creator.is_verified,
          followers: 0,
          views: 0,
          contentCount: 0,
          bio: '',
        },
        type: mapContentType(item.type),
        quality: item.resolution ? [item.resolution] : [],
        tags: item.tags.map((t: any) => t.tag.name),
        category: item.categories[0]?.category.name || 'Uncategorized',
        isPremium: item.isPremium,
      }));

      return res.json({
        success: true,
        data: transformedResults,
        cached: true,
      });
    }

    const sinceDate = new Date();
    sinceDate.setHours(sinceDate.getHours() - hours);

    // Get content published in the last 24 hours with high view velocity
    const trendingContent = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        publishedAt: {
          gte: sinceDate,
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
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: limit * 3, // Get more to calculate trending scores
    });

    // Calculate trending scores and sort
    const scoredContent = trendingContent.map(content => ({
      ...content,
      _trendingScore: calculateTrendingScore({
        viewCount: content.viewCount,
        likeCount: content.likeCount,
        publishedAt: content.publishedAt,
      }),
    }));

    scoredContent.sort((a, b) => b._trendingScore - a._trendingScore);
    const topResults = scoredContent.slice(0, limit).map(({ _trendingScore, ...item }) => item);

    // Transform to Content type
    const transformedResults = topResults.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.viewCount,
      likes: item.likeCount,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.display_name,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.is_verified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: mapContentType(item.type),
      quality: item.resolution ? [item.resolution] : [],
      tags: item.tags.map(t => t.tag.name),
      category: item.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.isPremium,
    }));

    res.json({
      success: true,
      data: transformedResults,
    });
  })
);

/**
 * GET /api/recommendations/regional
 * Get trending content in user's region
 */
router.get(
  '/regional',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;

    let region: string | undefined;

    // Get user's region from preferences
    if (userId) {
      const preferences = await prisma.userPreferences.findUnique({
        where: { userId: userId },
        select: { region: true },
      });
      region = preferences?.region || undefined;
    }

    // If no region, return trending content
    if (!region) {
      const trendingContent = await prisma.content.findMany({
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
              display_name: true,
              avatar: true,
              is_verified: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          viewCount: 'desc',
        },
        take: limit,
      });

      const transformedResults = trendingContent.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        thumbnail: item.thumbnail || '',
        duration: item.duration ? formatDuration(item.duration) : '0:00',
        views: item.viewCount,
        likes: item.likeCount,
        createdAt: item.createdAt.toISOString(),
        creator: {
          id: item.creator.id,
          name: item.creator.display_name,
          username: item.creator.handle,
          avatar: item.creator.avatar || '',
          isVerified: item.creator.is_verified,
          followers: 0,
          views: 0,
          contentCount: 0,
          bio: '',
        },
        type: mapContentType(item.type),
        quality: item.resolution ? [item.resolution] : [],
        tags: item.tags.map(t => t.tag.name),
        category: item.categories[0]?.category.name || 'Uncategorized',
        isPremium: item.isPremium,
      }));

      return res.json({
        success: true,
        data: transformedResults,
      });
    }

    // Get views (region filtering removed as View model doesn't have region field)
    // For now, we'll get popular content instead
    const regionalViewEvents = await prisma.view.findMany({
      select: {
        contentId: true,
      },
      distinct: ['contentId'],
      take: limit * 2,
    });

    const contentIds = regionalViewEvents.map(v => v.contentId);

    if (contentIds.length === 0) {
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get content and count views by region
    const content = await prisma.content.findMany({
      where: {
        id: { in: contentIds },
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
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
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
        views: {
          select: {
            id: true,
          },
        },
      },
      take: limit * 2,
    });

    // Score by views
    const scoredContent = content.map(item => ({
      ...item,
      _regionalScore: item.views.length,
    }));

    scoredContent.sort((a, b) => b._regionalScore - a._regionalScore);
    const topResults = scoredContent.slice(0, limit).map(({ _regionalScore, views, ...item }) => item);

    // Transform to Content type
    const transformedResults = topResults.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.viewCount,
      likes: item.likeCount,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.display_name,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.is_verified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: mapContentType(item.type),
      quality: item.resolution ? [item.resolution] : [],
      tags: item.tags.map(t => t.tag.name),
      category: item.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.isPremium,
    }));

    res.json({
      success: true,
      data: transformedResults,
    });
  })
);

/**
 * GET /api/recommendations/for-you
 * Mix of collaborative filtering and content-based recommendations
 */
router.get(
  '/for-you',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      // Return trending content for unauthenticated users
      const limit = parseInt(req.query.limit as string) || 20;
      const trendingContent = await prisma.content.findMany({
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
              display_name: true,
              avatar: true,
              is_verified: true,
            },
          },
          categories: {
            include: {
              category: true,
            },
          },
          tags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: {
          viewCount: 'desc',
        },
        take: limit,
      });

      const transformedResults = trendingContent.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description || undefined,
        thumbnail: item.thumbnail || '',
        duration: item.duration ? formatDuration(item.duration) : '0:00',
        views: item.viewCount,
        likes: item.likeCount,
        createdAt: item.createdAt.toISOString(),
        creator: {
          id: item.creator.id,
          name: item.creator.display_name,
          username: item.creator.handle,
          avatar: item.creator.avatar || '',
          isVerified: item.creator.is_verified,
        },
        type: mapContentType(item.type),
        quality: item.resolution ? [item.resolution] : [],
        tags: item.tags.map(t => t.tag.name),
        category: item.categories[0]?.category.name || 'Uncategorized',
        isPremium: item.isPremium,
      }));

      return res.json({
        success: true,
        data: transformedResults,
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    try {
      // Get collaborative filtering recommendations (50%)
      const collaborativeLimit = Math.floor(limit / 2);
      const userHistory = await getWatchHistory(userId, 100);
      const similarUsers = userHistory.length > 0 
        ? await findSimilarUsers(userHistory, userId, 0.1, 50)
        : [];
      
      let collaborativeContent: any[] = [];
      if (similarUsers.length > 0) {
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
            categories: {
              include: {
                category: true,
              },
            },
            tags: {
              include: {
                tag: true,
              },
            },
          },
          take: collaborativeLimit,
          orderBy: {
            viewCount: 'desc',
          },
        });

        collaborativeContent = recommendations.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          thumbnail: item.thumbnail || '',
          duration: item.duration ? formatDuration(item.duration) : '0:00',
          views: item.viewCount,
          likes: item.likeCount,
          createdAt: item.createdAt.toISOString(),
          creator: {
            id: item.creator.id,
            name: item.creator.display_name,
            username: item.creator.handle,
            avatar: item.creator.avatar || '',
            isVerified: item.creator.is_verified,
            followers: 0,
            views: 0,
            contentCount: 0,
            bio: '',
          },
          type: mapContentType(item.type),
          quality: item.resolution ? [item.resolution] : [],
          tags: item.tags.map(t => t.tag.name),
          category: item.categories[0]?.category.name || 'Uncategorized',
          isPremium: item.isPremium,
        }));
      }

      // Get user's last watched content for content-based recommendations (50%)
      const lastWatched = await prisma.view.findFirst({
        where: { userId },
        orderBy: { watchedAt: 'desc' },
        select: { contentId: true },
      });

      let contentBasedContent: any[] = [];
      if (lastWatched) {
        const content = await prisma.content.findUnique({
          where: { id: lastWatched.contentId },
          include: {
            categories: { include: { category: true } },
            tags: { include: { tag: true } },
          },
        });

        if (content) {
          const categoryIds = content.categories.map(c => c.categoryId);
          const tagIds = content.tags.map(t => t.tagId);

          const similarContent = await prisma.content.findMany({
            where: {
              id: { not: lastWatched.contentId },
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
                  display_name: true,
                  avatar: true,
                  is_verified: true,
                },
              },
              categories: {
                include: {
                  category: true,
                },
              },
              tags: {
                include: {
                  tag: true,
                },
              },
            },
            take: Math.ceil(limit / 2),
            orderBy: {
              viewCount: 'desc',
            },
          });

          contentBasedContent = similarContent.map(item => ({
            id: item.id,
            title: item.title,
            description: item.description || undefined,
            thumbnail: item.thumbnail || '',
            duration: item.duration ? formatDuration(item.duration) : '0:00',
            views: item.viewCount,
            likes: item.likeCount,
            createdAt: item.createdAt.toISOString(),
            creator: {
              id: item.creator.id,
              name: item.creator.display_name,
              username: item.creator.handle,
              avatar: item.creator.avatar || '',
              isVerified: item.creator.is_verified,
              followers: 0,
              views: 0,
              contentCount: 0,
              bio: '',
            },
            type: mapContentType(item.type),
            quality: item.resolution ? [item.resolution] : [],
            tags: item.tags.map(t => t.tag.name),
            category: item.categories[0]?.category.name || 'Uncategorized',
            isPremium: item.isPremium,
          }));
        }
      }

      // Mix and deduplicate
      const allContent = [...collaborativeContent, ...contentBasedContent];
      const seen = new Set<string>();
      const mixedContent = allContent.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      }).slice(0, limit);

      res.json({
        success: true,
        data: mixedContent,
      });
    } catch (error) {
      console.error('Error generating for-you recommendations:', error);
      throw error;
    }
  })
);

/**
 * GET /api/recommendations/last-watched-similar
 * Get similar content to the last watched item
 */
router.get(
  '/last-watched-similar',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      // Return empty array for unauthenticated users
      return res.json({
        success: true,
        data: {
          data: [],
          lastWatchedTitle: null,
        },
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;

    // Get last watched content
    const lastWatched = await prisma.view.findFirst({
      where: { userId },
      orderBy: { watchedAt: 'desc' },
      include: {
        content: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!lastWatched) {
      return res.json({
        success: true,
        data: {
          data: [],
          lastWatchedTitle: null,
        },
      });
    }

    // Use the similar content logic from the /similar/:id endpoint
    const content = await prisma.content.findUnique({
      where: { id: lastWatched.contentId },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
        creator: true,
      },
    });

    if (!content) {
      return res.json({
        success: true,
        data: [],
        lastWatchedTitle: lastWatched.content.title,
      });
    }

    const categoryIds = content.categories.map(c => c.categoryId);
    const tagIds = content.tags.map(t => t.tagId);

    const similarContent = await prisma.content.findMany({
      where: {
        id: { not: lastWatched.contentId },
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
            display_name: true,
            avatar: true,
            is_verified: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        tags: {
          include: {
            tag: true,
          },
        },
      },
      take: limit,
      orderBy: {
        viewCount: 'desc',
      },
    });

    const transformedResults = similarContent.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description || undefined,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.viewCount,
      likes: item.likeCount,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.display_name,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.is_verified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: mapContentType(item.type),
      quality: item.resolution ? [item.resolution] : [],
      tags: item.tags.map(t => t.tag.name),
      category: item.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.isPremium,
    }));

      res.json({
        success: true,
        data: {
          data: transformedResults,
          lastWatchedTitle: lastWatched.content.title,
        },
      });
    })
);

// Helper function for trending score (import from search route or define here)
function calculateTrendingScore(content: {
  viewCount: number;
  likeCount: number;
  publishedAt: Date | null;
}): number {
  const now = Date.now();
  const publishedAt = content.publishedAt ? new Date(content.publishedAt).getTime() : now;
  const hoursSincePublish = (now - publishedAt) / (1000 * 60 * 60);
  
  const viewVelocity = content.viewCount / Math.max(hoursSincePublish, 1);
  const engagementScore = content.viewCount > 0 
    ? content.likeCount / content.viewCount 
    : 0;
  const timeDecay = Math.exp(-hoursSincePublish / 168);
  
  return viewVelocity * (1 + engagementScore) * timeDecay;
}

/**
 * GET /api/recommendations/v2
 * Content Recommendations v2 - Hybrid recommendation engine
 * Combines collaborative filtering (40%), content-based (30%), trending (20%), diversity (10%)
 */
router.get(
  '/v2',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId || null;
    const sessionId = req.headers['x-session-id'] as string || null;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get device and time context from headers
    const device = (req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 
                   req.headers['user-agent']?.includes('Tablet') ? 'tablet' : 'desktop') as 'mobile' | 'tablet' | 'desktop';
    
    const hour = new Date().getHours();
    const timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night' = 
      hour >= 5 && hour < 12 ? 'morning' :
      hour >= 12 && hour < 17 ? 'afternoon' :
      hour >= 17 && hour < 22 ? 'evening' : 'night';

    // Get recommendations
    let recommendations = await getRecommendations(userId, sessionId, limit);

    // Get user context for re-ranking
    let recentCategories: string[] = [];
    let recentCreators: string[] = [];

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
        take: 10,
      });

      recentCategories = recentViews.flatMap(v => 
        v.content.categories.map(c => c.categoryId)
      );
      recentCreators = recentViews.map(v => v.content.creatorId);
    } else if (sessionId) {
      const sessionBehavior = await getSessionBehavior(sessionId);
      recentCategories = sessionBehavior.categories;
      recentCreators = sessionBehavior.creators;
    }

    const context: UserContext = {
      timeOfDay,
      device,
      recentCategories,
      recentCreators,
    };

    // Re-rank by context
    recommendations = rerankByContext(recommendations, context);

    // Apply explore vs exploit balance (80% personalized, 20% discovery)
    const exploreContent = await prisma.content.findMany({
      where: {
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
        id: { notIn: recommendations.map(r => r.id) },
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
      take: Math.ceil(limit * 0.2),
    });

    const exploreTransformed = exploreContent.map(item => ({
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
      tags: item.tags.map(t => t.tag.name),
      category: item.categories[0]?.category.name || 'Uncategorized',
      isPremium: item.isPremium || false,
      baseScore: item.viewCount || 0,
    }));

    const balanced = balanceRecommendations(recommendations, exploreTransformed, limit);

    // Transform to match frontend format
    const transformedResults = balanced.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.views,
      likes: item.likes,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.name,
        username: item.creator.username,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.isVerified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: item.type,
      quality: item.quality,
      tags: item.tags,
      category: item.category,
      isPremium: item.isPremium,
    }));

    res.json({
      success: true,
      data: transformedResults,
    });
  })
);

/**
 * POST /api/recommendations/track-view
 * Track content view for session-based recommendations (no login required)
 */
router.post(
  '/track-view',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId, sessionId } = req.body;

    if (!contentId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID is required',
      });
    }

    // Get content details
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: {
        categories: { include: { category: true } },
        tags: { include: { tag: true } },
      },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Track in session if sessionId provided
    if (sessionId) {
      const categoryIds = content.categories.map(c => c.categoryId);
      const tagIds = content.tags.map(t => t.tagId);
      
      await trackContentView(
        sessionId,
        contentId,
        categoryIds,
        tagIds,
        content.creatorId
      );
    }

    res.json({
      success: true,
      message: 'View tracked',
    });
  })
);

/**
 * POST /api/recommendations/track-like
 * Track content like for session-based recommendations
 */
router.post(
  '/track-like',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId, sessionId } = req.body;

    if (!contentId || !sessionId) {
      return res.status(400).json({
        success: false,
        error: 'Content ID and session ID are required',
      });
    }

    await trackContentLike(sessionId, contentId);

    res.json({
      success: true,
      message: 'Like tracked',
    });
  })
);

/**
 * GET /api/recommendations/cold-start
 * Handle cold start problem for new users
 */
router.get(
  '/cold-start',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is new (has less than 5 views)
    const viewCount = await prisma.view.count({
      where: { userId },
    });

    if (viewCount >= 5) {
      // User is not new, return regular recommendations
      const limit = parseInt(req.query.limit as string) || 20;
      const recommendations = await getRecommendations(userId, null, limit);
      
      const transformedResults = recommendations.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        thumbnail: item.thumbnail || '',
        duration: item.duration ? formatDuration(item.duration) : '0:00',
        views: item.views,
        likes: item.likes,
        createdAt: item.createdAt.toISOString(),
        creator: {
          id: item.creator.id,
          name: item.creator.name,
          username: item.creator.username,
          avatar: item.creator.avatar || '',
          isVerified: item.creator.isVerified,
          followers: 0,
          views: 0,
          contentCount: 0,
          bio: '',
        },
        type: item.type,
        quality: item.quality,
        tags: item.tags,
        category: item.category,
        isPremium: item.isPremium,
      }));

      return res.json({
        success: true,
        data: transformedResults,
      });
    }

    // New user - get onboarding recommendations
    const preferences = req.query.categories 
      ? { categories: (req.query.categories as string).split(',') }
      : undefined;

    const recommendations = await handleNewUser(userId, preferences);

    const transformedResults = recommendations.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      thumbnail: item.thumbnail || '',
      duration: item.duration ? formatDuration(item.duration) : '0:00',
      views: item.views,
      likes: item.likes,
      createdAt: item.createdAt.toISOString(),
      creator: {
        id: item.creator.id,
        name: item.creator.name,
        username: item.creator.username,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.isVerified,
        followers: 0,
        views: 0,
        contentCount: 0,
        bio: '',
      },
      type: item.type,
      quality: item.quality,
      tags: item.tags,
      category: item.category,
      isPremium: item.isPremium,
    }));

    res.json({
      success: true,
      data: transformedResults,
      isNewUser: true,
    });
  })
);

export default router;

