/**
 * Community Posts Routes
 * Creator community posts, likes, and comments
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validation';
import { z } from 'zod';
import { NotFoundError, UnauthorizedError, ForbiddenError } from '../lib/errors';

const router = Router();

// ============================================================================
// COMMUNITY POSTS
// ============================================================================

const createPostSchema = z.object({
  content: z.string().min(1).max(5000),
  image: z.string().url().optional(),
  isPublic: z.boolean().optional().default(true),
});

const updatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  image: z.string().url().optional().nullable(),
  isPinned: z.boolean().optional(),
  isPublic: z.boolean().optional(),
});

/**
 * GET /api/community/posts
 * Get all public community posts (feed)
 */
router.get(
  '/posts',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const posts = await prisma.communityPost.findMany({
      where: {
        isPublic: true,
        deletedAt: null,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
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
        likes: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      image: post.image,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      isPinned: post.isPinned,
      isPublic: post.isPublic,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isLiked: userId ? (post.likes && post.likes.length > 0) : false,
      author: {
        id: post.creator.id,
        name: post.creator.displayName,
        username: post.creator.handle,
        avatar: post.creator.avatar,
        isVerified: post.creator.isVerified,
      },
    }));

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit,
      },
    });
  })
);

/**
 * GET /api/community/posts/creator/:creatorId
 * Get community posts for a specific creator
 */
router.get(
  '/posts/creator/:creatorId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { creatorId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    // Check if creator exists
    const creator = await prisma.creator.findUnique({
      where: { id: creatorId },
      select: {
        id: true,
        displayName: true,
        handle: true,
        avatar: true,
        isVerified: true,
      },
    });

    if (!creator) {
      throw new NotFoundError('Creator not found');
    }

    const posts = await prisma.communityPost.findMany({
      where: {
        creatorId,
        isPublic: true,
        deletedAt: null,
      },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
      skip: offset,
      include: {
        likes: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    const formattedPosts = posts.map(post => ({
      id: post.id,
      content: post.content,
      image: post.image,
      likeCount: post._count.likes,
      commentCount: post._count.comments,
      isPinned: post.isPinned,
      isPublic: post.isPublic,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      isLiked: userId ? (post.likes && post.likes.length > 0) : false,
      author: {
        id: creator.id,
        name: creator.displayName,
        username: creator.handle,
        avatar: creator.avatar,
        isVerified: creator.isVerified,
      },
    }));

    res.json({
      success: true,
      data: formattedPosts,
      pagination: {
        limit,
        offset,
        hasMore: posts.length === limit,
      },
    });
  })
);

/**
 * GET /api/community/posts/:postId
 * Get a single community post
 */
router.get(
  '/posts/:postId',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId } = req.params;

    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
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
        likes: userId ? {
          where: { userId },
          select: { id: true },
        } : false,
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundError('Post not found');
    }

    res.json({
      success: true,
      data: {
        id: post.id,
        content: post.content,
        image: post.image,
        likeCount: post._count.likes,
        commentCount: post._count.comments,
        isPinned: post.isPinned,
        isPublic: post.isPublic,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        isLiked: userId ? (post.likes && post.likes.length > 0) : false,
        author: {
          id: post.creator.id,
          name: post.creator.displayName,
          username: post.creator.handle,
          avatar: post.creator.avatar,
          isVerified: post.creator.isVerified,
        },
      },
    });
  })
);

/**
 * POST /api/community/posts
 * Create a new community post (creators only)
 */
router.post(
  '/posts',
  authenticate,
  userRateLimiter,
  validateBody(createPostSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if user is a creator
    const creator = await prisma.creator.findUnique({
      where: { userId },
      select: { id: true, displayName: true, handle: true, avatar: true, isVerified: true },
    });

    if (!creator) {
      throw new ForbiddenError('Only creators can create community posts');
    }

    const { content, image, isPublic } = req.body;

    const post = await prisma.communityPost.create({
      data: {
        creatorId: creator.id,
        content,
        image,
        isPublic,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: post.id,
        content: post.content,
        image: post.image,
        likeCount: 0,
        commentCount: 0,
        isPinned: post.isPinned,
        isPublic: post.isPublic,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        isLiked: false,
        author: {
          id: creator.id,
          name: creator.displayName,
          username: creator.handle,
          avatar: creator.avatar,
          isVerified: creator.isVerified,
        },
      },
    });
  })
);

/**
 * PUT /api/community/posts/:postId
 * Update a community post (creator only)
 */
router.put(
  '/posts/:postId',
  authenticate,
  userRateLimiter,
  validateBody(updatePostSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get the post and verify ownership
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        creator: {
          select: { userId: true },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundError('Post not found');
    }

    if (post.creator.userId !== userId) {
      throw new ForbiddenError('You can only edit your own posts');
    }

    const { content, image, isPinned, isPublic } = req.body;

    const updatedPost = await prisma.communityPost.update({
      where: { id: postId },
      data: {
        ...(content !== undefined && { content }),
        ...(image !== undefined && { image }),
        ...(isPinned !== undefined && { isPinned }),
        ...(isPublic !== undefined && { isPublic }),
        updatedAt: new Date(),
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
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: updatedPost.id,
        content: updatedPost.content,
        image: updatedPost.image,
        likeCount: updatedPost._count.likes,
        commentCount: updatedPost._count.comments,
        isPinned: updatedPost.isPinned,
        isPublic: updatedPost.isPublic,
        createdAt: updatedPost.createdAt,
        updatedAt: updatedPost.updatedAt,
        author: {
          id: updatedPost.creator.id,
          name: updatedPost.creator.displayName,
          username: updatedPost.creator.handle,
          avatar: updatedPost.creator.avatar,
          isVerified: updatedPost.creator.isVerified,
        },
      },
    });
  })
);

