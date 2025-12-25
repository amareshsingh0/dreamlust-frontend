/**
 * Collaborative Content Review Routes
 * Handles video review and commenting system
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { cache } from '../lib/cache/cacheManager';

const router = Router();

/**
 * Create a review for content
 */
router.post('/:contentId/reviews', async (req, res) => {
  try {
    const { contentId } = req.params;
    const { reviewerId } = req.body;

    const review = await prisma.contentReview.create({
      data: {
        contentId,
        reviewerId,
        status: 'PENDING',
      },
    });

    res.status(201).json({ review });
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

/**
 * Get reviews for content
 */
router.get('/:contentId/reviews', async (req, res) => {
  try {
    const { contentId } = req.params;

    const reviews = await cache.getOrSet(
      `content:${contentId}:reviews`,
      async () => {
        return await prisma.contentReview.findMany({
          where: { contentId },
          include: {
            comments: {
              orderBy: { timestamp: 'asc' },
            },
          },
          orderBy: { createdAt: 'desc' },
        });
      },
      { ttl: 300, tags: [`content:${contentId}`] }
    );

    res.json({ reviews });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

/**
 * Get specific review
 */
router.get('/:contentId/reviews/:reviewId', async (req, res) => {
  try {
    const { reviewId } = req.params;

    const review = await prisma.contentReview.findUnique({
      where: { id: reviewId },
      include: {
        comments: {
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    res.json({ review });
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

/**
 * Add comment to review
 */
router.post('/:contentId/reviews/:reviewId/comments', async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { timestamp, comment, type } = req.body;

    if (!['note', 'issue', 'suggestion'].includes(type)) {
      return res.status(400).json({ error: 'Invalid comment type' });
    }

    const reviewComment = await prisma.contentReviewComment.create({
      data: {
        reviewId,
        timestamp,
        comment,
        type,
        resolved: false,
      },
    });

    // Invalidate cache
    const review = await prisma.contentReview.findUnique({
      where: { id: reviewId },
      select: { contentId: true },
    });

    if (review) {
      await cache.invalidate([`content:${review.contentId}`]);
    }

    res.status(201).json({ comment: reviewComment });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

/**
 * Resolve comment
 */
router.patch('/:contentId/reviews/:reviewId/comments/:commentId/resolve', async (req, res) => {
  try {
    const { commentId } = req.params;

    const comment = await prisma.contentReviewComment.update({
      where: { id: commentId },
      data: { resolved: true },
    });

    res.json({ comment });
  } catch (error) {
    console.error('Error resolving comment:', error);
    res.status(500).json({ error: 'Failed to resolve comment' });
  }
});

/**
 * Submit review with overall feedback
 */
router.post('/:contentId/reviews/:reviewId/submit', async (req, res) => {
  try {
    const { contentId, reviewId } = req.params;
    const { status, overallFeedback } = req.body;

    if (!['approved', 'changes_requested', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const review = await prisma.contentReview.update({
      where: { id: reviewId },
      data: {
        status,
        overallFeedback,
        resolvedAt: new Date(),
      },
    });

    // Update content status based on review
    if (status === 'approved') {
      await prisma.content.update({
        where: { id: contentId },
        data: { status: 'PUBLISHED' },
      });
    } else if (status === 'rejected') {
      await prisma.content.update({
        where: { id: contentId },
        data: { status: 'REJECTED' },
      });
    }

    // Invalidate cache
    await cache.invalidate([`content:${contentId}`]);

    res.json({ review });
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

/**
 * Get comments at specific timestamp
 */
router.get('/:contentId/reviews/:reviewId/comments/at/:timestamp', async (req, res) => {
  try {
    const { reviewId, timestamp } = req.params;
    const timestampNum = parseInt(timestamp);
    const range = 5; // 5 seconds range

    const comments = await prisma.contentReviewComment.findMany({
      where: {
        reviewId,
        timestamp: {
          gte: timestampNum - range,
          lte: timestampNum + range,
        },
      },
      orderBy: { timestamp: 'asc' },
    });

    res.json({ comments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

/**
 * Delete comment
 */
router.delete('/:contentId/reviews/:reviewId/comments/:commentId', async (req, res) => {
  try {
    const { commentId, contentId } = req.params;

    await prisma.contentReviewComment.delete({
      where: { id: commentId },
    });

    // Invalidate cache
    await cache.invalidate([`content:${contentId}`]);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

/**
 * Update comment
 */
router.patch('/:contentId/reviews/:reviewId/comments/:commentId', async (req, res) => {
  try {
    const { commentId, contentId } = req.params;
    const { comment, type } = req.body;

    const updatedComment = await prisma.contentReviewComment.update({
      where: { id: commentId },
      data: {
        comment,
        type,
      },
    });

    // Invalidate cache
    await cache.invalidate([`content:${contentId}`]);

    res.json({ comment: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

/**
 * Get review statistics
 */
router.get('/:contentId/reviews/stats', async (req, res) => {
  try {
    const { contentId } = req.params;

    const stats = await cache.getOrSet(
      `content:${contentId}:review-stats`,
      async () => {
        const reviews = await prisma.contentReview.findMany({
          where: { contentId },
          include: {
            comments: true,
          },
        });

        const totalReviews = reviews.length;
        const totalComments = reviews.reduce((sum, r) => sum + r.comments.length, 0);
        const unresolvedComments = reviews.reduce(
          (sum, r) => sum + r.comments.filter(c => !c.resolved).length,
          0
        );

        const statusCounts = reviews.reduce((acc, r) => {
          acc[r.status] = (acc[r.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        return {
          totalReviews,
          totalComments,
          unresolvedComments,
          statusCounts,
        };
      },
      { ttl: 300, tags: [`content:${contentId}`] }
    );

    res.json({ stats });
  } catch (error) {
    console.error('Error fetching review stats:', error);
    res.status(500).json({ error: 'Failed to fetch review stats' });
  }
});

export default router;
