import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/:contentId/reviews', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;
    const { overallFeedback } = req.body;

    const content = await prisma.content.findUnique({
      where: { id: contentId },
    });

    if (!content) {
      return res.status(404).json({ error: 'Content not found' });
    }

    const review = await prisma.contentReview.create({
      data: {
        contentId,
        reviewerId: req.user!.userId,
        status: 'PENDING',
        overallFeedback,
      },
    });

    res.json(review);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

router.get('/:contentId/reviews', authenticate, async (req, res) => {
  try {
    const { contentId } = req.params;

    const reviews = await prisma.contentReview.findMany({
      where: { contentId },
      include: {
        comments: {
          orderBy: { timestamp: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

router.get('/:contentId/reviews/:reviewId', authenticate, async (req, res) => {
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

    res.json(review);
  } catch (error) {
    console.error('Error fetching review:', error);
    res.status(500).json({ error: 'Failed to fetch review' });
  }
});

router.post('/:contentId/reviews/:reviewId/comments', authenticate, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { timestamp, comment, type } = req.body;

    const review = await prisma.contentReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const reviewComment = await prisma.contentReviewComment.create({
      data: {
        reviewId,
        timestamp,
        comment,
        type,
      },
    });

    res.json(reviewComment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

router.patch('/:contentId/reviews/:reviewId/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { comment, resolved } = req.body;

    const reviewComment = await prisma.contentReviewComment.findUnique({
      where: { id: commentId },
      include: { review: true },
    });

    if (!reviewComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (reviewComment.review.reviewerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.contentReviewComment.update({
      where: { id: commentId },
      data: {
        ...(comment && { comment }),
        ...(resolved !== undefined && { resolved }),
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

router.delete('/:contentId/reviews/:reviewId/comments/:commentId', authenticate, async (req, res) => {
  try {
    const { commentId } = req.params;

    const reviewComment = await prisma.contentReviewComment.findUnique({
      where: { id: commentId },
      include: { review: true },
    });

    if (!reviewComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (reviewComment.review.reviewerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await prisma.contentReviewComment.delete({
      where: { id: commentId },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

router.post('/:contentId/reviews/:reviewId/submit', authenticate, async (req, res) => {
  try {
    const { contentId, reviewId } = req.params;
    const { status, overallFeedback } = req.body;

    const review = await prisma.contentReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    if (review.reviewerId !== req.user!.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const updated = await prisma.contentReview.update({
      where: { id: reviewId },
      data: {
        status,
        overallFeedback,
        resolvedAt: new Date(),
      },
    });

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

    res.json(updated);
  } catch (error) {
    console.error('Error submitting review:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

router.get('/:contentId/reviews/:reviewId/comments/at/:timestamp', authenticate, async (req, res) => {
  try {
    const { reviewId, timestamp } = req.params;

    const comments = await prisma.contentReviewComment.findMany({
      where: {
        reviewId,
        timestamp: parseInt(timestamp),
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments at timestamp:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

export default router;
