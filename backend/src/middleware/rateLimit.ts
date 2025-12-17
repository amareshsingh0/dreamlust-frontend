import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { RATE_LIMITS } from '../config/constants';
import { RateLimitError } from '../lib/errors';

/**
 * Rate limiter for authenticated users (100 req/min)
 */
export const userRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.USER.windowMs,
  max: RATE_LIMITS.USER.max,
  message: 'Too many requests from this user, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    if (req.user?.userId) {
      return req.user.userId;
    }
    return ipKeyGenerator(req);
  },
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Rate limit exceeded. Please try again later.');
    next(error);
  },
});

/**
 * Rate limiter for IP addresses (1000 req/min)
 */
export const ipRateLimiter = rateLimit({
  windowMs: RATE_LIMITS.IP.windowMs,
  max: RATE_LIMITS.IP.max,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKeyGenerator,
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Rate limit exceeded. Please try again later.');
    next(error);
  },
});

/**
 * Strict rate limiter for sensitive endpoints (10 req/min)
 */
export const strictRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Per-endpoint rate limiters
 */

/**
 * Search endpoint rate limiter: 60 requests per minute
 */
export const searchRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: 'Too many search requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    if (req.user?.userId) {
      return req.user.userId;
    }
    return ipKeyGenerator(req);
  },
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Search rate limit exceeded. Please try again later.');
    next(error);
  },
});

/**
 * Comments endpoint rate limiter: 30 requests per minute
 */
export const commentsRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many comment requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID if authenticated, otherwise IP
    if (req.user?.userId) {
      return req.user.userId;
    }
    return ipKeyGenerator(req);
  },
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Comment rate limit exceeded. Please try again later.');
    next(error);
  },
});

/**
 * Upload endpoint rate limiter: 5 requests per hour (for creators only)
 */
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many upload requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated users (creators)
    if (!req.user?.userId) {
      return ipKeyGenerator(req);
    }
    return `upload:${req.user.userId}`;
  },
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Upload rate limit exceeded. You can upload up to 5 items per hour.');
    next(error);
  },
});

/**
 * Login endpoint rate limiter: 10 requests per minute
 * (This is the same as strictRateLimiter, but kept separate for clarity)
 */
export const loginRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use email from body if available and parsed, otherwise use IP
    // Body might not be parsed yet when rate limiter runs
    try {
      if (req.body && typeof req.body === 'object' && req.body.email) {
        return `login:${req.body.email}`;
      }
    } catch {
      // Body not available yet, fall back to IP
    }
    return `login:${ipKeyGenerator(req)}`;
  },
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Too many login attempts. Please try again later.');
    next(error);
  },
});

/**
 * Tip endpoint rate limiter: 10 tips per hour per user
 * More restrictive for financial transactions
 */
export const tipRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many tip requests. You can send up to 10 tips per hour.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    // Use user ID for authenticated users, otherwise IP
    if (req.user?.userId) {
      return `tip:${req.user.userId}`;
    }
    return `tip:${ipKeyGenerator(req)}`;
  },
  handler: (req: Request, res: Response, next: NextFunction) => {
    const error = new RateLimitError('Tip rate limit exceeded. You can send up to 10 tips per hour. Please try again later.');
    next(error);
  },
});

