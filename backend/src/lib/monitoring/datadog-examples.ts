/**
 * Datadog APM Usage Examples
 * 
 * This file demonstrates how to use Datadog APM in backend routes and services.
 * Copy these patterns to your actual route and service files.
 */

import { addTags, trackMetric, trackEvent } from './datadog';
import logger from '../logger';

// Example 1: Add tags to current span
export async function exampleWithTags(req: any, res: any) {
  // Add custom tags to the current request span
  addTags({
    operation: 'process_payment',
    user_id: req.user?.id,
    payment_method: req.body.method,
  });

  try {
    // Your payment processing code
    const result = await processPayment(req.body);

    // Track custom metric
    trackMetric('payment.amount', result.amount, {
      currency: result.currency,
      method: req.body.method,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Payment failed', { error });
    throw error;
  }
}

// Example 2: Track custom events
export async function exampleTrackEvent() {
  trackEvent('User Registered', 'New user signed up', {
    user_id: 'user-123',
    plan: 'free',
  });
}

// Example 3: Track metrics for monitoring
export async function exampleTrackMetrics() {
  // Track API response time
  const startTime = Date.now();
  await processRequest();
  const duration = Date.now() - startTime;

  trackMetric('api.response_time', duration, {
    endpoint: '/api/payment',
    method: 'POST',
  });

  // Track business metrics
  trackMetric('subscription.created', 1, {
    plan: 'premium',
    currency: 'USD',
  });
}

// Example 4: Database query tracking
export async function exampleDatabaseTracking() {
  addTags({ operation: 'database_query', table: 'users' });

  const startTime = Date.now();
  const users = await db.query('SELECT * FROM users WHERE active = true');
  const duration = Date.now() - startTime;

  trackMetric('database.query.duration', duration, {
    table: 'users',
    operation: 'SELECT',
  });

  return users;
}

// Example 5: External API call tracking
export async function exampleExternalApiTracking() {
  addTags({ operation: 'external_api_call', service: 'payment_gateway' });

  const startTime = Date.now();
  try {
    const response = await fetch('https://api.payment.com/charge', {
      method: 'POST',
      body: JSON.stringify({ amount: 100 }),
    });

    const duration = Date.now() - startTime;
    trackMetric('external_api.duration', duration, {
      service: 'payment_gateway',
      status: response.status.toString(),
    });

    return response;
  } catch (error) {
    trackMetric('external_api.error', 1, {
      service: 'payment_gateway',
    });
    throw error;
  }
}

// Mock functions
async function processPayment(data: any) {
  return { id: 'txn-123', amount: data.amount, currency: 'USD' };
}

async function processRequest() {
  return new Promise((resolve) => setTimeout(resolve, 100));
}

const db = {
  query: async (query: string) => {
    return [{ id: 1, name: 'User' }];
  },
};


