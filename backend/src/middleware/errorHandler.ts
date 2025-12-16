import { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse } from '../lib/errors';
import { HTTP_STATUS } from '../config/constants';
import { captureException } from '../lib/monitoring/sentry';
import { env } from '../config/env';
import logger from '../lib/logger';

/**
 * Global error handler middleware
 * Automatically captures errors to Sentry in production
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with Winston
  logger.error('Request error', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.userId,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });

  // Handle known AppError (client errors - don't send to Sentry)
  if (error instanceof AppError) {
    // Only send 5xx errors to Sentry
    if (error.statusCode >= 500 && env.SENTRY_DSN) {
      captureException(error, {
        tags: {
          endpoint: req.path,
          method: req.method,
          errorType: 'AppError',
          statusCode: error.statusCode.toString(),
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
        level: 'error',
      });
    }
    
    const response = createErrorResponse(error);
    res.status(error.statusCode).json(response);
    return;
  }

  // Handle unknown errors (always send to Sentry)
  if (env.SENTRY_DSN) {
    captureException(error, {
      tags: {
        endpoint: req.path,
        method: req.method,
        errorType: 'UnknownError',
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
        stack: error.stack,
      },
      level: 'error',
    });
  }

  const response = createErrorResponse(error);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json(response);
}

/**
 * 404 Not Found handler
 */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(HTTP_STATUS.NOT_FOUND).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      timestamp: new Date().toISOString(),
    },
  });
}

