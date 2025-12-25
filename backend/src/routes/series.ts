/**
 * Series Routes
 * Handles content series, seasons, and episodes
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * GET /api/series
 * Get all series (with optional filters)
 */
router.get(
  '/',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { creatorId, status, categoryId, limit = 20, page = 1 } = req.query;
    const userId = req.user?.userId;

    const where: any = {};
    if (creatorId) where.creatorId = creatorId;
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;

    const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

    const [series, total] = await Promise.all([
      prisma.series.findMany({
        where,
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
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          seasons: {
            include: {
              episodes: {
                where: { isPublished: true },
                orderBy: { episodeNumber: 'asc' },
                take: 1, // Just get count
              },
            },
            orderBy: { seasonNumber: 'asc' },
          },
          ...(userId && {
            seriesFollows: {
              where: { userId },
              take: 1,
            },
          }),
        },
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit as string),
        skip,
      }),
      prisma.series.count({ where }),
    ]);

    const transformed = series.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      coverImage: s.coverImage,
      creator: {
        id: s.creator.id,
        name: s.creator.displayName,
        username: s.creator.handle,
        avatar: s.creator.avatar,
        isVerified: s.creator.isVerified,
      },
      category: s.category ? {
        id: s.category.id,
        name: s.category.name,
        slug: s.category.slug,
      } : null,
      followers: s.followers,
      totalEpisodes: s.totalEpisodes,
      status: s.status,
      isFollowing: userId ? s.seriesFollows.length > 0 : false,
      seasons: s.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        title: season.title,
        description: season.description,
        coverImage: season.coverImage,
        releaseDate: season.releaseDate,
        episodeCount: season.episodes.length,
      })),
      createdAt: s.createdAt,
    }));

    res.json({
      success: true,
      data: transformed,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  })
);

/**
 * GET /api/series/:id
 * Get series details with all seasons and episodes
 */
router.get(
  '/:id',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    const series = await prisma.series.findUnique({
      where: { id },
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        seasons: {
          include: {
            episodes: {
              include: {
                content: {
                  select: {
                    id: true,
                    title: true,
                    thumbnail: true,
                    duration: true,
                    viewCount: true,
                    likeCount: true,
                    publishedAt: true,
                  },
                },
              },
              orderBy: { episodeNumber: 'asc' },
            },
          },
          orderBy: { seasonNumber: 'asc' },
        },
        ...(userId && {
          seriesFollows: {
            where: { userId },
            take: 1,
          },
        }),
      },
    });

    if (!series) {
      throw new NotFoundError('Series not found');
    }

    // Get watch history for user
    let watchHistory: string[] = [];
    let watchProgress: Record<string, number> = {};
    if (userId) {
      const views = await prisma.view.findMany({
        where: {
          userId,
          contentId: {
            in: series.seasons.flatMap(s => s.episodes.map(e => e.contentId)),
          },
        },
        select: {
          contentId: true,
          duration: true,
        },
      });

      watchHistory = views.map(v => v.contentId);
      views.forEach(v => {
        if (v.duration) {
          watchProgress[v.contentId] = v.duration;
        }
      });
    }

    const transformed = {
      id: series.id,
      title: series.title,
      description: series.description,
      coverImage: series.coverImage,
      creator: {
        id: series.creator.id,
        name: series.creator.displayName,
        username: series.creator.handle,
        avatar: series.creator.avatar,
        isVerified: series.creator.isVerified,
      },
      category: series.category ? {
        id: series.category.id,
        name: series.category.name,
        slug: series.category.slug,
      } : null,
      followers: series.followers,
      totalEpisodes: series.totalEpisodes,
      status: series.status,
      isFollowing: userId ? series.seriesFollows.length > 0 : false,
      seasons: series.seasons.map((season) => ({
        id: season.id,
        seasonNumber: season.seasonNumber,
        title: season.title,
        description: season.description,
        coverImage: season.coverImage,
        releaseDate: season.releaseDate,
        episodes: season.episodes.map((episode) => ({
          id: episode.id,
          episodeNumber: episode.episodeNumber,
          title: episode.title,
          description: episode.description,
          duration: episode.duration,
          releaseDate: episode.releaseDate,
          isPublished: episode.isPublished,
          content: {
            id: episode.content.id,
            title: episode.content.title,
            thumbnail: episode.content.thumbnail,
            duration: episode.content.duration,
            views: episode.content.viewCount,
            likes: episode.content.likeCount,
            publishedAt: episode.content.publishedAt,
          },
          watched: watchHistory.includes(episode.contentId),
          progress: watchProgress[episode.contentId] || 0,
        })),
      })),
      createdAt: series.createdAt,
    };

    res.json({
      success: true,
      data: transformed,
    });
  })
);

/**
 * POST /api/series
 * Create a new series (creator only)
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { title, description, coverImage, categoryId, status = 'ongoing' } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Title is required',
        },
      });
    }

    // Get creator ID from user
    const creator = await prisma.creator.findUnique({
      where: { userId: userId },
    });

    if (!creator) {
      throw new UnauthorizedError('Creator account required');
    }

    const series = await prisma.series.create({
      data: {
        title,
        description,
        coverImage,
        creatorId: creator.id,
        categoryId,
        status,
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: series,
    });
  })
);

/**
 * PUT /api/series/:id
 * Update series (creator only)
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;
    const { title, description, coverImage, categoryId, status } = req.body;

    // Verify ownership
    const series = await prisma.series.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!series) {
      throw new NotFoundError('Series not found');
    }

    if (series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only update your own series');
    }

    const updated = await prisma.series.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description }),
        ...(coverImage !== undefined && { coverImage }),
        ...(categoryId !== undefined && { categoryId }),
        ...(status && { status }),
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
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/series/:id
 * Delete series (creator only)
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;

    // Verify ownership
    const series = await prisma.series.findUnique({
      where: { id },
      include: { creator: true },
    });

    if (!series) {
      throw new NotFoundError('Series not found');
    }

    if (series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only delete your own series');
    }

    await prisma.series.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Series deleted',
    });
  })
);

/**
 * POST /api/series/:id/follow
 * Follow a series
 */
router.post(
  '/:id/follow',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;

    // Check if already following
    const existing = await prisma.seriesFollow.findUnique({
      where: {
        userId_seriesId: {
          userId,
          seriesId: id,
        },
      },
    });

    if (existing) {
      return res.json({
        success: true,
        data: { following: true },
        message: 'Already following',
      });
    }

    // Create follow and update count
    await prisma.$transaction([
      prisma.seriesFollow.create({
        data: {
          userId,
          seriesId: id,
        },
      }),
      prisma.series.update({
        where: { id },
        data: {
          followers: { increment: 1 },
        },
      }),
    ]);

    res.json({
      success: true,
      data: { following: true },
    });
  })
);

/**
 * DELETE /api/series/:id/follow
 * Unfollow a series
 */
router.delete(
  '/:id/follow',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;

    // Check if following
    const existing = await prisma.seriesFollow.findUnique({
      where: {
        userId_seriesId: {
          userId,
          seriesId: id,
        },
      },
    });

    if (!existing) {
      return res.json({
        success: true,
        data: { following: false },
        message: 'Not following',
      });
    }

    // Delete follow and update count
    await prisma.$transaction([
      prisma.seriesFollow.delete({
        where: {
          userId_seriesId: {
            userId,
            seriesId: id,
          },
        },
      }),
      prisma.series.update({
        where: { id },
        data: {
          followers: { decrement: 1 },
        },
      }),
    ]);

    res.json({
      success: true,
      data: { following: false },
    });
  })
);

export default router;

