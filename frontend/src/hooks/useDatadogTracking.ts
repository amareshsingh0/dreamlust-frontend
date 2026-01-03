/**
 * React Hook for Datadog Tracking
 * Provides easy-to-use hooks for tracking user actions
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  trackAction,
  trackVideoPlay,
  trackVideoPause,
  trackVideoComplete,
  trackSearch,
  trackContentUpload,
  trackPayment,
  trackSubscription,
  addError,
} from '@/lib/monitoring/datadog';

/**
 * Track page views automatically
 */
export function usePageView() {
  const location = useLocation();

  useEffect(() => {
    trackAction('page_view', {
      path: location.pathname,
      search: location.search,
    });
  }, [location]);
}

/**
 * Track video interactions
 */
export function useVideoTracking(contentId: string) {
  const trackPlay = (quality?: string) => {
    trackVideoPlay(contentId, quality);
  };

  const trackPause = (currentTime: number) => {
    trackVideoPause(contentId, currentTime);
  };

  const trackComplete = (duration: number) => {
    trackVideoComplete(contentId, duration);
  };

  return {
    trackPlay,
    trackPause,
    trackComplete,
  };
}

/**
 * Track search queries
 */
export function useSearchTracking() {
  const trackSearchQuery = (query: string, resultsCount: number) => {
    trackSearch(query, resultsCount);
  };

  return { trackSearchQuery };
}

/**
 * Track content uploads
 */
export function useContentUploadTracking() {
  const trackUpload = (contentId: string, type: string, size: number) => {
    trackContentUpload(contentId, type, size);
  };

  return { trackUpload };
}

/**
 * Track payments
 */
export function usePaymentTracking() {
  const trackPaymentEvent = (transactionId: string, amount: number, currency: string = 'INR') => {
    trackPayment(transactionId, amount, currency);
  };

  return { trackPaymentEvent };
}

/**
 * Track subscriptions
 */
export function useSubscriptionTracking() {
  const trackSubscriptionEvent = (userId: string, planId: string, amount: number) => {
    trackSubscription(userId, planId, amount);
  };

  return { trackSubscriptionEvent };
}

/**
 * Track errors
 */
export function useErrorTracking() {
  const trackError = (error: Error, context?: Record<string, any>) => {
    addError(error, context);
  };

  return { trackError };
}


