/**
 * Razorpay Service
 * Handles Razorpay subscription pause/resume operations
 */

import Razorpay from 'razorpay';

let razorpayInstance: Razorpay | null = null;

/**
 * Initialize Razorpay
 */
export function initializeRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    console.warn('Razorpay not configured. RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET required.');
    return;
  }

  razorpayInstance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  console.log('Razorpay initialized');
}

/**
 * Pause Razorpay subscription
 */
export async function pauseRazorpaySubscription(subscriptionId: string): Promise<boolean> {
  if (!razorpayInstance) {
    throw new Error('Razorpay not initialized');
  }

  try {
    // Razorpay pause subscription
    await razorpayInstance.subscriptions.pause(subscriptionId, {
      pause_at: 'now',
    });

    return true;
  } catch (error: any) {
    console.error('Failed to pause Razorpay subscription:', error);
    throw new Error(`Failed to pause subscription: ${error.message}`);
  }
}

/**
 * Resume Razorpay subscription
 */
export async function resumeRazorpaySubscription(subscriptionId: string): Promise<boolean> {
  if (!razorpayInstance) {
    throw new Error('Razorpay not initialized');
  }

  try {
    // Razorpay resume subscription
    await razorpayInstance.subscriptions.resume(subscriptionId, {
      resume_at: 'now',
    });

    return true;
  } catch (error: any) {
    console.error('Failed to resume Razorpay subscription:', error);
    throw new Error(`Failed to resume subscription: ${error.message}`);
  }
}

/**
 * Get Razorpay subscription status
 */
export async function getRazorpaySubscriptionStatus(subscriptionId: string): Promise<any> {
  if (!razorpayInstance) {
    throw new Error('Razorpay not initialized');
  }

  try {
    const subscription = await razorpayInstance.subscriptions.fetch(subscriptionId);
    return subscription;
  } catch (error: any) {
    console.error('Failed to fetch Razorpay subscription:', error);
    throw new Error(`Failed to fetch subscription: ${error.message}`);
  }
}


