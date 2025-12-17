import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { NotFoundError, ValidationError, UnauthorizedError } from '../lib/errors';
import { z } from 'zod';
import { validateBody } from '../middleware/validation';
import { asyncHandler } from '../middleware/asyncHandler';

const router = Router();

// Validation schemas
const createBundleSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  thumbnail: z.string().url().optional().nullable(),
  contentIds: z.array(z.string().uuid()),
  price: z.number().positive(),
  expiresAt: z.string().datetime().optional().nullable(),
});

const updateBundleSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  thumbnail: z.string().url().optional().nullable(),
  price: z.number().positive().optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.string().datetime().optional().nullable(),
});

/**
 * POST /api/bundles
 * Create a new bundle
 */
router.post(
  '/',
  authenticate,
  userRateLimiter,
  validateBody(createBundleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const userId = req.user!.userId;
    const { title, description, thumbnail, contentIds, price, expiresAt } = req.body;

    // Verify user is a creator
    const creator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new UnauthorizedError('Only creators can create bundles');
    }

    // Verify all content belongs to this creator
    const contents = await prisma.content.findMany({
      where: {
        id: { in: contentIds },
        creatorId: creator.id,
      },
      select: {
        id: true,
        price: true,
        isPremium: true,
      },
    });

    if (contents.length !== contentIds.length) {
      throw new ValidationError('Some content items not found or do not belong to you');
    }

    // Calculate original price (sum of all content prices)
    const originalPrice = contents.reduce((total, content) => {
      if (content.isPremium && content.price) {
        return total + parseFloat(content.price.toString());
      }
      return total;
    }, 0);

    // Calculate discount percentage
    const discountPercent = originalPrice > 0
      ? Math.round(((originalPrice - price) / originalPrice) * 100)
      : 0;

    // Create bundle with bundle items
    const bundle = await prisma.bundle.create({
      data: {
        creatorId: creator.id,
        title,
        description,
        thumbnail,
        price,
        originalPrice,
        discountPercent,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        bundleItems: {
          create: contentIds.map((contentId, index) => ({
            contentId,
            order: index,
          })),
        },
      },
      include: {
        bundleItems: true,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Bundle created successfully',
      data: bundle,
    });
  })
);

/**
 * GET /api/bundles
 * Get all bundles (with optional filters)
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const { creatorId, isActive } = req.query;

    const where: any = {
      deletedAt: null,
    };

    if (creatorId) {
      where.creatorId = creatorId as string;
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
      // Also filter out expired bundles if looking for active ones
      if (isActive === 'true') {
        where.OR = [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ];
      }
    }

    const bundles = await prisma.bundle.findMany({
      where,
      include: {
        bundleItems: {
          select: {
            contentId: true,
            order: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    res.json({
      success: true,
      data: bundles,
    });
  })
);

/**
 * GET /api/bundles/:id
 * Get a specific bundle by ID
 */
router.get(
  '/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        bundleItems: {
          select: {
            contentId: true,
            order: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    if (!bundle) {
      throw new NotFoundError('Bundle not found');
    }

    res.json({
      success: true,
      data: bundle,
    });
  })
);

/**
 * PUT /api/bundles/:id
 * Update a bundle
 */
router.put(
  '/:id',
  authenticate,
  userRateLimiter,
  validateBody(updateBundleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const updateData = req.body;

    // Verify user is a creator
    const creator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new UnauthorizedError('Only creators can update bundles');
    }

    // Verify bundle belongs to this creator
    const existingBundle = await prisma.bundle.findFirst({
      where: {
        id,
        creatorId: creator.id,
        deletedAt: null,
      },
    });

    if (!existingBundle) {
      throw new NotFoundError('Bundle not found or does not belong to you');
    }

    // Prepare update data
    const data: any = {};
    if (updateData.title !== undefined) data.title = updateData.title;
    if (updateData.description !== undefined) data.description = updateData.description;
    if (updateData.thumbnail !== undefined) data.thumbnail = updateData.thumbnail;
    if (updateData.isActive !== undefined) data.isActive = updateData.isActive;
    if (updateData.expiresAt !== undefined) {
      data.expiresAt = updateData.expiresAt ? new Date(updateData.expiresAt) : null;
    }

    // If price is being updated, recalculate discount
    if (updateData.price !== undefined) {
      data.price = updateData.price;
      if (existingBundle.originalPrice) {
        const originalPrice = parseFloat(existingBundle.originalPrice.toString());
        data.discountPercent = Math.round(((originalPrice - updateData.price) / originalPrice) * 100);
      }
    }

    const updatedBundle = await prisma.bundle.update({
      where: { id },
      data,
      include: {
        bundleItems: true,
      },
    });

    res.json({
      success: true,
      message: 'Bundle updated successfully',
      data: updatedBundle,
    });
  })
);

/**
 * DELETE /api/bundles/:id
 * Soft delete a bundle
 */
router.delete(
  '/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;

    // Verify user is a creator
    const creator = await prisma.creator.findUnique({
      where: { userId },
    });

    if (!creator) {
      throw new UnauthorizedError('Only creators can delete bundles');
    }

    // Verify bundle belongs to this creator
    const existingBundle = await prisma.bundle.findFirst({
      where: {
        id,
        creatorId: creator.id,
        deletedAt: null,
      },
    });

    if (!existingBundle) {
      throw new NotFoundError('Bundle not found or does not belong to you');
    }

    // Soft delete
    await prisma.bundle.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });

    res.json({
      success: true,
      message: 'Bundle deleted successfully',
    });
  })
);

/**
 * POST /api/bundles/:id/purchase
 * Purchase a bundle (placeholder - actual payment integration needed)
 */
router.post(
  '/:id/purchase',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user!.userId;
    const { paymentProvider, paymentId } = req.body;

    // Verify bundle exists and is active
    const bundle = await prisma.bundle.findFirst({
      where: {
        id,
        deletedAt: null,
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
    });

    if (!bundle) {
      throw new NotFoundError('Bundle not found or is no longer available');
    }

    // Check if user already purchased this bundle
    const existingPurchase = await prisma.bundlePurchase.findFirst({
      where: {
        bundleId: id,
        userId,
        status: 'completed',
      },
    });

    if (existingPurchase) {
      throw new ValidationError('You have already purchased this bundle');
    }

    // Create purchase record
    // Note: In production, this should be integrated with actual payment processing
    const purchase = await prisma.bundlePurchase.create({
      data: {
        bundleId: id,
        userId,
        amount: bundle.price,
        currency: bundle.currency,
        paymentProvider: paymentProvider || 'razorpay',
        paymentId: paymentId || null,
        status: 'completed', // In production, this should be 'pending' until payment is confirmed
      },
    });

    // Increment purchase count
    await prisma.bundle.update({
      where: { id },
      data: {
        purchaseCount: { increment: 1 },
      },
    });

    res.json({
      success: true,
      message: 'Bundle purchased successfully',
      data: purchase,
    });
  })
);

export default router;
