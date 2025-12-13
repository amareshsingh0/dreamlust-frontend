import { Request, Response, NextFunction } from 'express';
import { AppError, createErrorResponse } from '../lib/errors';
import { HTTP_STATUS } from '../config/constants';

/**
 * Global error handler middleware
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  console.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    user: req.user?.userId,
  });

  // Handle known AppError
  if (error instanceof AppError) {
    const response = createErrorResponse(error);
    res.status(error.statusCode).json(response);
    return;
  }

  // Handle unknown errors
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

