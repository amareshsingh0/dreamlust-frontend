/**
 * VAPID Key Management
 * Generates and manages VAPID keys for web push notifications
 */

import { env } from '../../config/env';
import webpush from 'web-push';

/**
 * Initialize VAPID keys
 */
export function initializeVAPID() {
  const publicKey = env.VAPID_PUBLIC_KEY;
  const privateKey = env.VAPID_PRIVATE_KEY;
  const subject = env.VAPID_SUBJECT || env.FRONTEND_URL;

  if (!publicKey || !privateKey) {
    console.warn('⚠️  VAPID keys not configured. Push notifications will be disabled.');
    return null;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    console.log('✅ VAPID keys initialized');
    return { publicKey, privateKey };
  } catch (error) {
    console.error('❌ Failed to set VAPID details:', error);
    return null;
  }
}

/**
 * Get VAPID public key (for frontend)
 */
export function getVAPIDPublicKey(): string | null {
  return env.VAPID_PUBLIC_KEY || null;
}

