import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { commentsRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, UnauthorizedError, ValidationError } from '../lib/errors';
import { validateBody, validateQuery } from '../middleware/validation';
import { awardPoints } from '../lib/loyalty/points';
import {
  createCommentSchema,
  updateCommentSchema,
  commentLikeSchema,
  reportCommentSchema,
} from '../schemas/comment';
import { z } from 'zod';

const router = Router();

// Helper function to calculate comment depth
function getCommentDepth(comment: any, depth = 0): number {
  if (!comment.parentId) return depth;
  return depth + 1;
}

// Helper function to build nested comment tree
async function buildCommentTree(
  comments: any[],
  userId?: string,
  maxDepth = 3
): Promise<any[]> {
  const commentMap = new Map();
  const rootComments: any[] = [];

  // First pass: create map and identify root comments
  for (const comment of comments) {
    const commentData = {
      ...comment,
      replies: [],
      userLiked: false,
      userDisliked: false,
      depth: 0,
    };
    commentMap.set(comment.id, commentData);

    if (!comment.parentId) {
      rootComments.push(commentData);
    }
  }

  // Second pass: build tree structure
  for (const comment of comments) {
    const commentData = commentMap.get(comment.id);
    if (comment.parentId) {
      const parent = commentMap.get(comment.parentId);
      if (parent) {
        const depth = getCommentDepth(commentData);
        if (depth < maxDepth) {
          commentData.depth = depth;
          parent.replies.push(commentData);
        }
      }
    }
  }

  // Third pass: get user likes/dislikes if authenticated
  if (userId) {
    const commentIds = comments.map(c => c.id);
    const userLikes = await prisma.commentLike.findMany({
      where: {
        commentId: { in: commentIds },
        userId,
      },
    });

    for (const like of userLikes) {
      const comment = commentMap.get(like.commentId);
      if (comment) {
        if (like.type === 'like') {
          comment.userLiked = true;
        } else if (like.type === 'dislike') {
          comment.userDisliked = true;
        }
      }
    }
  }

  return rootComments;
}

