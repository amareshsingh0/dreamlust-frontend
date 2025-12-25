/**
 * Pricing Routes
 * Handles dynamic pricing calculations and pricing rules
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate, optionalAuth } from '../middleware/auth';
import { userRateLimiter } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/asyncHandler';
import { calculatePrice, PricingContext } from '../lib/pricing/pricingEngine';
import { BadRequestError } from '../lib/errors';

const router = Router();

/**
 * POST /api/pricing/calculate
 * Calculate dynamic price for a product
 */
router.post(
  '/calculate',
  optionalAuth,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { product, context } = req.body;

    if (!product || !product.price) {
      throw new BadRequestError('Product with price is required');
    }

    const pricingContext: PricingContext = {
      userId: req.user?.userId || context?.userId,
      location: context?.location,
      promoCode: context?.promoCode,
      productType: context?.productType || product.type,
      timeOfDay: context?.timeOfDay,
    };

    const calculation = await calculatePrice(product, pricingContext);

    res.json({
      success: true,
      data: calculation,
    });
  })
);

/**
 * GET /api/pricing/rules
 * Get active pricing rules (admin/creator only)
 */
router.get(
  '/rules',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { type, isActive } = req.query;

    const where: any = {};
    if (type) where.type = type;
    if (isActive !== undefined) where.isActive = isActive === 'true';

    const rules = await prisma.pricingRule.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({
      success: true,
      data: rules,
    });
  })
);

/**
 * POST /api/pricing/rules
 * Create pricing rule (admin only)
 */
router.post(
  '/rules',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { name, type, conditions, discount, priority, startDate, endDate, usageLimit } = req.body;

    if (!name || !type || discount === undefined) {
      throw new BadRequestError('Name, type, and discount are required');
    }

    // TODO: Check if user is admin

    const rule = await prisma.pricingRule.create({
      data: {
        name,
        type,
        conditions: conditions || {},
        discount: discount,
        priority: priority || 0,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        usageLimit: usageLimit || null,
      },
    });

    res.json({
      success: true,
      data: rule,
    });
  })
);

/**
 * PUT /api/pricing/rules/:id
 * Update pricing rule (admin only)
 */
router.put(
  '/rules/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, type, conditions, discount, priority, isActive, startDate, endDate, usageLimit } = req.body;

    // TODO: Check if user is admin

    const rule = await prisma.pricingRule.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(conditions !== undefined && { conditions }),
        ...(discount !== undefined && { discount }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(usageLimit !== undefined && { usageLimit }),
      },
    });

    res.json({
      success: true,
      data: rule,
    });
  })
);

/**
 * DELETE /api/pricing/rules/:id
 * Delete pricing rule (admin only)
 */
router.delete(
  '/rules/:id',
  authenticate,
  userRateLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    // TODO: Check if user is admin

    await prisma.pricingRule.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Pricing rule deleted',
    });
  })
);

export default router;

