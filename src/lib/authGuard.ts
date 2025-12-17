/**
 * Authentication Guard Utility
 *
 * Provides centralized authentication checks for protected actions
 * Redirects unauthenticated users to login with proper error messages
 */

import { authStorage } from './storage';
import { toast } from 'sonner';

export interface AuthGuardOptions {
  action: string;
  redirectPath?: string;
  onUnauthorized?: () => void;
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return authStorage.hasTokens();
}

/**
 * Require authentication for an action
 * Shows toast and returns false if not authenticated
 */
export function requireAuth(options: AuthGuardOptions): boolean {
  const { action, onUnauthorized } = options;

  if (!isAuthenticated()) {
    toast.error(`Please sign in to ${action}`, {
      description: 'You need to be logged in to perform this action',
      action: {
        label: 'Sign In',
        onClick: () => {
          if (onUnauthorized) {
            onUnauthorized();
          } else {
            window.location.href = '/auth';
          }
        },
      },
    });
    return false;
  }

  return true;
}

/**
 * Get current user ID from storage
 */
export function getCurrentUserId(): string | null {
  const token = authStorage.getAccessToken();
  if (!token) return null;

  try {
    // Decode JWT to get user ID (basic implementation)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.sub || null;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
}

/**
 * Auth guard for like/dislike actions
 */
export function requireAuthForLike(navigate?: (path: string) => void): boolean {
  return requireAuth({
    action: 'like content',
    onUnauthorized: navigate ? () => navigate('/auth') : undefined,
  });
}

/**
 * Auth guard for comment actions
 */
export function requireAuthForComment(navigate?: (path: string) => void): boolean {
  return requireAuth({
    action: 'post a comment',
    onUnauthorized: navigate ? () => navigate('/auth') : undefined,
  });
}

/**
 * Auth guard for report actions
 */
export function requireAuthForReport(navigate?: (path: string) => void): boolean {
  return requireAuth({
    action: 'report content',
    onUnauthorized: navigate ? () => navigate('/auth') : undefined,
  });
}

/**
 * Auth guard for tip/payment actions
 */
export function requireAuthForPayment(navigate?: (path: string) => void): boolean {
  return requireAuth({
    action: 'send a tip',
    onUnauthorized: navigate ? () => navigate('/auth') : undefined,
  });
}

/**
 * Auth guard for upload actions
 */
export function requireAuthForUpload(navigate?: (path: string) => void): boolean {
  return requireAuth({
    action: 'upload content',
    onUnauthorized: navigate ? () => navigate('/auth') : undefined,
  });
}