const getCommentsQuerySchema = z.object({
  sort: z.enum(['top', 'newest', 'oldest']).default('top'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

/**
 * GET /api/comments/:contentId
 * Get comments for content with pagination and sorting
 */
router.get(
  '/:contentId',
  optionalAuth,
  validateQuery(getCommentsQuerySchema),
  async (req: Request, res: Response) => {
    const { contentId } = req.params;
    const userId = req.user?.userId;
    const { sort, page, limit } = req.query as any;

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    const skip = (page - 1) * limit;

    // Build orderBy based on sort
    let orderBy: any = {};
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else {
      // Top: pinned first, then by likes - dislikes, then by date
      orderBy = [
        { isPinned: 'desc' },
        { likes: 'desc' },
        { createdAt: 'desc' },
      ];
    }

    // Get comments
    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        where: {
          contentId,
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
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.comment.count({
        where: {
          contentId,
          deletedAt: null,
        },
      }),
    ]);

    // Build nested tree
    const commentTree = await buildCommentTree(comments, userId);

    res.json({
      success: true,
      data: {
        comments: commentTree,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
);

/**
 * POST /api/comments
 * Create a new comment
 */
router.post(
  '/',
  authenticate,
  commentsRateLimiter,
  validateBody(createCommentSchema),
  async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { contentId, text, parentId } = req.body;

    // Check if content exists
    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      throw new NotFoundError('Content not found');
    }

    // Check if comments are allowed
    if (!content.allowComments) {
      throw new ValidationError('Comments are disabled for this content');
    }

    // If parentId exists, check if it's valid and calculate depth
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
      });

      if (!parent) {
        throw new NotFoundError('Parent comment not found');
      }

      if (parent.contentId !== contentId) {
        throw new ValidationError('Parent comment does not belong to this content');
      }

      // Check depth (max 3 levels)
      const depth = getCommentDepth(parent);
      if (depth >= 3) {
        throw new ValidationError('Maximum comment depth reached');
      }
    }

    // Create comment
    const comment = await prisma.comment.create({
      data: {
        contentId,
        userId,
        text,
        parentId: parentId || null,
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

    // Update content comment count
    await prisma.content.update({
      where: { id: contentId },
      data: {
        totalComments: {
          increment: 1,
        },
      },
    });

    // Award points for commenting (only for top-level comments, not replies)
    if (!parentId) {
      awardPoints(userId, 'COMMENT', {
        contentId,
        commentId: comment.id,
      }).catch((error) => {
        console.error('Failed to award comment points:', error);
      });
    }

    res.status(201).json({
      success: true,
      data: comment,
    });
  }
);

/**
 * PUT /api/comments/:id
 * Update a comment (only within 5 minutes)
 */
router.put(
  '/:id',
  authenticate,
  commentsRateLimiter,
  validateBody(updateCommentSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { text } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new UnauthorizedError('You can only edit your own comments');
    }

    // Check if comment was created within 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    if (comment.createdAt < fiveMinutesAgo) {
      throw new ValidationError('Comments can only be edited within 5 minutes of posting');
    }

    // Update comment
    const updated = await prisma.comment.update({
      where: { id },
      data: {
        text,
        isEdited: true,
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

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * DELETE /api/comments/:id
 * Delete a comment (soft delete)
 */
router.delete(
  '/:id',
  authenticate,
  commentsRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        content: true,
      },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check if user owns the comment or is the content creator
    const isOwner = comment.userId === userId;
    const isCreator = comment.content.creatorId === userId;

    if (!isOwner && !isCreator) {
      throw new UnauthorizedError('You can only delete your own comments');
    }

    // Soft delete
    await prisma.comment.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });

    // Update content comment count
    await prisma.content.update({
      where: { id: comment.contentId },
      data: {
        totalComments: {
          decrement: 1,
        },
      },
    });

    res.json({
      success: true,
      message: 'Comment deleted',
    });
  }
);

/**
 * POST /api/comments/:id/like
 * Like or dislike a comment
 */
router.post(
  '/:id/like',
  authenticate,
  commentsRateLimiter,
  validateBody(commentLikeSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { type } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check if user already liked/disliked
    const existingLike = await prisma.commentLike.findUnique({
      where: {
        commentId_userId: {
          commentId: id,
          userId,
        },
      },
    });

    let updatedComment;

    if (existingLike) {
      if (existingLike.type === type) {
        // Remove like/dislike
        await prisma.commentLike.delete({
          where: {
            id: existingLike.id,
          },
        });

        updatedComment = await prisma.comment.update({
          where: { id },
          data: {
            [type === 'like' ? 'likes' : 'dislikes']: {
              decrement: 1,
            },
          },
        });
      } else {
        // Change from like to dislike or vice versa
        await prisma.commentLike.update({
          where: {
            id: existingLike.id,
          },
          data: { type },
        });

        updatedComment = await prisma.comment.update({
          where: { id },
          data: {
            [existingLike.type === 'like' ? 'likes' : 'dislikes']: {
              decrement: 1,
            },
            [type === 'like' ? 'likes' : 'dislikes']: {
              increment: 1,
            },
          },
        });
      }
    } else {
      // Create new like/dislike
      await prisma.commentLike.create({
        data: {
          commentId: id,
          userId,
          type,
        },
      });

      updatedComment = await prisma.comment.update({
        where: { id },
        data: {
          [type === 'like' ? 'likes' : 'dislikes']: {
            increment: 1,
          },
        },
      });
    }

    res.json({
      success: true,
      data: updatedComment,
    });
  }
);

/**
 * POST /api/comments/:id/pin
 * Pin a comment (creators only)
 */
router.post(
  '/:id/pin',
  authenticate,
  commentsRateLimiter,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    const comment = await prisma.comment.findUnique({
      where: { id },
      include: {
        content: {
          include: {
            creator: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Check if user is the content creator
    if (comment.content.creatorId !== userId) {
      throw new UnauthorizedError('Only content creators can pin comments');
    }

    // Toggle pin status
    const updated = await prisma.comment.update({
      where: { id },
      data: {
        isPinned: !comment.isPinned,
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

    res.json({
      success: true,
      data: updated,
    });
  }
);

/**
 * POST /api/comments/:id/report
 * Report a comment
 */
router.post(
  '/:id/report',
  authenticate,
  commentsRateLimiter,
  validateBody(reportCommentSchema),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { reason, type } = req.body;

    const comment = await prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundError('Comment not found');
    }

    // Create report
    await prisma.report.create({
      data: {
        reporterId: userId,
        contentId: comment.contentId,
        type: type || 'OTHER',
        reason,
        status: 'PENDING',
      },
    });

    res.json({
      success: true,
      message: 'Comment reported successfully',
    });
  }
);

export default router;