/**
 * DELETE /api/community/posts/:postId
 * Delete a community post (creator only)
 */
router.delete(
  '/posts/:postId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get the post and verify ownership
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
      include: {
        creator: {
          select: { userId: true },
        },
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundError('Post not found');
    }

    if (post.creator.userId !== userId) {
      throw new ForbiddenError('You can only delete your own posts');
    }

    // Soft delete
    await prisma.communityPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    res.json({
      success: true,
      message: 'Post deleted successfully',
    });
  })
);

// ============================================================================
// LIKES
// ============================================================================

/**
 * POST /api/community/posts/:postId/like
 * Like a community post
 */
router.post(
  '/posts/:postId/like',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if post exists
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundError('Post not found');
    }

    // Check if already liked
    const existingLike = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      return res.json({
        success: true,
        message: 'Already liked',
        data: { liked: true },
      });
    }

    // Create like and increment count
    await prisma.$transaction([
      prisma.communityPostLike.create({
        data: { postId, userId },
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { increment: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: 'Post liked',
      data: { liked: true },
    });
  })
);

/**
 * DELETE /api/community/posts/:postId/like
 * Unlike a community post
 */
router.delete(
  '/posts/:postId/like',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if like exists
    const existingLike = await prisma.communityPostLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (!existingLike) {
      return res.json({
        success: true,
        message: 'Not liked',
        data: { liked: false },
      });
    }

    // Delete like and decrement count
    await prisma.$transaction([
      prisma.communityPostLike.delete({
        where: {
          postId_userId: {
            postId,
            userId,
          },
        },
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { likeCount: { decrement: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: 'Post unliked',
      data: { liked: false },
    });
  })
);

// ============================================================================
// COMMENTS
// ============================================================================

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
});

/**
 * GET /api/community/posts/:postId/comments
 * Get comments for a post
 */
router.get(
  '/posts/:postId/comments',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { postId } = req.params;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    // Check if post exists
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundError('Post not found');
    }

    const comments = await prisma.communityPostComment.findMany({
      where: {
        postId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      content: comment.content,
      likeCount: comment.likeCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      author: {
        id: comment.user.id,
        name: comment.user.displayName || comment.user.username,
        username: comment.user.username,
        avatar: comment.user.avatar,
      },
    }));

    res.json({
      success: true,
      data: formattedComments,
      pagination: {
        limit,
        offset,
        hasMore: comments.length === limit,
      },
    });
  })
);

/**
 * POST /api/community/posts/:postId/comments
 * Add a comment to a post
 */
router.post(
  '/posts/:postId/comments',
  authenticate,
  userRateLimiter,
  validateBody(createCommentSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId } = req.params;
    const { content } = req.body;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Check if post exists
    const post = await prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundError('Post not found');
    }

    // Create comment and increment count
    const [comment] = await prisma.$transaction([
      prisma.communityPostComment.create({
        data: {
          postId,
          userId,
          content,
        },
        include: {
          user: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatar: true,
            },
          },
        },
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { commentCount: { increment: 1 } },
      }),
    ]);

    res.status(201).json({
      success: true,
      data: {
        id: comment.id,
        content: comment.content,
        likeCount: comment.likeCount,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.user.id,
          name: comment.user.displayName || comment.user.username,
          username: comment.user.username,
          avatar: comment.user.avatar,
        },
      },
    });
  })
);

/**
 * DELETE /api/community/posts/:postId/comments/:commentId
 * Delete a comment (author or post creator only)
 */
router.delete(
  '/posts/:postId/comments/:commentId',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { postId, commentId } = req.params;

    if (!userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get the comment
    const comment = await prisma.communityPostComment.findUnique({
      where: { id: commentId },
      include: {
        post: {
          include: {
            creator: {
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundError('Comment not found');
    }

    // Check if user is comment author or post creator
    const isCommentAuthor = comment.userId === userId;
    const isPostCreator = comment.post.creator.userId === userId;

    if (!isCommentAuthor && !isPostCreator) {
      throw new ForbiddenError('You can only delete your own comments');
    }

    // Soft delete comment and decrement count
    await prisma.$transaction([
      prisma.communityPostComment.update({
        where: { id: commentId },
        data: { deletedAt: new Date() },
      }),
      prisma.communityPost.update({
        where: { id: postId },
        data: { commentCount: { decrement: 1 } },
      }),
    ]);

    res.json({
      success: true,
      message: 'Comment deleted successfully',
    });
  })
);

export default router;
