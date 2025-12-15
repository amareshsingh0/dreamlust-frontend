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
    // Check if authorization header exists before extracting token
    if (!req.headers.authorization) {
      req.user = undefined;
      return next();
    }

    const token = extractTokenFromHeader(req.headers.authorization);
    const payload = verifyToken(token, TokenType.ACCESS);
    
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role as any,
    };
  } catch (error) {
    // No token or invalid token - continue without user
    // This is expected for optional auth, so we don't log it as an error
    req.user = undefined;
  }
  
  next();
}

