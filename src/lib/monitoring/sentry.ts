/**
 * Sentry Error Tracking Configuration (Frontend)
 * Initialize Sentry for client-side error tracking
 */

import * as Sentry from '@sentry/react';
import { browserTracingIntegration } from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
const SENTRY_ENVIRONMENT = import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE;
const SENTRY_TRACES_SAMPLE_RATE = parseFloat(
  import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '0.1'
);

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    integrations: [
      browserTracingIntegration(),
    ],
    // Set tracing origins at init level
    tracePropagationTargets: [
      'localhost',
      /^\//, // Same origin
      new RegExp(`^${import.meta.env.VITE_API_URL?.replace(/https?:\/\//, '') || ''}`),
    ],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE,
    // Release tracking
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    // Before send hook to filter sensitive data
    beforeSend(event, _hint) {
      // Filter out sensitive data
      if (event.request) {
        // Remove sensitive headers
        if (event.request.headers) {
          delete event.request.headers['Authorization'];
          delete event.request.headers['Cookie'];
        }
        // Remove sensitive query params
        if (event.request.query_string) {
          const params = new URLSearchParams(event.request.query_string);
          params.delete('token');
          params.delete('password');
          event.request.query_string = params.toString();
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry initialized for frontend error tracking');
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

/**
 * Capture exception manually
 */
export function captureException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

