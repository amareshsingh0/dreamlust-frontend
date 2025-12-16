/**
 * Winston Logger Usage Examples
 * 
 * This file demonstrates how to use the logger throughout the application.
 * Copy these patterns to your actual route and service files.
 */

import logger from '../logger';

// Example 1: Basic logging
logger.info('User logged in', { userId: 'user-123' });
logger.warn('Rate limit approaching', { userId: 'user-123', requests: 95 });
logger.error('Payment failed', { 
  error: new Error('Insufficient funds'),
  userId: 'user-123',
  amount: 100.00,
});

// Example 2: Logging in API routes
export async function exampleRouteHandler(req: any, res: any) {
  try {
    logger.info('Processing payment', {
      userId: req.user?.id,
      amount: req.body.amount,
      method: req.body.method,
    });

    // Process payment
    const result = await processPayment(req.body);

    logger.info('Payment processed successfully', {
      userId: req.user?.id,
      transactionId: result.id,
      amount: result.amount,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Payment processing failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
      amount: req.body.amount,
    });

    res.status(500).json({ error: 'Payment failed' });
  }
}

// Example 3: Logging with different levels
export function exampleLogLevels() {
  // Debug - detailed information for debugging
  logger.debug('Database query executed', {
    query: 'SELECT * FROM users',
    duration: '45ms',
    rows: 10,
  });

  // Info - general informational messages
  logger.info('User registered', {
    userId: 'user-123',
    email: 'user@example.com',
  });

  // Warn - warning messages
  logger.warn('High memory usage detected', {
    memoryUsage: '85%',
    threshold: '80%',
  });

  // Error - error messages
  logger.error('Database connection failed', {
    error: new Error('Connection timeout'),
    host: 'localhost',
    port: 5432,
  });
}

// Example 4: Logging with context
export function exampleWithContext() {
  // Add context to all subsequent logs
  const contextLogger = logger.child({
    requestId: 'req-123',
    userId: 'user-456',
  });

  contextLogger.info('Processing request');
  contextLogger.info('Fetching data');
  contextLogger.info('Request completed');
  // All logs will include requestId and userId
}

// Example 5: Logging database operations
export async function exampleDatabaseLogging() {
  const startTime = Date.now();
  
  try {
    logger.debug('Executing database query', {
      table: 'users',
      operation: 'SELECT',
    });

    const users = await db.query('SELECT * FROM users');

    const duration = Date.now() - startTime;
    logger.info('Database query completed', {
      table: 'users',
      duration: `${duration}ms`,
      rows: users.length,
    });

    return users;
  } catch (error) {
    logger.error('Database query failed', {
      table: 'users',
      error: error instanceof Error ? error.message : String(error),
      duration: `${Date.now() - startTime}ms`,
    });
    throw error;
  }
}

// Example 6: Logging external API calls
export async function exampleExternalApiLogging() {
  logger.info('Calling external API', {
    service: 'payment-gateway',
    endpoint: '/api/charge',
  });

  try {
    const response = await fetch('https://api.payment.com/charge', {
      method: 'POST',
      body: JSON.stringify({ amount: 100 }),
    });

    logger.info('External API call successful', {
      service: 'payment-gateway',
      statusCode: response.status,
      duration: '250ms',
    });

    return response;
  } catch (error) {
    logger.error('External API call failed', {
      service: 'payment-gateway',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// Example 7: Logging authentication events
export function exampleAuthLogging(userId: string, action: string) {
  logger.info('Authentication event', {
    userId,
    action, // 'login', 'logout', 'token_refresh', etc.
    timestamp: new Date().toISOString(),
    ip: '192.168.1.1', // Get from request
  });
}

// Example 8: Logging business events
export function exampleBusinessLogging() {
  logger.info('Content uploaded', {
    contentId: 'content-123',
    creatorId: 'creator-456',
    type: 'video',
    size: '150MB',
  });

  logger.info('Subscription created', {
    userId: 'user-123',
    planId: 'premium',
    amount: 9.99,
    currency: 'USD',
  });

  logger.info('Payment processed', {
    transactionId: 'txn-789',
    userId: 'user-123',
    amount: 9.99,
    status: 'completed',
  });
}

// Mock functions for examples
async function processPayment(data: any) {
  return { id: 'txn-123', amount: data.amount };
}

const db = {
  query: async (query: string) => {
    return [{ id: 1, name: 'User' }];
  },
};


