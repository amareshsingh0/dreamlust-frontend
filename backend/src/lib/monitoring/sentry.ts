/**
 * Sentry Error Tracking Configuration
 * Initialize Sentry for error tracking and performance monitoring
 */

import * as Sentry from '@sentry/node';
import { Express } from 'express';
import { env } from '../../config/env';

let appInstance: Express | undefined;

export function initSentry(app?: Express) {
  if (!env.SENTRY_DSN) {
    // Use console.warn here since logger might not be initialized yet
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  appInstance = app;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.SENTRY_ENVIRONMENT || env.NODE_ENV,
    tracesSampleRate: parseFloat(env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
    integrations: [
      // Enable HTTP tracing
      new Sentry.Integrations.Http({ tracing: true }),
      // Enable Express integration
      ...(app ? [new Sentry.Integrations.Express({ app })] : []),
    ],
    // Capture unhandled promise rejections
    captureUnhandledRejections: true,
    // Capture uncaught exceptions
    captureUncaughtExceptions: true,
    // Release tracking
    release: process.env.SENTRY_RELEASE || undefined,
    // Server name
    serverName: process.env.SENTRY_SERVER_NAME || undefined,
    // Filter sensitive data before sending
    beforeSend(event, hint) {
      // Filter out sensitive data from request
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['Authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['Cookie'];
          delete event.request.headers['x-api-key'];
          delete event.request.headers['X-API-Key'];
        }
        
        // Remove sensitive cookies
        if (event.request.cookies) {
          delete event.request.cookies;
        }
        
        // Remove sensitive query params
        if (event.request.query_string) {
          const params = new URLSearchParams(event.request.query_string);
          params.delete('token');
          params.delete('password');
          params.delete('apiKey');
          params.delete('secret');
          event.request.query_string = params.toString();
        }
        
        // Remove sensitive data from URL
        if (event.request.url) {
          event.request.url = event.request.url.replace(
            /(token|password|apiKey|secret)=[^&]*/gi,
            '$1=***'
          );
        }
      }
      
      // Filter sensitive data from extra context
      if (event.extra) {
        delete event.extra.password;
        delete event.extra.token;
        delete event.extra.apiKey;
        delete event.extra.secret;
      }
      
      return event;
    },
    // Ignore common non-critical errors
    ignoreErrors: [
      // Network errors
      'Network request failed',
      'NetworkError',
      'Failed to fetch',
      // Browser extension errors
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
      // Common client-side errors
      'ChunkLoadError',
      'Loading chunk',
      // Rate limiting (handled gracefully)
      'Too many requests',
      'Rate limit exceeded',
    ],
  });

  // Use console.log here since logger might not be initialized yet
  console.log('✅ Sentry initialized for error tracking');
}

/**
 * Capture exception manually with context
 * @param error - The error to capture
 * @param context - Additional context (tags, user, extra data)
 * @example
 * ```ts
 * captureException(error, {
 *   tags: { endpoint: '/api/search' },
 *   user: { id: req.user?.id },
 *   extra: { query: req.query }
 * });
 * ```
 */
export function captureException(
  error: Error,
  context?: {
    tags?: Record<string, string>;
    user?: { id: string; email?: string; username?: string };
    extra?: Record<string, any>;
    level?: Sentry.SeverityLevel;
  }
) {
  Sentry.withScope((scope) => {
    // Set tags
    if (context?.tags) {
      Object.entries(context.tags).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
    }
    
    // Set user context
    if (context?.user) {
      scope.setUser(context.user);
    }
    
    // Set extra context
    if (context?.extra) {
      // Filter sensitive data from extra
      const filteredExtra = { ...context.extra };
      delete filteredExtra.password;
      delete filteredExtra.token;
      delete filteredExtra.apiKey;
      delete filteredExtra.secret;
      
      Object.entries(filteredExtra).forEach(([key, value]) => {
        scope.setExtra(key, value);
      });
    }
    
    // Set severity level
    if (context?.level) {
      scope.setLevel(context.level);
    }
    
    Sentry.captureException(error);
  });
}

/**
 * Capture message manually
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(breadcrumb: Sentry.Breadcrumb) {
  Sentry.addBreadcrumb(breadcrumb);
}

/**
 * Set user context
 */
export function setUser(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });
}

/**
 * Clear user context
 */
export function clearUser() {
  Sentry.setUser(null);
}

