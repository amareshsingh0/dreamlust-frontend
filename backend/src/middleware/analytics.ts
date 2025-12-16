import { Request, Response, NextFunction } from 'express';
import { trackEvent, EventTypes } from '../lib/analytics/tracker';

/**
 * Middleware to automatically track page views
 */
export function trackPageView(req: Request, res: Response, next: NextFunction): void {
  // Track page view asynchronously (don't wait)
  const userId = (req as any).user?.userId;
  trackEvent(req, EventTypes.PAGE_VIEW, {
    path: req.path,
    method: req.method,
    query: req.query,
  }, userId).catch((error) => {
    console.error('Failed to track page view:', error);
  });

  next();
}

/**
 * Middleware to track API requests
 */
export function trackApiRequest(req: Request, res: Response, next: NextFunction): void {
  const originalSend = res.send;

  res.send = function (body) {
    // Track API request after response is sent
    const userId = (req as any).user?.userId;
    trackEvent(req, 'api_request', {
      path: req.path,
      method: req.method,
      statusCode: res.statusCode,
    }, userId).catch((error) => {
      console.error('Failed to track API request:', error);
    });

    return originalSend.call(this, body);
  };

  next();
}

