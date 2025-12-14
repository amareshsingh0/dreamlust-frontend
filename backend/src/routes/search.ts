import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { validateBody } from '../middleware/validation';
import { searchSchema, SearchRequest } from '../schemas/search';
import { Prisma } from '@prisma/client';
import { searchRateLimiter } from '../middleware/rateLimit';

const router = Router();

/**
 * Calculate trending score using time-decay weighted views
 * Formula: viewVelocity * (1 + engagementScore) * exp(-hoursSincePublish / 168)
 * - viewVelocity: views per hour since publish
 * - engagementScore: (likes - dislikes) / views (using likeCount/viewCount ratio since no dislikes)
 * - Time decay: exponential decay over 7 days (168 hours)
 */
function calculateTrendingScore(content: {
  viewCount: number;
  likeCount: number;
  publishedAt: Date | null;
}): number {
  const now = Date.now();
  const publishedAt = content.publishedAt ? new Date(content.publishedAt).getTime() : now;
  const hoursSincePublish = (now - publishedAt) / (1000 * 60 * 60);
  
  // View velocity: views per hour
  const viewVelocity = content.viewCount / Math.max(hoursSincePublish, 1);
  
  // Engagement score: like ratio (since we don't have dislikes)
  // Using likeCount/viewCount ratio as engagement indicator
  const engagementScore = content.viewCount > 0 
    ? content.likeCount / content.viewCount 
    : 0;
  
  // Time decay: exponential decay over 7 days (168 hours)
  // Older content gets lower scores
  const timeDecay = Math.exp(-hoursSincePublish / 168);
  
  // Final score
  return viewVelocity * (1 + engagementScore) * timeDecay;
}

