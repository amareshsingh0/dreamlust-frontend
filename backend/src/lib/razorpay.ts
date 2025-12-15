/**
 * Razorpay Payment Integration
 * Handles Razorpay payment processing for subscriptions, tips, and purchases
 */

import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';

if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
  console.warn('⚠️  Razorpay credentials not configured. Razorpay features will be disabled.');
}

export const razorpay = env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;

/**
 * Create a payment order for one-time payments (tips, purchases)
 */
export async function createPaymentOrder(
  amount: number,
  currency: string = 'INR',
  receipt?: string,
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const order = await razorpay.orders.create({
    amount: Math.round(amount * 100), // Convert to paise (smallest currency unit)
    currency: currency.toUpperCase(),
    receipt: receipt || `receipt_${Date.now()}`,
    notes: notes || {},
  });

  return order;
}

/**
 * Verify payment signature
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay key secret not configured');
  }

  const text = `${orderId}|${paymentId}`;
  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(text)
    .digest('hex');

  return generatedSignature === signature;
}

/**
 * Create a subscription
 */
export async function createSubscription(
  planId: string,
  customerNotify: number = 1,
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: customerNotify,
    notes: notes || {},
  });

  return subscription;
}

/**
 * Create a subscription with addons
 */
export async function createSubscriptionWithAddons(
  planId: string,
  customerId: string,
  startAt?: number,
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const subscription = await razorpay.subscriptions.create({
    plan_id: planId,
    customer_notify: 1,
    start_at: startAt,
    notes: notes || {},
  });

  return subscription;
}

/**
 * Get subscription details
 */
export async function getSubscription(subscriptionId: string): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.subscriptions.fetch(subscriptionId);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtCycleEnd: boolean = false
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  if (cancelAtCycleEnd) {
    return await razorpay.subscriptions.cancel(subscriptionId, {
      cancel_at_cycle_end: 1,
    });
  } else {
    return await razorpay.subscriptions.cancel(subscriptionId);
  }
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(subscriptionId: string): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.subscriptions.pause(subscriptionId, {
    pause_at: 'now',
  });
}

/**
 * Resume a subscription
 */
export async function resumeSubscription(subscriptionId: string): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.subscriptions.resume(subscriptionId, {
    resume_at: 'now',
  });
}

/**
 * Create a customer
 */
export async function createCustomer(
  name: string,
  email: string,
  contact?: string,
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.customers.create({
    name,
    email,
    contact: contact || '',
    notes: notes || {},
  });
}

/**
 * Get or create a customer
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string,
  contact?: string
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  try {
    // Try to find existing customer by email
    const customers = await razorpay.customers.all({
      email: email,
      count: 1,
    });

    if (customers.items && customers.items.length > 0) {
      return customers.items[0];
    }
  } catch (error) {
    // Customer not found, create new one
  }

  // Create new customer
  return await razorpay.customers.create({
    name: name || email,
    email,
    contact: contact || '',
    notes: {
      userId,
    },
  });
}

/**
 * Create a plan
 */
export async function createPlan(
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number,
  item: {
    name: string;
    amount: number;
    currency: string;
    description?: string;
  }
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.plans.create({
    period,
    interval,
    item,
  });
}

/**
 * Get payment details
 */
export async function getPayment(paymentId: string): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.payments.fetch(paymentId);
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentId: string,
  amount?: number,
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  const refundParams: any = {
    notes: notes || {},
  };

  if (amount) {
    refundParams.amount = Math.round(amount * 100); // Convert to paise
  }

  return await razorpay.payments.refund(paymentId, refundParams);
}

/**
 * Create a payout/transfer to a connected account
 * Note: Razorpay uses transfers for payouts to connected accounts
 */
export async function createPayout(
  amount: number,
  accountId: string,
  currency: string = 'INR',
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  // Razorpay transfers require a payment ID as source
  // For payouts, we typically use transfers API
  // Note: This requires the account to be a connected account (Razorpay Express)
  const transfer = await razorpay.transfers.create({
    amount: Math.round(amount * 100), // Convert to paise
    currency: currency.toUpperCase(),
    account: accountId,
    notes: notes || {},
  });

  return transfer;
}

/**
 * Create a payout using Razorpay's payout API (if available)
 * Alternative: Use direct bank transfer
 */
export async function createDirectPayout(
  amount: number,
  accountNumber: string,
  ifsc: string,
  beneficiaryName: string,
  currency: string = 'INR',
  notes?: Record<string, string>
): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  // For direct payouts, Razorpay requires fund account creation first
  // This is a simplified version - actual implementation may vary
  const fundAccount = await razorpay.fundAccounts.create({
    account_type: 'bank_account',
    bank_account: {
      name: beneficiaryName,
      account_number: accountNumber,
      ifsc: ifsc,
    },
  });

  // Create payout
  const payout = await razorpay.payouts.create({
    account_number: fundAccount.id,
    amount: Math.round(amount * 100), // Convert to paise
    currency: currency.toUpperCase(),
    mode: 'NEFT', // or 'IMPS', 'RTGS'
    purpose: 'payout',
    queue_if_low_balance: true,
    notes: notes || {},
  });

  return payout;
}

/**
 * Get payout details
 */
export async function getPayout(payoutId: string): Promise<any> {
  if (!razorpay) {
    throw new Error('Razorpay is not configured');
  }

  return await razorpay.payouts.fetch(payoutId);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error('Razorpay webhook secret not configured');
  }

  const generatedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');

  return generatedSignature === signature;
}
