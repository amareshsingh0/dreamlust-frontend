import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { optionalAuth, authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, UnauthorizedError } from '../lib/errors';

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
  async (req: Request, res: Response) => {
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
            displayName: true,
            avatar: true,
            isVerified: true,
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
        name: item.creator.displayName,
        username: item.creator.handle,
        avatar: item.creator.avatar || '',
        isVerified: item.creator.isVerified,
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
  }
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
                displayName: true,
                avatar: true,
                isVerified: true,
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
            name: item.creator.displayName,
            username: item.creator.handle,
            avatar: item.creator.avatar || '',
            isVerified: item.creator.isVerified,
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
                displayName: true,
                avatar: true,
                isVerified: true,
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
            name: item.creator.displayName,
            username: item.creator.handle,
            avatar: item.creator.avatar || '',
            isVerified: item.creator.isVerified,
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
              displayName: true,
              avatar: true,
              isVerified: true,
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
          name: item.creator.displayName,
          username: item.creator.handle,
          avatar: item.creator.avatar || '',
          isVerified: item.creator.isVerified,
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

export default router;

