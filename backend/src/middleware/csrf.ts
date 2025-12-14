/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import { Request, Response, NextFunction } from 'express';
import csrf from 'csrf';
import { UnauthorizedError } from '../lib/errors';
import { sessionStore } from '../lib/auth/session';

const tokens = new csrf();

// In-memory CSRF secret store (keyed by session ID or user ID)
const csrfSecrets = new Map<string, string>();

/**
 * Get or create CSRF secret for a request
 */
function getCsrfSecret(req: Request): string {
  // Try to get from session cookie first
  const sessionId = req.cookies?.sessionId;
  if (sessionId) {
    const session = sessionStore.get(sessionId);
    if (session) {
      const key = `session:${sessionId}`;
      if (!csrfSecrets.has(key)) {
        csrfSecrets.set(key, tokens.secretSync());
      }
      return csrfSecrets.get(key)!;
    }
  }

  // Fall back to user ID if authenticated
  if (req.user?.userId) {
    const key = `user:${req.user.userId}`;
    if (!csrfSecrets.has(key)) {
      csrfSecrets.set(key, tokens.secretSync());
    }
    return csrfSecrets.get(key)!;
  }

  // Fall back to IP address (less secure but better than nothing)
  const ip = req.ip || 'unknown';
  const key = `ip:${ip}`;
  if (!csrfSecrets.has(key)) {
    csrfSecrets.set(key, tokens.secretSync());
  }
  return csrfSecrets.get(key)!;
}

/**
 * Generate CSRF token for the session
 */
export function generateCsrfToken(req: Request): string {
  const secret = getCsrfSecret(req);
  return tokens.create(secret);
}

/**
 * Verify CSRF token
 */
export function verifyCsrfToken(req: Request, token: string): boolean {
  const secret = getCsrfSecret(req);
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

  // Verify token
  if (!verifyCsrfToken(req, token)) {
    throw new UnauthorizedError('Invalid CSRF token. Please refresh the page and try again.');
  }

  next();
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

  // If token is provided, verify it
  if (token && typeof token === 'string') {
    if (!verifyCsrfToken(req, token)) {
      throw new UnauthorizedError('Invalid CSRF token.');
    }
  }

  next();
}

/**
 * Get CSRF token endpoint handler
 * Returns CSRF token (works for both authenticated and anonymous users)
 */
export function getCsrfToken(req: Request, res: Response): void {
  const token = generateCsrfToken(req);
  
  res.json({
    success: true,
    data: {
      csrfToken: token,
    },
  });
}

