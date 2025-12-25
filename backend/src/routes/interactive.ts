/**
 * Interactive Content Routes
 * Handles polls, quizzes, choice branches, and hotspots in videos
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, UnauthorizedError } from '../lib/errors';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

/**
 * GET /api/interactive/:contentId/elements
 * Get all interactive elements for a content
 */
router.get(
  '/:contentId/elements',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { contentId } = req.params;

    // Verify content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      select: { id: true, status: true, isPublic: true },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Get interactive elements
    const elements = await prisma.interactiveElement.findMany({
      where: { contentId },
      orderBy: { timestamp: 'asc' },
    });

    res.json({
      success: true,
      data: elements,
    });
  })
);

/**
 * POST /api/interactive/elements
 * Create a new interactive element (creator only)
 */
router.post(
  '/elements',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { contentId, type, timestamp, data } = req.body;

    if (!contentId || !type || timestamp === undefined || !data) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: contentId, type, timestamp, data',
        },
      });
    }

    // Verify user owns the content
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    if (content.creator.userId !== userId) {
      throw new UnauthorizedError('You can only add interactive elements to your own content');
    }

    // Validate element type
    const validTypes = ['poll', 'quiz', 'choice_branch', 'hotspot'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
        },
      });
    }

    // Create element
    const element = await prisma.interactiveElement.create({
      data: {
        contentId,
        type,
        timestamp: parseInt(timestamp),
        data,
      },
    });

    res.json({
      success: true,
      data: element,
    });
  })
);

/**
 * PUT /api/interactive/elements/:id
 * Update an interactive element (creator only)
 */
router.put(
  '/elements/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;
    const { type, timestamp, data } = req.body;

    // Get element and verify ownership
    const element = await prisma.interactiveElement.findUnique({
      where: { id },
      include: {
        content: {
          include: { creator: true },
        },
      },
    });

    if (!element) {
      throw new NotFoundError('Interactive element not found');
    }

    if (element.content.creator.userId !== userId) {
      throw new UnauthorizedError('You can only update your own interactive elements');
    }

    // Update element
    const updated = await prisma.interactiveElement.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(timestamp !== undefined && { timestamp: parseInt(timestamp) }),
        ...(data && { data }),
      },
    });

    res.json({
      success: true,
      data: updated,
    });
  })
);

/**
 * DELETE /api/interactive/elements/:id
 * Delete an interactive element (creator only)
 */
router.delete(
  '/elements/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;

    // Get element and verify ownership
    const element = await prisma.interactiveElement.findUnique({
      where: { id },
      include: {
        content: {
          include: { creator: true },
        },
      },
    });

    if (!element) {
      throw new NotFoundError('Interactive element not found');
    }

    if (element.content.creator.userId !== userId) {
      throw new UnauthorizedError('You can only delete your own interactive elements');
    }

    // Delete element (responses will be cascade deleted)
    await prisma.interactiveElement.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Interactive element deleted',
    });
  })
);

/**
 * POST /api/interactive/responses
 * Submit a response to an interactive element
 */
router.post(
  '/responses',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId || null;
    const { elementId, response } = req.body;

    if (!elementId || !response) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: elementId, response',
        },
      });
    }

    // Verify element exists
    const element = await prisma.interactiveElement.findUnique({
      where: { id: elementId },
      include: { content: true },
    });

    if (!element) {
      throw new NotFoundError('Interactive element not found');
    }

    // Check if user already responded (if authenticated)
    if (userId) {
      const existingResponse = await prisma.interactiveResponse.findFirst({
        where: {
          elementId,
          userId,
        },
      });

      if (existingResponse) {
        // Update existing response
        const updated = await prisma.interactiveResponse.update({
          where: { id: existingResponse.id },
          data: { response },
        });

        return res.json({
          success: true,
          data: updated,
          message: 'Response updated',
        });
      }
    }

    // Create new response
    const newResponse = await prisma.interactiveResponse.create({
      data: {
        elementId,
        userId,
        response,
      },
    });

    res.json({
      success: true,
      data: newResponse,
    });
  })
);

/**
 * GET /api/interactive/:contentId/engagement
 * Analyze interactive engagement for a content
 */
router.get(
  '/:contentId/engagement',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { contentId } = req.params;

    // Verify content exists and user owns it
    const content = await prisma.content.findUnique({
      where: { id: contentId },
      include: { creator: true },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    if (content.creator.userId !== userId) {
      throw new UnauthorizedError('You can only view engagement for your own content');
    }

    // Use engagement analyzer
    const { analyzeInteractiveEngagement } = await import('../lib/interactive/engagementAnalyzer');
    const engagement = await analyzeInteractiveEngagement(contentId);

    res.json({
      success: true,
      data: engagement,
    });
  })
);

/**
 * GET /api/interactive/elements/:id/responses
 * Get responses for a specific element (creator only)
 */
router.get(
  '/elements/:id/responses',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const { id } = req.params;

    // Get element and verify ownership
    const element = await prisma.interactiveElement.findUnique({
      where: { id },
      include: {
        content: {
          include: { creator: true },
        },
        responses: {
          orderBy: { timestamp: 'desc' },
          take: 100, // Limit to recent 100 responses
        },
      },
    });

    if (!element) {
      throw new NotFoundError('Interactive element not found');
    }

    if (element.content.creator.userId !== userId) {
      throw new UnauthorizedError('You can only view responses for your own elements');
    }

    res.json({
      success: true,
      data: element.responses,
    });
  })
);

export default router;

