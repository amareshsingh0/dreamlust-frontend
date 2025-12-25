import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { requireCreator } from '../middleware/authorize';
import { asyncHandler } from '../middleware/asyncHandler';
import { userRateLimiter } from '../middleware/rateLimit';
import { ValidationError, NotFoundError, ForbiddenError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

const createStreamSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  scheduledFor: z.string().datetime().optional(),
  chatEnabled: z.boolean().default(true),
  isRecorded: z.boolean().default(true),
});

const updateStreamSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  chatEnabled: z.boolean().optional(),
  isRecorded: z.boolean().optional(),
});

const chatMessageSchema = z.object({
  message: z.string().min(1).max(500),
});

/**
 * GET /api/live
 * Get all live streams (public endpoint)
 */
router.get(
  '/',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { status = 'live', page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    
    if (status === 'live') {
      where.status = 'live';
    } else if (status === 'upcoming') {
      where.status = 'idle';
      where.scheduledFor = { not: null, gte: new Date() };
    } else if (status === 'all') {
      // Get all streams
    }

    const [streams, total] = await Promise.all([
      prisma.liveStream.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              displayName: true,
              handle: true,
              avatar: true,
              isVerified: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // live first
          { viewerCount: 'desc' },
          { startedAt: 'desc' },
        ],
        skip,
        take: Number(limit),
      }),
      prisma.liveStream.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        streams: streams.map(stream => ({
          id: stream.id,
          title: stream.title,
          description: stream.description,
          thumbnailUrl: stream.thumbnailUrl,
          playbackUrl: stream.playbackUrl,
          status: stream.status,
          viewerCount: stream.viewerCount,
          peakViewerCount: stream.peakViewerCount,
          startedAt: stream.startedAt,
          scheduledFor: stream.scheduledFor,
          category: stream.category,
          tags: stream.tags,
          chatEnabled: stream.chatEnabled,
          creator: {
            id: stream.creator.id,
            name: stream.creator.displayName,
            username: stream.creator.handle,
            avatar: stream.creator.avatar,
            isVerified: stream.creator.isVerified,
          },
        })),
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  })
);

/**
 * GET /api/live/:id
 * Get a specific live stream
 */
router.get(
  '/:id',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            handle: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    res.json({
      success: true,
      data: {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        thumbnailUrl: stream.thumbnailUrl,
        playbackUrl: stream.playbackUrl,
        streamKey: req.user?.userId === stream.creatorId ? stream.streamKey : undefined, // Only show to creator
        status: stream.status,
        viewerCount: stream.viewerCount,
        peakViewerCount: stream.peakViewerCount,
        startedAt: stream.startedAt,
        endedAt: stream.endedAt,
        scheduledFor: stream.scheduledFor,
        category: stream.category,
        tags: stream.tags,
        chatEnabled: stream.chatEnabled,
        isRecorded: stream.isRecorded,
        recordingUrl: stream.recordingUrl,
        creator: {
          id: stream.creator.id,
          name: stream.creator.displayName,
          username: stream.creator.handle,
          avatar: stream.creator.avatar,
          isVerified: stream.creator.isVerified,
        },
      },
    });
  })
);

/**
 * POST /api/live
 * Create a new live stream (creators only)
 */
router.post(
  '/',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(createStreamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const {
      title,
      description,
      category,
      tags,
      scheduledFor,
      chatEnabled = true,
      isRecorded = true,
    } = req.body;

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Generate unique stream key
    const streamKey = `sk_${uuidv4().replace(/-/g, '')}`;

    const stream = await prisma.liveStream.create({
      data: {
        creatorId: creator.id,
        title,
        description,
        category,
        tags: tags || [],
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        streamKey: streamKey,
        chatEnabled: chatEnabled,
        isRecorded: isRecorded,
        status: 'idle',
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            handle: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Live stream created successfully',
      data: {
        id: stream.id,
        title: stream.title,
        description: stream.description,
        streamKey: stream.streamKey,
        status: stream.status,
        scheduledFor: stream.scheduledFor,
        chatEnabled: stream.chatEnabled,
        isRecorded: stream.isRecorded,
        creator: {
          id: stream.creator.id,
          name: stream.creator.displayName,
          username: stream.creator.handle,
          avatar: stream.creator.avatar,
          isVerified: stream.creator.isVerified,
        },
      },
    });
  })
);

/**
 * PUT /api/live/:id
 * Update a live stream (creator only)
 */
router.put(
  '/:id',
  authenticate,
  requireCreator,
  userRateLimiter,
  validateBody(updateStreamSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const updateData = req.body;

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Check ownership
    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (stream.creatorId !== creator.id) {
      throw new ForbiddenError('You do not have permission to update this stream');
    }

    // Only allow updates if stream is idle or scheduled
    if (stream.status === 'live') {
      // Only allow certain fields to be updated during live stream
      const allowedFields = ['title', 'description', 'category', 'tags', 'chatEnabled'];
      Object.keys(updateData).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete updateData[key];
        }
      });
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        ...(updateData.title && { title: updateData.title }),
        ...(updateData.description !== undefined && { description: updateData.description }),
        ...(updateData.category !== undefined && { category: updateData.category }),
        ...(updateData.tags && { tags: updateData.tags }),
        ...(updateData.chatEnabled !== undefined && { chatEnabled: updateData.chatEnabled }),
        ...(updateData.isRecorded !== undefined && { isRecorded: updateData.isRecorded }),
      },
      include: {
        creator: {
          select: {
            id: true,
            displayName: true,
            handle: true,
            avatar: true,
            isVerified: true,
          },
        },
      },
    });

    res.json({
      success: true,
      message: 'Live stream updated successfully',
      data: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        status: updated.status,
        category: updated.category,
        tags: updated.tags,
        chatEnabled: updated.chatEnabled,
        isRecorded: updated.isRecorded,
      },
    });
  })
);

