/**
 * Seasons Routes
 * Handles seasons and episodes management
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * POST /api/seasons
 * Create a new season (creator only)
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

    const { seriesId, seasonNumber, title, description, coverImage, releaseDate } = req.body;

    if (!seriesId || seasonNumber === undefined) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'seriesId and seasonNumber are required',
        },
      });
    }

    // Verify series ownership
    const series = await prisma.series.findUnique({
      where: { id: seriesId },
      include: { creator: true },
    });

    if (!series) {
      throw new NotFoundError('Series not found');
    }

    if (series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only add seasons to your own series');
    }

    const season = await prisma.season.create({
      data: {
        seriesId,
        seasonNumber: parseInt(seasonNumber),
        title,
        description,
        coverImage,
        releaseDate: releaseDate ? new Date(releaseDate) : null,
      },
      include: {
        series: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: season,
    });
  })
);

/**
 * PUT /api/seasons/:id
 * Update season (creator only)
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
    const { title, description, coverImage, releaseDate } = req.body;

    // Verify ownership
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        series: {
          include: { creator: true },
        },
      },
    });

    if (!season) {
      throw new NotFoundError('Season not found');
    }

    if (season.series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only update your own seasons');
    }

    const updated = await prisma.season.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(coverImage !== undefined && { coverImage }),
        ...(releaseDate !== undefined && { releaseDate: releaseDate ? new Date(releaseDate) : null }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/seasons/:id
 * Delete season (creator only)
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
    const season = await prisma.season.findUnique({
      where: { id },
      include: {
        series: {
          include: { creator: true },
        },
      },
    });

    if (!season) {
      throw new NotFoundError('Season not found');
    }

    if (season.series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only delete your own seasons');
    }

    await prisma.season.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Season deleted',
    });
  })
);

/**
 * POST /api/seasons/:id/episodes
 * Add episode to season (creator only)
 */
router.post(
  '/:id/episodes',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id: seasonId } = req.params;
    const { contentId, episodeNumber, title, description, duration, releaseDate, isPublished } = req.body;

    if (!contentId || episodeNumber === undefined || !title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'contentId, episodeNumber, and title are required',
        },
      });
    }

    // Verify season ownership
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      include: {
        series: {
          include: { creator: true },
        },
      },
    });

    if (!season) {
      throw new NotFoundError('Season not found');
    }

    if (season.series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only add episodes to your own seasons');
    }

    // Verify content ownership
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    if (content.creator.userId !== userId) {
      throw new UnauthorizedError('Content must belong to you');
    }

    // Create episode and update series total episodes
    const [episode] = await prisma.$transaction([
      prisma.episode.create({
        data: {
          seasonId,
          contentId,
          episodeNumber: parseInt(episodeNumber),
          title,
          description,
          duration: duration ? parseInt(duration) : null,
          releaseDate: releaseDate ? new Date(releaseDate) : null,
          isPublished: isPublished !== undefined ? isPublished : false,
        },
        include: {
          content: {
            select: {
              id: true,
              title: true,
              thumbnail: true,
              duration: true,
            },
          },
          season: {
            select: {
              id: true,
              seasonNumber: true,
              series: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
        },
      }),
      prisma.series.update({
        where: { id: season.seriesId },
        data: {
          totalEpisodes: { increment: 1 },
        },
      }),
    ]);

    res.json({
      success: true,
      data: episode,
    });
  })
);

/**
 * PUT /api/seasons/episodes/:id
 * Update episode (creator only)
 */
router.put(
  '/episodes/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;
    const { episodeNumber, title, description, duration, releaseDate, isPublished } = req.body;

    // Verify ownership
    const episode = await prisma.episode.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            series: {
              include: { creator: true },
            },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundError('Episode not found');
    }

    if (episode.season.series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only update your own episodes');
    }

    const updated = await prisma.episode.update({
      where: { id },
      data: {
        ...(episodeNumber !== undefined && { episodeNumber: parseInt(episodeNumber) }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(duration !== undefined && { duration: duration ? parseInt(duration) : null }),
        ...(releaseDate !== undefined && { releaseDate: releaseDate ? new Date(releaseDate) : null }),
        ...(isPublished !== undefined && { isPublished }),
      },
      include: {
        content: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
            duration: true,
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
 * DELETE /api/seasons/episodes/:id
 * Delete episode (creator only)
 */
router.delete(
  '/episodes/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;

    // Verify ownership
    const episode = await prisma.episode.findUnique({
      where: { id },
      include: {
        season: {
          include: {
            series: {
              include: { creator: true },
            },
          },
        },
      },
    });

    if (!episode) {
      throw new NotFoundError('Episode not found');
    }

    if (episode.season.series.creator.userId !== userId) {
      throw new UnauthorizedError('You can only delete your own episodes');
    }

    // Delete episode and update series total
    await prisma.$transaction([
      prisma.episode.delete({
        where: { id },
      }),
      prisma.series.update({
        where: { id: episode.season.seriesId },
        data: {
          totalEpisodes: { decrement: 1 },
        },
      }),
    ]);

    res.json({
      success: true,
      message: 'Episode deleted',
    });
  })
);

export default router;