// POST /api/search
router.post(
  '/',
  searchRateLimiter,
  validateBody(searchSchema),
  async (req: Request, res: Response) => {
    try {
      const {
        query = '',
        filters = {},
        sort = 'trending',
        page = 1,
        limit = 20,
      } = req.body as SearchRequest;

      const skip = (page - 1) * limit;

      // Build where clause for filtering
      const where: Prisma.ContentWhereInput = {
        // Only show published, public content
        status: 'PUBLISHED',
        isPublic: true,
        deletedAt: null,
      };

      // Text search - using PostgreSQL full-text search
      if (query.trim()) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          {
            tags: {
              some: {
                tag: {
                  name: { contains: query, mode: 'insensitive' },
                },
              },
            },
          },
          {
            creator: {
              name: { contains: query, mode: 'insensitive' },
            },
          },
        ];
      }

      // Content type filter
      if (filters.contentType && filters.contentType.length > 0) {
        where.type = { in: filters.contentType };
      }

      // Categories filter
      if (filters.categories && filters.categories.length > 0) {
        where.categories = {
          some: {
            category: {
              id: { in: filters.categories },
              deletedAt: null,
            },
          },
        };
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        where.tags = {
          some: {
            tag: {
              id: { in: filters.tags },
            },
          },
        };
      }

      // Creators filter
      if (filters.creators && filters.creators.length > 0) {
        where.creatorId = { in: filters.creators };
      }

      // Duration filter
      if (filters.duration) {
        const durationWhere: Prisma.IntNullableFilter = {};
        if (filters.duration.min !== undefined) {
          durationWhere.gte = filters.duration.min;
        }
        if (filters.duration.max !== undefined) {
          durationWhere.lte = filters.duration.max;
        }
        if (Object.keys(durationWhere).length > 0) {
          where.duration = durationWhere;
        }
      }

      // Release date filter
      if (filters.releaseDate) {
        const dateWhere: Prisma.DateTimeNullableFilter = {};
        if (filters.releaseDate.from) {
          dateWhere.gte = filters.releaseDate.from;
        }
        if (filters.releaseDate.to) {
          dateWhere.lte = filters.releaseDate.to;
        }
        if (Object.keys(dateWhere).length > 0) {
          where.publishedAt = dateWhere;
        }
      }

      // Quality filter (based on resolution field)
      if (filters.quality && filters.quality.length > 0) {
        const qualityConditions = filters.quality.map((q) => {
          if (q === '720p') {
            return { resolution: { contains: '1280x720' } };
          } else if (q === '1080p') {
            return { resolution: { contains: '1920x1080' } };
          } else if (q === '4K') {
            return {
              OR: [
                { resolution: { contains: '3840x2160' } },
                { resolution: { contains: '4096x2160' } },
              ],
            };
          }
          return null;
        }).filter(Boolean) as Prisma.ContentWhereInput[];

        if (qualityConditions.length > 0) {
          where.OR = where.OR || [];
          where.OR.push(...qualityConditions);
        }
      }

      // Build orderBy clause for sorting
      let orderBy: Prisma.ContentOrderByWithRelationInput = {};
      let needsTrendingCalculation = false;
      
      switch (sort) {
        case 'trending':
          // For trending, we need to calculate scores after fetching
          // So we'll fetch more results, calculate scores, then sort
          needsTrendingCalculation = true;
          // Initial order by views to get candidates
          orderBy = { viewCount: 'desc' };
          break;
        case 'recent':
          orderBy = { publishedAt: 'desc' };
          break;
        case 'views':
          orderBy = { viewCount: 'desc' };
          break;
        case 'rating':
          // Rating: likeCount / viewCount ratio (higher is better)
          // For now, use likeCount as proxy
          orderBy = { likeCount: 'desc' };
          break;
        default:
          orderBy = { publishedAt: 'desc' };
      }

      // Execute search query
      // For trending, fetch more results to calculate scores
      const fetchLimit = needsTrendingCalculation ? limit * 3 : limit;
      
      const [results, total] = await Promise.all([
        prisma.content.findMany({
          where,
          include: {
            creator: {
              select: {
                id: true,
                name: true,
                username: true,
                avatar: true,
                isVerified: true,
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
            categories: {
              include: {
                category: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
          orderBy: Array.isArray(orderBy) ? orderBy : [orderBy],
          skip: needsTrendingCalculation ? 0 : skip, // Fetch from start for trending
          take: fetchLimit,
        }),
        prisma.content.count({ where }),
      ]);

      // Calculate trending scores and sort if needed
      let sortedResults = results;
      if (needsTrendingCalculation) {
        const scoredResults = results.map(content => ({
          ...content,
          _trendingScore: calculateTrendingScore({
            viewCount: content.viewCount,
            likeCount: content.likeCount,
            publishedAt: content.publishedAt,
          }),
        }));

        // Sort by trending score (descending)
        scoredResults.sort((a, b) => b._trendingScore - a._trendingScore);

        // Take top results and remove score
        sortedResults = scoredResults.slice(skip, skip + limit).map(({ _trendingScore, ...content }) => content);
      }

      // Get facets for filter counts
      // First, get all matching content IDs
      const matchingContentIds = await prisma.content.findMany({
        where,
        select: { id: true },
      }).then(results => results.map(r => r.id));

      const [categoryFacets, tagFacets] = await Promise.all([
        // Category facets - count content per category
        matchingContentIds.length > 0
          ? prisma.category.findMany({
              where: {
                deletedAt: null,
                isActive: true,
                content: {
                  some: {
                    contentId: { in: matchingContentIds },
                  },
                },
              },
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    content: {
                      where: {
                        contentId: { in: matchingContentIds },
                      },
                    },
                  },
                },
              },
              orderBy: {
                name: 'asc',
              },
            }).then(categories =>
              categories.map(cat => ({
                id: cat.id,
                name: cat.name,
                count: cat._count.content,
              }))
            )
          : [],
        // Tag facets - count content per tag
        matchingContentIds.length > 0
          ? prisma.tag.findMany({
              where: {
                content: {
                  some: {
                    contentId: { in: matchingContentIds },
                  },
                },
              },
              select: {
                id: true,
                name: true,
                _count: {
                  select: {
                    content: {
                      where: {
                        contentId: { in: matchingContentIds },
                      },
                    },
                  },
                },
              },
              orderBy: {
                usageCount: 'desc',
              },
              take: 50, // Limit to top 50 tags
            }).then(tags =>
              tags.map(tag => ({
                id: tag.id,
                name: tag.name,
                count: tag._count.content,
              }))
            )
          : [],
      ]);

      // Transform results to match frontend Content type
      const transformedResults = sortedResults.map((content) => ({
        id: content.id,
        title: content.title,
        thumbnail: content.thumbnail || '',
        duration: content.duration ? `${Math.floor(content.duration / 60)}:${String(content.duration % 60).padStart(2, '0')}` : '0:00',
        views: content.viewCount,
        likes: content.likeCount,
        createdAt: content.createdAt.toISOString(),
        creator: {
          id: content.creator.id,
          name: content.creator.name,
          username: content.creator.username,
          avatar: content.creator.avatar || '',
          isVerified: content.creator.isVerified,
        },
        type: content.type.toLowerCase().replace('_', '') as 'video' | 'photo' | 'vr' | 'live' | 'audio',
        quality: content.resolution ? [content.resolution] : [],
        tags: content.tags.map((ct) => ct.tag.name),
        category: content.categories[0]?.category.name || '',
        description: content.description || undefined,
        isLive: content.type === 'LIVE_STREAM',
        isPremium: content.isPremium,
      }));

      // Facets are already transformed
      const facets = {
        categories: categoryFacets,
        tags: tagFacets,
      };

      res.json({
        success: true,
        data: {
          results: transformedResults,
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
          facets,
        },
      });
    } catch (error) {
      console.error('Search error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: 'An error occurred while searching',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
);

export default router;

