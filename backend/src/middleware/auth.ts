import { Request, Response, NextFunction } from 'express';
import { extractTokenFromHeader, verifyToken, TokenType } from '../lib/auth/jwt';
import { UnauthorizedError } from '../lib/errors';
import { UserContext } from '../lib/auth/roles';

// Extend Express Request to include user context
declare global {
  namespace Express {
    interface Request {
      user?: UserContext;
    }
  }
}

/**
 * Authentication middleware - verifies JWT token
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const payload = verifyToken(token, TokenType.ACCESS);

    // Attach user context to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as any,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }
    next(error);
  }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    const payload = verifyToken(token, TokenType.ACCESS);
    
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as any,
    };
  } catch {
    // No token or invalid token - continue without user
    req.user = undefined;
  }
  
  next();
}

