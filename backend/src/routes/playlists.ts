import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { userRateLimiter } from '../middleware/rateLimit';
import {
  createPlaylistSchema,
  updatePlaylistSchema,
  addToPlaylistSchema,
  reorderPlaylistSchema,
} from '../schemas/playlist';
import { NotFoundError, ForbiddenError } from '../lib/errors';

const router = Router();

/**
 * GET /api/playlists
 * Get user's playlists (or public playlists if not authenticated)
 */
router.get(
  '/',
  optionalAuth,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (userId) {
      // Get user's playlists
      const playlists = await prisma.playlist.findMany({
        where: {
          userId,
          deletedAt: null,
        },
        include: {
          items: {
            include: {
              content: {
                select: {
                  id: true,
                  thumbnail: true,
                },
              },
            },
            orderBy: {
              position: 'asc',
            },
            take: 4, // For thumbnail generation
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      res.json({
        success: true,
        data: playlists,
      });
    } else {
      // Get public playlists
      const playlists = await prisma.playlist.findMany({
        where: {
          isPublic: true,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatar: true,
            },
          },
          items: {
            include: {
              content: {
                select: {
                  id: true,
                  thumbnail: true,
                },
              },
            },
            orderBy: {
              position: 'asc',
            },
            take: 4,
          },
        },
        orderBy: {
          viewCount: 'desc',
        },
        take: 20,
      });

      res.json({
        success: true,
        data: playlists,
      });
    }
  }
);

/**
 * GET /api/playlists/:id
 * Get a specific playlist
 */
router.get(
  '/:id',
  optionalAuth,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;

    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { isPublic: true },
          userId ? { userId } : { id: 'none' }, // Only show private if it's the owner
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
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
                    displayName: true,
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

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Increment view count if not the owner
    if (userId && playlist.userId !== userId) {
      await prisma.playlist.update({
        where: { id },
        data: {
          viewCount: { increment: 1 },
        },
      });
    }

    res.json({
      success: true,
      data: playlist,
    });
  }
);

/**
 * POST /api/playlists
 * Create a new playlist
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  validateBody(createPlaylistSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { name, description, isPublic } = req.body;

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        name,
        description,
        isPublic,
        itemCount: 0,
        viewCount: 0,
      },
      include: {
        items: true,
      },
    });

    res.status(201).json({
      success: true,
      data: playlist,
      message: 'Playlist created successfully',
    });
  }
);

/**
 * PUT /api/playlists/:id
 * Update a playlist
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  validateBody(updatePlaylistSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const updateData = req.body;

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    const updated = await prisma.playlist.update({
      where: { id },
      data: updateData,
      include: {
        items: {
          include: {
            content: {
              select: {
                id: true,
                thumbnail: true,
              },
            },
          },
          orderBy: {
            position: 'asc',
          },
        },
      },
    });

    res.json({
      success: true,
      data: updated,
      message: 'Playlist updated successfully',
    });
  }
);

/**
 * DELETE /api/playlists/:id
 * Delete a playlist (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    await prisma.playlist.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Playlist deleted successfully',
    });
  }
);

/**
 * POST /api/playlists/:id/items
 * Add content to playlist
 */
router.post(
  '/:id/items',
  authenticate,
  userRateLimiter,
  validateBody(addToPlaylistSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { contentId, position } = req.body;

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if item already exists
    const existing = await prisma.playlistItem.findUnique({
      where: {
        playlistId_contentId: {
          playlistId: id,
          contentId,
        },
      },
    });

    if (existing) {
      throw new ForbiddenError('Content already in playlist');
    }

    // Get max position if not specified
    let itemPosition = position;
    if (itemPosition === undefined) {
      const maxPosition = await prisma.playlistItem.findFirst({
        where: { playlistId: id },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      itemPosition = maxPosition ? maxPosition.position + 1 : 0;
    } else {
      // Shift other items if position is specified
      await prisma.playlistItem.updateMany({
        where: {
          playlistId: id,
          position: { gte: itemPosition },
        },
        data: {
          position: { increment: 1 },
        },
      });
    }

    // Create playlist item
    const item = await prisma.playlistItem.create({
      data: {
        playlistId: id,
        contentId,
        position: itemPosition,
      },
      include: {
        content: {
          include: {
            creator: {
              select: {
                id: true,
                handle: true,
                displayName: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    // Update playlist item count
    await prisma.playlist.update({
      where: { id },
      data: {
        itemCount: { increment: 1 },
      },
    });

    // Auto-generate thumbnail from first 4 items if not set
    if (!playlist.thumbnail) {
      const items = await prisma.playlistItem.findMany({
        where: { playlistId: id },
        include: {
          content: {
            select: { thumbnail: true },
          },
        },
        orderBy: { position: 'asc' },
        take: 4,
      });

      if (items.length > 0) {
        // Use first item's thumbnail as playlist thumbnail
        await prisma.playlist.update({
          where: { id },
          data: {
            thumbnail: items[0].content.thumbnail || null,
          },
        });
      }
    }

    res.status(201).json({
      success: true,
      data: item,
      message: 'Content added to playlist',
    });
  }
);

/**
 * DELETE /api/playlists/:id/items/:itemId
 * Remove content from playlist
 */
router.delete(
  '/:id/items/:itemId',
  authenticate,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const { id, itemId } = req.params;
    const userId = req.user!.userId;

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Check if item exists
    const item = await prisma.playlistItem.findFirst({
      where: {
        id: itemId,
        playlistId: id,
      },
    });

    if (!item) {
      throw new NotFoundError('Playlist item not found');
    }

    // Delete item
    await prisma.playlistItem.delete({
      where: { id: itemId },
    });

    // Update positions of remaining items
    await prisma.playlistItem.updateMany({
      where: {
        playlistId: id,
        position: { gt: item.position },
      },
      data: {
        position: { decrement: 1 },
      },
    });

    // Update playlist item count
    await prisma.playlist.update({
      where: { id },
      data: {
        itemCount: { decrement: 1 },
      },
    });

    res.json({
      success: true,
      message: 'Content removed from playlist',
    });
  }
);

/**
 * PUT /api/playlists/:id/reorder
 * Reorder playlist items (drag-and-drop)
 */
router.put(
  '/:id/reorder',
  authenticate,
  userRateLimiter,
  validateBody(reorderPlaylistSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { items } = req.body;

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Update positions in transaction
    await prisma.$transaction(
      items.map((item: { id: string; position: number }) =>
        prisma.playlistItem.update({
          where: { id: item.id },
          data: { position: item.position },
        })
      )
    );

    res.json({
      success: true,
      message: 'Playlist reordered successfully',
    });
  }
);

export default router;

