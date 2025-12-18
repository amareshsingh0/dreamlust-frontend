/**
 * HTTPS Enforcement Middleware
 * Redirects HTTP to HTTPS in production
 */

import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Enforce HTTPS in production
 */
export function enforceHTTPS(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Only enforce in production
  if (env.NODE_ENV !== 'production') {
    return next();
  }

  // Check if request is already HTTPS
  const isSecure = req.secure || 
                   req.headers['x-forwarded-proto'] === 'https' ||
                   req.headers['x-forwarded-ssl'] === 'on';

  if (!isSecure) {
    // Redirect to HTTPS
    const httpsUrl = `https://${req.get('host')}${req.originalUrl}`;
    return res.redirect(301, httpsUrl);
  }

  next();
}

/**
 * Set HSTS header (Strict-Transport-Security)
 * This is already handled by Helmet, but we can add it explicitly
 */
export function setHSTSHeader(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload'
    );
  }
  next();
}

