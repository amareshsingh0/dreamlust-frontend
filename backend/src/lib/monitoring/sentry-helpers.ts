/**
 * Sentry Helper Functions
 * Utility functions for common Sentry operations in API routes
 */

import { Request } from 'express';
import { captureException, addBreadcrumb, setUser, clearUser } from './sentry';

/**
 * Wrap an async route handler with Sentry error tracking
 * @example
 * ```ts
 * router.get('/api/search', withSentry(async (req, res) => {
 *   // Your route handler
 * }));
 * ```
 */
export function withSentry<T extends (...args: any[]) => Promise<any>>(
  handler: T
): T {
  return (async (...args: Parameters<T>) => {
    const req = args[0] as Request;
    
    try {
      // Add breadcrumb for request
      addBreadcrumb({
        category: 'http',
        message: `${req.method} ${req.path}`,
        level: 'info',
        data: {
          method: req.method,
          path: req.path,
          query: req.query,
        },
      });
      
      // Set user context if authenticated
      if (req.user) {
        setUser({
          id: req.user.userId,
          email: req.user.email,
          username: req.user.username,
        });
      }
      
      return await handler(...args);
    } catch (error) {
      // Capture exception with context
      if (error instanceof Error) {
        captureException(error, {
          tags: {
            endpoint: req.path,
            method: req.method,
          },
          user: req.user ? {
            id: req.user.userId,
            email: req.user.email,
            username: req.user.username,
          } : undefined,
          extra: {
            body: req.body,
            query: req.query,
            params: req.params,
          },
        });
      }
      
      throw error;
    } finally {
      // Clear user context after request
      clearUser();
    }
  }) as T;
}

/**
 * Capture error with endpoint context
 * @example
 * ```ts
 * try {
 *   // Your code
 * } catch (error) {
 *   captureEndpointError(error, req, { query: searchQuery });
 *   throw error;
 * }
 * ```
 */
export function captureEndpointError(
  error: Error,
  req: Request,
  extra?: Record<string, any>
) {
  captureException(error, {
    tags: {
      endpoint: req.path,
      method: req.method,
    },
    user: req.user ? {
      id: req.user.userId,
      email: req.user.email,
      username: req.user.username,
    } : undefined,
    extra: {
      ...extra,
      body: req.body,
      query: req.query,
      params: req.params,
    },
  });
}

/**
 * Add breadcrumb for API call
 */
export function addApiBreadcrumb(
  message: string,
  data?: Record<string, any>,
  level: 'info' | 'warning' | 'error' = 'info'
) {
  addBreadcrumb({
    category: 'api',
    message,
    level,
    data,
  });
}


