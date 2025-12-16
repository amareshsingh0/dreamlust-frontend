import { prisma } from '../prisma';
import { Request } from 'express';
import { UAParser } from 'ua-parser-js';

export interface AnalyticsEventData {
  eventType: string;
  eventData?: any;
  userId?: string;
  sessionId?: string;
}

// Parse user agent to extract device, browser, and OS info
export function parseUserAgent(userAgent: string): {
  device: string;
  browser: string;
  os: string;
} {
  const parser = new UAParser(userAgent);
  const device = parser.getDevice().type || 'desktop';
  const browser = parser.getBrowser().name || 'unknown';
  const os = parser.getOS().name || 'unknown';

  return {
    device: device === 'mobile' ? 'mobile' : device === 'tablet' ? 'tablet' : 'desktop',
    browser: browser || 'unknown',
    os: os || 'unknown',
  };
}

// Get client IP address
export function getClientIp(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
    (req.headers['x-real-ip'] as string) ||
    req.ip ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

// Track an analytics event
export async function trackEvent(
  req: Request,
  eventType: string,
  eventData?: any,
  userId?: string
): Promise<void> {
  try {
    const userAgent = req.get('user-agent') || 'unknown';
    const { device, browser, os } = parseUserAgent(userAgent);
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'] || `session_${Date.now()}`;
    const referrer = req.get('referer') || req.headers['referer'] || null;

    // Get location from headers (if using a service like Cloudflare)
    const country = (req.headers['cf-ipcountry'] as string) || null;
    const city = (req.headers['cf-ipcity'] as string) || null;

    await prisma.analyticsEvent.create({
      data: {
        userId: userId || null,
        sessionId,
        eventType,
        eventData: eventData || {},
        device,
        browser,
        os,
        country,
        city,
        referrer,
      },
    });
  } catch (error) {
    // Don't throw - analytics should never break the app
    console.error('Failed to track analytics event:', error);
  }
}

// Generate or get session ID
export function getOrCreateSessionId(req: Request, res: any): string {
  let sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Set cookie for session tracking
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: 'lax',
    });
  }

  return sessionId;
}

// Common event types
export const EventTypes = {
  PAGE_VIEW: 'page_view',
  VIDEO_PLAY: 'video_play',
  VIDEO_PAUSE: 'video_pause',
  VIDEO_COMPLETE: 'video_complete',
  SEARCH: 'search',
  CLICK: 'click',
  PURCHASE: 'purchase',
  SUBSCRIPTION: 'subscription',
  SIGNUP: 'signup',
  LOGIN: 'login',
  LOGOUT: 'logout',
  CONTENT_LIKE: 'content_like',
  CONTENT_SHARE: 'content_share',
  COMMENT: 'comment',
  FOLLOW: 'follow',
  // Funnel event types
  VISIT_HOMEPAGE: 'visit_homepage',
  CLICK_SIGNUP: 'click_signup',
  FILL_EMAIL: 'fill_email',
  VERIFY_EMAIL: 'verify_email',
  COMPLETE_PROFILE: 'complete_profile',
  SEARCH_CONTENT: 'search_content',
  CLICK_RESULT: 'click_result',
  START_PLAYBACK: 'start_playback',
  WATCH_25: 'watch_25%',
  WATCH_50: 'watch_50%',
  WATCH_75: 'watch_75%',
  WATCH_COMPLETE: 'watch_complete',
  VISIT_CREATOR_PAGE: 'visit_creator_page',
  CLICK_FOLLOW: 'click_follow',
  WATCH_3_VIDEOS: 'watch_3_videos',
  ENABLE_NOTIFICATIONS: 'enable_notifications',
  SEND_TIP: 'send_tip',
  VIEW_PRICING: 'view_pricing',
  CLICK_SUBSCRIBE: 'click_subscribe',
  SELECT_PLAN: 'select_plan',
  ENTER_PAYMENT: 'enter_payment',
  COMPLETE_PAYMENT: 'complete_payment',
  CLICK_UPLOAD: 'click_upload',
  SELECT_FILE: 'select_file',
  UPLOAD_PROGRESS: 'upload_progress',
  ADD_METADATA: 'add_metadata',
  PUBLISH_CONTENT: 'publish_content',
} as const;

