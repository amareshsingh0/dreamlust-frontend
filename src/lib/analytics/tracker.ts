import { api } from '../api';

// Client-side analytics tracker
export class AnalyticsTracker {
  private _sessionId: string;
  private _userId: string | null = null;

  constructor() {
    // Get or create session ID
    this._sessionId = this.getOrCreateSessionId();

    // Try to get user ID from localStorage or auth context
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const user = JSON.parse(userData);
        this._userId = user.id || null;
      }
    } catch (error) {
      // Ignore errors
    }
  }

  private getOrCreateSessionId(): string {
    let sessionId = sessionStorage.getItem('analytics_session_id');
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      sessionStorage.setItem('analytics_session_id', sessionId);
    }
    
    return sessionId;
  }

  setUserId(userId: string | null) {
    this._userId = userId;
  }

  async track(eventType: string, eventData?: any): Promise<void> {
    try {
      await (api.analytics.track as any)({
        eventType,
        eventData: eventData || {},
        sessionId: this._sessionId,
        userId: this._userId,
      });
    } catch (error) {
      // Don't throw - analytics should never break the app
      console.error('Failed to track analytics event:', error);
    }
  }

  // Convenience methods for common events
  trackPageView(path: string, title?: string) {
    return this.track('page_view', { path, title });
  }

  trackVideoPlay(contentId: string, duration?: number) {
    return this.track('video_play', { contentId, duration });
  }

  trackVideoPause(contentId: string, currentTime: number) {
    return this.track('video_pause', { contentId, currentTime });
  }

  trackVideoComplete(contentId: string, duration: number) {
    return this.track('video_complete', { contentId, duration });
  }

  trackSearch(query: string, resultsCount?: number) {
    return this.track('search', { query, resultsCount });
  }

  trackClick(element: string, location?: string) {
    return this.track('click', { element, location });
  }

  trackPurchase(amount: number, items: any[]) {
    return this.track('purchase', { amount, items });
  }

  trackSubscription(planId: string, amount: number) {
    return this.track('subscription', { planId, amount });
  }

  trackSignup(method: string) {
    return this.track('signup', { method });
  }

  trackLogin(method: string) {
    return this.track('login', { method });
  }

  trackLogout() {
    return this.track('logout', {});
  }

  trackContentLike(contentId: string) {
    return this.track('content_like', { contentId });
  }

  trackContentShare(contentId: string, platform?: string) {
    return this.track('content_share', { contentId, platform });
  }

  trackComment(contentId: string, commentId: string) {
    return this.track('comment', { contentId, commentId });
  }

  trackFollow(creatorId: string) {
    return this.track('follow', { creatorId });
  }
}

// Singleton instance
export const analytics = new AnalyticsTracker();

