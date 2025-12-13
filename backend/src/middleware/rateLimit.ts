import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
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
    return req.user?.userId || req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    throw new RateLimitError('Rate limit exceeded. Please try again later.');
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
  keyGenerator: (req: Request) => {
    return req.ip || 'unknown';
  },
  handler: (req: Request, res: Response) => {
    throw new RateLimitError('Rate limit exceeded. Please try again later.');
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

