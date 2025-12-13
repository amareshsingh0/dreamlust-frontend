import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../config/constants';
import { requireRole } from '../lib/auth/roles';
import { ForbiddenError } from '../lib/errors';

/**
 * Require specific role(s) middleware
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new ForbiddenError('Authentication required');
    }

    try {
      requireRole(req.user.role, allowedRoles);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Require creator role or higher
 */
export const requireCreator = authorize(UserRole.CREATOR, UserRole.MODERATOR, UserRole.ADMIN);

/**
 * Require moderator role or higher
 */
export const requireModerator = authorize(UserRole.MODERATOR, UserRole.ADMIN);

/**
 * Require admin role
 */
export const requireAdmin = authorize(UserRole.ADMIN);

