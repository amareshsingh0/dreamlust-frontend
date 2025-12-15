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
      where.scheduled_for = { not: null, gte: new Date() };
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
              display_name: true,
              handle: true,
              avatar: true,
              is_verified: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' }, // live first
          { viewer_count: 'desc' },
          { started_at: 'desc' },
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
          thumbnailUrl: stream.thumbnail_url,
          playbackUrl: stream.playback_url,
          status: stream.status,
          viewerCount: stream.viewer_count,
          peakViewerCount: stream.peak_viewer_count,
          startedAt: stream.started_at,
          scheduledFor: stream.scheduled_for,
          category: stream.category,
          tags: stream.tags,
          chatEnabled: stream.chat_enabled,
          creator: {
            id: stream.creator.id,
            name: stream.creator.display_name,
            username: stream.creator.handle,
            avatar: stream.creator.avatar,
            isVerified: stream.creator.is_verified,
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
            display_name: true,
            handle: true,
            avatar: true,
            is_verified: true,
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
        thumbnailUrl: stream.thumbnail_url,
        playbackUrl: stream.playback_url,
        streamKey: req.user?.userId === stream.creator_id ? stream.stream_key : undefined, // Only show to creator
        status: stream.status,
        viewerCount: stream.viewer_count,
        peakViewerCount: stream.peak_viewer_count,
        startedAt: stream.started_at,
        endedAt: stream.ended_at,
        scheduledFor: stream.scheduled_for,
        category: stream.category,
        tags: stream.tags,
        chatEnabled: stream.chat_enabled,
        isRecorded: stream.is_recorded,
        recordingUrl: stream.recording_url,
        creator: {
          id: stream.creator.id,
          name: stream.creator.display_name,
          username: stream.creator.handle,
          avatar: stream.creator.avatar,
          isVerified: stream.creator.is_verified,
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
      where: { user_id: userId },
    });

    if (!creator) {
      throw new NotFoundError('Creator profile not found');
    }

    // Generate unique stream key
    const streamKey = `sk_${uuidv4().replace(/-/g, '')}`;

    const stream = await prisma.liveStream.create({
      data: {
        creator_id: creator.id,
        title,
        description,
        category,
        tags: tags || [],
        scheduled_for: scheduledFor ? new Date(scheduledFor) : null,
        stream_key: streamKey,
        chat_enabled: chatEnabled,
        is_recorded: isRecorded,
        status: 'idle',
      },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            handle: true,
            avatar: true,
            is_verified: true,
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
        streamKey: stream.stream_key,
        status: stream.status,
        scheduledFor: stream.scheduled_for,
        chatEnabled: stream.chat_enabled,
        isRecorded: stream.is_recorded,
        creator: {
          id: stream.creator.id,
          name: stream.creator.display_name,
          username: stream.creator.handle,
          avatar: stream.creator.avatar,
          isVerified: stream.creator.is_verified,
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
      where: { user_id: userId },
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

    if (stream.creator_id !== creator.id) {
      throw new ForbiddenError('You do not have permission to update this stream');
    }

    // Only allow updates if stream is idle or scheduled
    if (stream.status === 'live') {
      // Only allow certain fields to be updated during live stream
      const allowedFields = ['title', 'description', 'category', 'tags', 'chat_enabled'];
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
        ...(updateData.chatEnabled !== undefined && { chat_enabled: updateData.chatEnabled }),
        ...(updateData.isRecorded !== undefined && { is_recorded: updateData.isRecorded }),
      },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            handle: true,
            avatar: true,
            is_verified: true,
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
        chatEnabled: updated.chat_enabled,
        isRecorded: updated.is_recorded,
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
      where: { user_id: userId },
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

    if (stream.creator_id !== creator.id) {
      throw new ForbiddenError('You do not have permission to start this stream');
    }

    if (stream.status === 'live') {
      throw new ValidationError('Stream is already live');
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'live',
        started_at: new Date(),
        playback_url: playbackUrl || stream.playback_url,
      },
    });

    res.json({
      success: true,
      message: 'Live stream started',
      data: {
        id: updated.id,
        status: updated.status,
        playbackUrl: updated.playback_url,
        startedAt: updated.started_at,
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
      where: { user_id: userId },
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

    if (stream.creator_id !== creator.id) {
      throw new ForbiddenError('You do not have permission to end this stream');
    }

    if (stream.status !== 'live') {
      throw new ValidationError('Stream is not currently live');
    }

    const updated = await prisma.liveStream.update({
      where: { id },
      data: {
        status: 'ended',
        ended_at: new Date(),
        ...(recordingUrl && { recording_url: recordingUrl }),
      },
    });

    res.json({
      success: true,
      message: 'Live stream ended',
      data: {
        id: updated.id,
        status: updated.status,
        endedAt: updated.ended_at,
        recordingUrl: updated.recording_url,
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
        viewer_count: { increment: 1 },
        peak_viewer_count: stream.viewer_count >= stream.peak_viewer_count
          ? stream.viewer_count + 1
          : stream.peak_viewer_count,
      },
    });

    res.json({
      success: true,
      data: {
        viewerCount: updated.viewer_count,
        peakViewerCount: updated.peak_viewer_count,
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
        viewer_count: Math.max(0, stream.viewer_count - 1),
      },
    });

    res.json({
      success: true,
      data: {
        viewerCount: updated.viewer_count,
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

    if (!stream.chat_enabled) {
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
        stream_id: id,
        is_deleted: false,
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
    const userIds = [...new Set(messages.map(m => m.user_id))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar: true,
      },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    res.json({
      success: true,
      data: {
        messages: messages.reverse().map(msg => ({
          id: msg.id,
          message: msg.message,
          timestamp: msg.timestamp,
          user: userMap.get(msg.user_id) ? {
            id: userMap.get(msg.user_id)!.id,
            username: userMap.get(msg.user_id)!.username,
            displayName: userMap.get(msg.user_id)!.display_name,
            avatar: userMap.get(msg.user_id)!.avatar,
          } : null,
        })),
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

    if (!stream.chat_enabled) {
      throw new ValidationError('Chat is disabled for this stream');
    }

    const chatMessage = await prisma.liveChatMessage.create({
      data: {
        stream_id: id,
        user_id: userId,
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
        display_name: true,
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
          displayName: user.display_name,
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
      where: { user_id: userId },
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

    if (stream.creator_id !== creator.id) {
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
