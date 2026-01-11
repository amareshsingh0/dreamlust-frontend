/**
 * Datadog RUM (Real User Monitoring) Configuration
 * Application Performance Monitoring for frontend
 */

import { datadogRum } from '@datadog/browser-rum';
import { datadogLogs } from '@datadog/browser-logs';

const DATADOG_APP_ID = import.meta.env.VITE_DATADOG_APP_ID;
const DATADOG_CLIENT_TOKEN = import.meta.env.VITE_DATADOG_CLIENT_TOKEN;
const DATADOG_SITE = import.meta.env.VITE_DATADOG_SITE || 'datadoghq.com';
const DATADOG_ENV = import.meta.env.VITE_DATADOG_ENV || import.meta.env.MODE;
const DATADOG_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';

export function initDatadogRUM() {
  if (!DATADOG_APP_ID || !DATADOG_CLIENT_TOKEN) {
    console.warn('⚠️  Datadog RUM not configured. APM disabled.');
    return;
  }

  datadogRum.init({
    applicationId: DATADOG_APP_ID,
    clientToken: DATADOG_CLIENT_TOKEN,
    site: DATADOG_SITE,
    service: 'passionfantasia-frontend',
    env: DATADOG_ENV,
    version: DATADOG_VERSION,
    sessionSampleRate: 100, // 100% of sessions
    sessionReplaySampleRate: 20, // 20% of sessions for replay
    trackUserInteractions: true,
    trackResources: true,
    trackLongTasks: true,
    defaultPrivacyLevel: 'mask-user-input', // Mask sensitive input fields
    beforeSend: (event) => {
      // Filter sensitive data
      if (event.view?.url) {
        // Remove sensitive query params
        const url = new URL(event.view.url);
        url.searchParams.delete('token');
        url.searchParams.delete('password');
        url.searchParams.delete('apiKey');
        event.view.url = url.toString();
      }
      return true; // Return true to send the event, false to discard
    },
  });

  console.log('✅ Datadog RUM initialized');
}

export function initDatadogLogs() {
  if (!DATADOG_CLIENT_TOKEN) {
    console.warn('⚠️  Datadog Logs not configured. Logging disabled.');
    return;
  }

  datadogLogs.init({
    clientToken: DATADOG_CLIENT_TOKEN,
    site: DATADOG_SITE,
    service: 'passionfantasia-frontend',
    env: DATADOG_ENV,
    version: DATADOG_VERSION,
    forwardErrorsToLogs: true,
  });

  console.log('✅ Datadog Logs initialized');
}

/**
 * Set user context for Datadog
 */
export function setDatadogUser(user: { id: string; email?: string; username?: string }) {
  datadogRum.setUser({
    id: user.id,
    email: user.email,
    name: user.username,
  });
}

/**
 * Clear user context
 */
export function clearDatadogUser() {
  datadogRum.clearUser();
}

/**
 * Track custom actions
 */
export function trackAction(name: string, context?: Record<string, any>) {
  datadogRum.addAction(name, context);
}

/**
 * Track video play event
 */
export function trackVideoPlay(contentId: string, quality?: string) {
  datadogRum.addAction('video_play', {
    content_id: contentId,
    quality: quality || 'auto',
  });
}

/**
 * Track video pause event
 */
export function trackVideoPause(contentId: string, currentTime: number) {
  datadogRum.addAction('video_pause', {
    content_id: contentId,
    current_time: currentTime,
  });
}

/**
 * Track video completion
 */
export function trackVideoComplete(contentId: string, duration: number) {
  datadogRum.addAction('video_complete', {
    content_id: contentId,
    duration,
  });
}

/**
 * Track search event
 */
export function trackSearch(query: string, resultsCount: number) {
  datadogRum.addAction('search', {
    query,
    results_count: resultsCount,
  });
}

/**
 * Track content upload
 */
export function trackContentUpload(contentId: string, type: string, size: number) {
  datadogRum.addAction('content_upload', {
    content_id: contentId,
    type,
    size,
  });
}

/**
 * Track payment event
 */
export function trackPayment(transactionId: string, amount: number, currency: string) {
  datadogRum.addAction('payment', {
    transaction_id: transactionId,
    amount,
    currency,
  });
}

/**
 * Track subscription event
 */
export function trackSubscription(userId: string, planId: string, amount: number) {
  datadogRum.addAction('subscription', {
    user_id: userId,
    plan_id: planId,
    amount,
  });
}

/**
 * Add custom error
 */
export function addError(error: Error, context?: Record<string, any>) {
  datadogRum.addError(error, context);
}

/**
 * Set global context
 */
export function setGlobalContext(context: Record<string, any>) {
  datadogRum.setGlobalContext(context);
}

/**
 * Get session replay link
 */
export function getSessionReplayLink(): string | undefined {
  return datadogRum.getSessionReplayLink();
}


