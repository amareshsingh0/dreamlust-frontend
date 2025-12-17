/**
 * Request Logging Middleware
 * Logs all incoming HTTP requests with Winston and collects metrics
 */

import { Request, Response, NextFunction } from 'express';
import logger from '../lib/logger';
import { metricsCollector } from '../lib/monitoring/metricsCollector';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  // Log request start
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.userId,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.userId,
    };

    // Collect metrics for monitoring
    metricsCollector.recordRequest(res.statusCode, duration);

    // Log level based on status code
    if (res.statusCode >= 500) {
      logger.error('Request failed', logData);
    } else if (res.statusCode >= 400) {
      logger.warn('Request error', logData);
    } else {
      logger.info('Request completed', logData);
    }
  });

  next();
}


