/**
 * Age Verification Middleware
 * Protects routes that require age verification
 */

import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { getUserAge, meetsAgeRequirement } from '../lib/auth/ageVerification';

/**
 * Middleware to require age verification
 * @param minimumAge Minimum age required (default: 18)
 */
export function requireAgeVerification(minimumAge: number = 18) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.user.userId) {
        throw new UnauthorizedError('Authentication required');
      }

      const age = await getUserAge(req.user.userId);
      
      if (age === null) {
        throw new ForbiddenError(
          'Age verification required. Please update your profile with your date of birth.'
        );
      }

      if (age < minimumAge) {
        throw new ForbiddenError(
          `This content is restricted to users ${minimumAge} years and older.`
        );
      }

      // Attach age to request for downstream use
      (req as any).userAge = age;

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Middleware to check if user has verified age (but don't block if not)
 */
export async function checkAgeVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (req.user && req.user.userId) {
      const age = await getUserAge(req.user.userId);
      (req as any).userAge = age;
      (req as any).hasAgeVerification = age !== null;
    }
    next();
  } catch (error) {
    // Don't fail the request, just continue without age info
    next();
  }
}

