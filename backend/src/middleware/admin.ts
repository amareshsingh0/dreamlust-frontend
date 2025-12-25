/**
 * Admin Middleware
 * Ensures user has ADMIN role
 * This middleware checks the database to verify admin status
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { prisma } from '../lib/prisma';

/**
 * Middleware to require admin role
 * Checks database to ensure user has ADMIN role
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Check if user is authenticated (should be set by auth middleware)
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    // Get user from database to check role
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is active
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is not active');
    }

    // Check if user has admin role
    if (user.role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }

    // Attach user role to request for downstream use
    (req as any).userRole = user.role;

    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Middleware to require admin OR creator role
 */
export async function requireAdminOrCreator(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { role: true, status: true },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (user.status !== 'ACTIVE') {
      throw new ForbiddenError('Account is not active');
    }

    if (user.role !== 'ADMIN' && user.role !== 'CREATOR') {
      throw new ForbiddenError('Admin or Creator access required');
    }

    (req as any).userRole = user.role;
    next();
  } catch (error) {
    next(error);
  }
}

