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
          userId: userId,
          deletedAt: null,
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
          userId ? { userId: userId } : { id: 'none' }, // Only show private if it's the owner
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
        userId: userId,
        name,
        description,
        isPublic: isPublic ?? false,
        itemCount: 0,
        viewCount: 0,
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
    const { name, description, isPublic } = req.body;

    // Check if playlist exists and user owns it
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Build update data with snake_case field names
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    const updated = await prisma.playlist.update({
      where: { id },
      data: updateData,
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
        userId: userId,
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
 * GET /api/playlists/:id/items
 * Get playlist items with content details
 */
router.get(
  '/:id/items',
  optionalAuth,
  userRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    // Check if playlist exists and is accessible
    const playlist = await prisma.playlist.findFirst({
      where: {
        id,
        deletedAt: null,
        OR: [
          { isPublic: true },
          userId ? { userId: userId } : { id: 'none' },
        ],
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Get playlist items with content
    const [items, total] = await Promise.all([
      prisma.playlistItem.findMany({
        where: { playlistId: id },
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
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      prisma.playlistItem.count({
        where: { playlistId: id },
      }),
    ]);

    // Serialize BigInt fields
    const serializedItems = items.map(item => ({
      ...item,
      content: item.content ? {
        ...item.content,
        viewCount: Number(item.content.viewCount || 0),
        likeCount: Number(item.content.likeCount || 0),
        commentCount: Number(item.content.commentCount || 0),
        duration: item.content.duration ? Number(item.content.duration) : null,
        fileSize: item.content.fileSize ? Number(item.content.fileSize) : null,
      } : null,
    }));

    res.json({
      success: true,
      data: {
        items: serializedItems,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
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
        userId: userId,
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

    // Check if item already exists using the unique constraint
    const existing = await prisma.playlistItem.findFirst({
      where: {
        playlistId: id,
        contentId: contentId,
      },
    });

    if (existing) {
      // Return success with warning instead of throwing error
      return res.json({
        success: true,
        warning: 'Content is already in this playlist',
        data: existing,
      });
    }

    // Get max sortOrder if not specified
    let itemPosition = position;
    if (itemPosition === undefined) {
      const maxPosition = await prisma.playlistItem.findFirst({
        where: { playlistId: id },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      itemPosition = maxPosition?.sortOrder ? maxPosition.sortOrder + 1 : 0;
    } else {
      // Shift other items if position is specified
      await prisma.playlistItem.updateMany({
        where: {
          playlistId: id,
          sortOrder: { gte: itemPosition },
        },
        data: {
          sortOrder: { increment: 1 },
        },
      });
    }

    // Create playlist item
    const item = await prisma.playlistItem.create({
      data: {
        playlistId: id,
        contentId: contentId,
        sortOrder: itemPosition,
      },
    });

    // Update playlist item count
    await prisma.playlist.update({
      where: { id },
      data: {
        itemCount: { increment: 1 },
      },
    });

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
        userId: userId,
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
        sortOrder: { gt: item.sortOrder ?? 0 },
      },
      data: {
        sortOrder: { decrement: 1 },
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
        userId: userId,
        deletedAt: null,
      },
    });

    if (!playlist) {
      throw new NotFoundError('Playlist not found');
    }

    // Update sortOrder in transaction
    await prisma.$transaction(
      items.map((item: { id: string; position: number }) =>
        prisma.playlistItem.update({
          where: { id: item.id },
          data: { sortOrder: item.position },
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

