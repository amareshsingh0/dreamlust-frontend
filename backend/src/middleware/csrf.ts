/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 * Uses Redis for token storage when available
 */

import { Request, Response, NextFunction } from 'express';
import csrf from 'csrf';
import { UnauthorizedError } from '../lib/errors';
import { sessionStore } from '../lib/auth/session';
import { redis, isRedisAvailable } from '../lib/redis';
import crypto from 'crypto';

const tokens = new csrf();

// In-memory CSRF secret store (fallback when Redis unavailable)
const csrfSecrets = new Map<string, string>();

/**
 * Get or create CSRF secret for a request
 */
async function getCsrfSecret(req: Request): Promise<string> {
  // Try to get from session cookie first
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    const session = sessionStore.get(sessionId);
    if (session) {
      const key = `csrf:secret:session:${sessionId}`;
      
      // Try Redis first
      if (isRedisAvailable() && redis) {
        const cached = await redis.get(key);
        if (cached) {
          return cached;
        }
        // Generate and store in Redis
        const secret = tokens.secretSync();
        await redis.setex(key, 86400, secret); // 24 hours
        return secret;
      }
      
      // Fallback to in-memory
      if (!csrfSecrets.has(key)) {
        csrfSecrets.set(key, tokens.secretSync());
      }
      return csrfSecrets.get(key)!;
    }
  }

  // Fall back to user ID if authenticated
  if (req.user?.userId) {
    const key = `csrf:secret:user:${req.user.userId}`;
    
    // Try Redis first
    if (isRedisAvailable() && redis) {
      const cached = await redis.get(key);
      if (cached) {
        return cached;
      }
      // Generate and store in Redis
      const secret = tokens.secretSync();
      await redis.setex(key, 86400, secret); // 24 hours
      return secret;
    }
    
    // Fallback to in-memory
    if (!csrfSecrets.has(key)) {
      csrfSecrets.set(key, tokens.secretSync());
    }
    return csrfSecrets.get(key)!;
  }

  // Fall back to IP address (less secure but better than nothing)
  const ip = req.ip || 'unknown';
  const key = `csrf:secret:ip:${ip}`;
  
  // Try Redis first
  if (isRedisAvailable() && redis) {
    const cached = await redis.get(key);
    if (cached) {
      return cached;
    }
    // Generate and store in Redis
    const secret = tokens.secretSync();
    await redis.setex(key, 3600, secret); // 1 hour for IP-based
    return secret;
  }
  
  // Fallback to in-memory
  if (!csrfSecrets.has(key)) {
    csrfSecrets.set(key, tokens.secretSync());
  }
  return csrfSecrets.get(key)!;
}

/**
 * Generate CSRF token for the session
 */
export async function generateCsrfToken(req: Request): Promise<string> {
  const secret = await getCsrfSecret(req);
  const token = tokens.create(secret);
  
  // Store token in Redis for verification (15 minutes)
  const tokenKey = `csrf:token:${crypto.createHash('sha256').update(token).digest('hex')}`;
  if (isRedisAvailable() && redis) {
    await redis.setex(tokenKey, 900, '1'); // 15 minutes
  }
  
  return token;
}

/**
 * Verify CSRF token
 */
export async function verifyCsrfToken(req: Request, token: string): Promise<boolean> {
  // Check if token exists in Redis (one-time use tokens)
  const tokenKey = `csrf:token:${crypto.createHash('sha256').update(token).digest('hex')}`;
  if (isRedisAvailable() && redis) {
    const exists = await redis.get(tokenKey);
    if (!exists) {
      return false; // Token not found or expired
    }
    // Delete token after use (one-time use)
    await redis.del(tokenKey);
  }
  
  const secret = await getCsrfSecret(req);
  return tokens.verify(secret, token);
}

/**
 * CSRF protection middleware
 * Skips CSRF for GET, HEAD, OPTIONS requests
 * Requires CSRF token in header or body for state-changing requests
 */
export function csrfProtect(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for webhook endpoints (they use their own verification)
  if (req.path.startsWith('/api/webhooks')) {
    return next();
  }

  // Get CSRF token from header or body
  const token = req.headers['x-csrf-token'] || 
                req.headers['csrf-token'] || 
                req.body?.csrfToken ||
                req.query?.csrfToken;

  if (!token || typeof token !== 'string') {
    throw new UnauthorizedError('CSRF token is required. Please include X-CSRF-Token header.');
  }

  // Verify token (async)
  verifyCsrfToken(req, token).then((isValid) => {
    if (!isValid) {
      throw new UnauthorizedError('Invalid CSRF token. Please refresh the page and try again.');
    }
    next();
  }).catch((error) => {
    next(error);
  });
}

/**
 * Optional CSRF - only validates if token is provided
 * Useful for endpoints that can work with or without CSRF
 */
export function optionalCsrfProtect(req: Request, res: Response, next: NextFunction): void {
  // Skip CSRF for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || 
                req.headers['csrf-token'] || 
                req.body?.csrfToken ||
                req.query?.csrfToken;

  // If token is provided, verify it (async)
  if (token && typeof token === 'string') {
    verifyCsrfToken(req, token).then((isValid) => {
      if (!isValid) {
        throw new UnauthorizedError('Invalid CSRF token.');
      }
      next();
    }).catch((error) => {
      next(error);
    });
    return;
  }

  next();
}

/**
 * Get CSRF token endpoint handler
 * Returns CSRF token (works for both authenticated and anonymous users)
 */
export async function getCsrfToken(req: Request, res: Response): Promise<void> {
  const token = await generateCsrfToken(req);
  
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
}

