/**
 * Push Notification Utilities
 * Handles web push notification subscription and management
 */

import { api } from '../api';

let vapidPublicKey: string | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;

/**
 * Get VAPID public key from backend
 */
async function getVAPIDPublicKey(): Promise<string | null> {
  if (vapidPublicKey) {
    return vapidPublicKey;
  }

  try {
    const response = await api.push.getVAPIDKey();
    if (response.success && response.data) {
      const data = response.data as { publicKey: string };
      vapidPublicKey = data.publicKey;
      return vapidPublicKey;
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Failed to get VAPID public key:', error);
    }
  }

  return null;
}

/**
 * Register service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    serviceWorkerRegistration = registration;
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Notifications are not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    console.warn('Notification permission denied');
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(): Promise<boolean> {
  try {
    // Check browser support
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Push notifications are not supported');
      return false;
    }

    // Register service worker if not already registered
    let registration = serviceWorkerRegistration;
    if (!registration) {
      registration = await registerServiceWorker();
      if (!registration) {
        return false;
      }
    }

    // Request permission
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      return false;
    }

    // Get VAPID public key
    const publicKey = await getVAPIDPublicKey();
    if (!publicKey) {
      if (import.meta.env.DEV) {
        console.error('VAPID public key not available');
      }
      return false;
    }

    // Convert VAPID key to Uint8Array
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });

    // Get device info
    const userAgent = navigator.userAgent;
    const device = getDeviceInfo();

    // Save subscription to backend
    const response = await api.push.subscribe({
      endpoint: subscription.endpoint,
      keys: {
        p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
        auth: arrayBufferToBase64(subscription.getKey('auth')!),
      },
      userAgent,
      device,
    });

    if (response.success) {
      console.log('Push subscription saved');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to subscribe to push notifications:', error);
    return false;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(endpoint: string): Promise<boolean> {
  try {
    const response = await api.push.unsubscribe({ endpoint });
    return response.success;
  } catch (error) {
    console.error('Failed to unsubscribe from push notifications:', error);
    return false;
  }
}

/**
 * Get user's push subscriptions
 */
export async function getPushSubscriptions() {
  try {
    const response = await api.push.getSubscriptions();
    if (response.success && response.data) {
      const data = response.data as { subscriptions: any[] };
      return data.subscriptions;
    }
    return [];
  } catch (error) {
    console.error('Failed to get push subscriptions:', error);
    return [];
  }
}

/**
 * Check if push notifications are supported
 */
export function isPushNotificationSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Check if user has granted notification permission
 */
export function hasNotificationPermission(): boolean {
  return Notification.permission === 'granted';
}

/**
 * Convert VAPID key from URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Convert ArrayBuffer to base64
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Get device information
 */
function getDeviceInfo(): string {
  const ua = navigator.userAgent;
  if (/Mobile|Android|iPhone|iPad/.test(ua)) {
    return 'mobile';
  }
  if (/Tablet|iPad/.test(ua)) {
    return 'tablet';
  }
  return 'desktop';
}