/**
 * POST /api/live/:id/start
 * Start a live stream (creator only)
 */
router.post(
  '/:id/start',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { playbackUrl } = req.body;

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (stream.creatorId !== creator.id) {
      throw new ForbiddenError('You do not have permission to start this stream');
    }

    if (stream.status === 'live') {
      throw new ValidationError('Stream is already live');
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'live',
        startedAt: new Date(),
        playbackUrl: playbackUrl || stream.playbackUrl,
      },
    });

    res.json({
      success: true,
      message: 'Live stream started',
      data: {
        id: updated.id,
        status: updated.status,
        playbackUrl: updated.playbackUrl,
        startedAt: updated.startedAt,
      },
    });
  })
);

/**
 * POST /api/live/:id/end
 * End a live stream (creator only)
 */
router.post(
  '/:id/end',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { recordingUrl } = req.body;

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (stream.creatorId !== creator.id) {
      throw new ForbiddenError('You do not have permission to end this stream');
    }

    if (stream.status !== 'live') {
      throw new ValidationError('Stream is not currently live');
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'ended',
        endedAt: new Date(),
        ...(recordingUrl && { recordingUrl: recordingUrl }),
      },
    });

    res.json({
      success: true,
      message: 'Live stream ended',
      data: {
        id: updated.id,
        status: updated.status,
        endedAt: updated.endedAt,
        recordingUrl: updated.recordingUrl,
      },
    });
  })
);

/**
 * POST /api/live/:id/viewer
 * Increment viewer count (called when user joins stream)
 */
router.post(
  '/:id/viewer',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (stream.status !== 'live') {
      throw new ValidationError('Stream is not currently live');
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        viewerCount: { increment: 1 },
        peakViewerCount: stream.viewerCount >= stream.peakViewerCount
          ? stream.viewerCount + 1
          : stream.peakViewerCount,
      },
    });

    res.json({
      success: true,
      data: {
        viewerCount: updated.viewerCount,
        peakViewerCount: updated.peakViewerCount,
      },
    });
  })
);

/**
 * DELETE /api/live/:id/viewer
 * Decrement viewer count (called when user leaves stream)
 */
router.delete(
  '/:id/viewer',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        viewerCount: Math.max(0, stream.viewerCount - 1),
      },
    });

    res.json({
      success: true,
      data: {
        viewerCount: updated.viewerCount,
      },
    });
  })
);

/**
 * GET /api/live/:id/chat
 * Get chat messages for a live stream
 */
router.get(
  '/:id/chat',
  optionalAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { limit = 50 } = req.query;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (!stream.chatEnabled) {
      return res.json({
        success: true,
        data: {
          messages: [],
          chatEnabled: false,
        },
      });
    }

    const messages = await prisma.liveChatMessage.findMany({
      where: {
        streamId: id,
        isDeleted: false,
      },
      include: {
        stream: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
      take: Number(limit),
    });

    // Get user info for messages
    const userIds = [...new Set(messages.map(m => m.userId).filter((id): id is string => id !== null))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      success: true,
      data: {
        messages: messages.reverse().map(msg => {
          const msgUser = msg.userId ? userMap.get(msg.userId) : null;
          return {
            id: msg.id,
            message: msg.message,
            timestamp: msg.timestamp,
            user: msgUser ? {
              id: msgUser.id,
              username: msgUser.username,
              displayName: msgUser.displayName,
              avatar: msgUser.avatar,
            } : null,
          };
        }),
        chatEnabled: true,
      },
    });
  })
);

/**
 * POST /api/live/:id/chat
 * Send a chat message to a live stream
 */
router.post(
  '/:id/chat',
  authenticate,
  userRateLimiter,
  validateBody(chatMessageSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { message } = req.body;

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (stream.status !== 'live') {
      throw new ValidationError('Stream is not currently live');
    }

    if (!stream.chatEnabled) {
      throw new ValidationError('Chat is disabled for this stream');
    }

    const chatMessage = await prisma.liveChatMessage.create({
      data: {
        streamId: id,
        userId: userId,
        message: message.trim(),
      },
      include: {
        stream: {
          select: {
            id: true,
          },
        },
      },
    });

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatar: true,
      },
    });

    res.json({
      success: true,
      message: 'Message sent',
      data: {
        id: chatMessage.id,
        message: chatMessage.message,
        timestamp: chatMessage.timestamp,
        user: user ? {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
        } : null,
      },
    });
  })
);

/**
 * DELETE /api/live/:id
 * Delete a live stream (creator only)
 */
router.delete(
  '/:id',
  authenticate,
  requireCreator,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { id } = req.params;

    // Get creator
    const creator = await prisma.creator.findFirst({
      where: { userId: userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    const stream = await prisma.liveStream.findUnique({
      where: { id },
    });

    if (!stream) {
      throw new NotFoundError('Live stream not found');
    }

    if (stream.creatorId !== creator.id) {
      throw new ForbiddenError('You do not have permission to delete this stream');
    }

    if (stream.status === 'live') {
      throw new ValidationError('Cannot delete a live stream. Please end it first.');
    }

    await prisma.liveStream.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Live stream deleted successfully',
    });
  })
);

export default router;
