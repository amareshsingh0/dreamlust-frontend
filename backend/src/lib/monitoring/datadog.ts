/**
 * Datadog APM (Application Performance Monitoring) Configuration
 * Backend performance monitoring and tracing
 */

import { env } from '../../config/env';
import logger from '../logger';

let datadogInitialized = false;

export function initDatadog() {
  if (!env.DATADOG_API_KEY || !env.DATADOG_APP_KEY) {
    logger.warn('Datadog API/App keys not configured. APM disabled.');
    return;
  }

  try {
    // Initialize Datadog APM
    // Note: dd-trace must be imported and initialized before any other imports
    // This is typically done in server.ts at the very top
    const tracer = require('dd-trace');
    
    tracer.init({
      service: 'dreamlust-api',
      env: env.DD_ENV || env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      site: env.DD_SITE || 'datadoghq.com',
      logInjection: true, // Inject trace IDs into logs
      runtimeMetrics: true, // Collect runtime metrics
      profiling: true, // Enable profiling
      tags: {
        environment: env.NODE_ENV,
        service: 'dreamlust-api',
      },
    });

    datadogInitialized = true;
    logger.info('Datadog APM initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize Datadog APM', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Create a span for custom operations
 */
export function createSpan(name: string, operation: string, callback: (span: any) => void) {
  if (!datadogInitialized) {
    return callback(null);
  }

  try {
    const tracer = require('dd-trace');
    return tracer.scope().active()?.span() || null;
  } catch (error) {
    logger.warn('Failed to create Datadog span', { error });
    return callback(null);
  }
}

/**
 * Add custom tags to current span
 */
export function addTags(tags: Record<string, string | number>) {
  if (!datadogInitialized) return;

  try {
    const tracer = require('dd-trace');
    const span = tracer.scope().active()?.span();
    if (span) {
      Object.entries(tags).forEach(([key, value]) => {
        span.setTag(key, value);
      });
    }
  } catch (error) {
    // Silently fail - don't break application
  }
}

/**
 * Track custom metric
 */
export function trackMetric(name: string, value: number, tags?: Record<string, string>) {
  if (!datadogInitialized) return;

  try {
    // In production, use Datadog StatsD or API
    // For now, log the metric
    logger.debug('Datadog metric', { name, value, tags });
  } catch (error) {
    // Silently fail
  }
}

/**
 * Track custom event
 */
export function trackEvent(title: string, text: string, tags?: Record<string, string>) {
  if (!datadogInitialized) return;

  try {
    // In production, use Datadog Events API
    logger.info('Datadog event', { title, text, tags });
  } catch (error) {
    // Silently fail
  }
}


