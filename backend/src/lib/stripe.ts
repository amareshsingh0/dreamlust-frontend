/**
 * Stripe Payment Integration
 * Handles Stripe payment processing for subscriptions, tips, and purchases
 */

import Stripe from 'stripe';
import { env } from '../config/env';

if (!env.STRIPE_SECRET_KEY) {
  console.warn('⚠️  Stripe secret key not configured. Stripe features will be disabled.');
}

export const stripe = env.STRIPE_SECRET_KEY
  ? new Stripe(env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-12-18.acacia',
    })
  : null;

/**
 * Create a payment intent for one-time payments (tips, purchases)
 */
export async function createPaymentIntent(
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    metadata: metadata || {},
    automatic_payment_methods: {
      enabled: true,
    },
  });
}

/**
 * Create a subscription for recurring payments
 */
export async function createSubscription(
  customerId: string,
  priceId: string,
  metadata?: Record<string, string>
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: priceId }],
    metadata: metadata || {},
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
  });
}

/**
 * Create or retrieve a Stripe customer
 */
export async function getOrCreateCustomer(
  userId: string,
  email: string,
  name?: string
): Promise<Stripe.Customer> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  // Search for existing customer by metadata
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0];
  }

  // Create new customer
  return await stripe.customers.create({
    email,
    name,
    metadata: {
      userId,
    },
  });
}

/**
 * Create a connected account for creators (for payouts)
 */
export async function createConnectedAccount(
  creatorId: string,
  email: string,
  country: string = 'US'
): Promise<Stripe.Account> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.accounts.create({
    type: 'express',
    country,
    email,
    metadata: {
      creatorId,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
  });
}

/**
 * Create account link for onboarding
 */
export async function createAccountLink(
  accountId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<Stripe.AccountLink> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });
}

/**
 * Transfer funds to a connected account (creator payout)
 */
export async function transferToConnectedAccount(
  accountId: string,
  amount: number,
  currency: string = 'usd',
  metadata?: Record<string, string>
): Promise<Stripe.Transfer> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.transfers.create({
    amount: Math.round(amount * 100), // Convert to cents
    currency: currency.toLowerCase(),
    destination: accountId,
    metadata: metadata || {},
  });
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  cancelAtPeriodEnd: boolean = false
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  if (cancelAtPeriodEnd) {
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  } else {
    return await stripe.subscriptions.cancel(subscriptionId);
  }
}

/**
 * Retrieve a subscription
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Retrieve a payment intent
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Refund a payment
 */
export async function refundPayment(
  paymentIntentId: string,
  amount?: number
): Promise<Stripe.Refund> {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
  };

  if (amount) {
    refundParams.amount = Math.round(amount * 100); // Convert to cents
  }

  return await stripe.refunds.create(refundParams);
}

/**
 * Verify webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string,
  secret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  return stripe.webhooks.constructEvent(payload, signature, secret);
}
