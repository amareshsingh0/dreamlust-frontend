# Winston Logger Guide

Structured logging with Winston for the Dreamlust backend.

## 📋 Overview

Winston provides structured, JSON-formatted logs with multiple transports:
- **File Transport**: Logs to files (`logs/error.log`, `logs/combined.log`)
- **Console Transport**: Pretty-printed logs in development
- **Exception/Rejection Handlers**: Automatic logging of unhandled errors

## 🚀 Usage

### Basic Logging

```typescript
import logger from '@/lib/logger';

// Info log
logger.info('User logged in', { userId: user.id });

// Warning log
logger.warn('Rate limit approaching', { userId: user.id, requests: 95 });

// Error log
logger.error('Payment failed', { 
  error: error.message,
  userId: user.id,
  amount: 100.00,
});

// Debug log (only in development)
logger.debug('Database query', { query: 'SELECT * FROM users' });
```

### Logging in API Routes

```typescript
import logger from '@/lib/logger';

router.post('/api/payment', async (req, res) => {
  try {
    logger.info('Processing payment', {
      userId: req.user?.id,
      amount: req.body.amount,
    });

    const result = await processPayment(req.body);

    logger.info('Payment successful', {
      transactionId: result.id,
      amount: result.amount,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Payment failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: req.user?.id,
    });

    res.status(500).json({ error: 'Payment failed' });
  }
});
```

### Logging with Context

```typescript
// Create child logger with context
const contextLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456',
});

contextLogger.info('Processing request');
// All logs will include requestId and userId
```

## 📊 Log Levels

- **error**: Error events that might still allow the app to continue
- **warn**: Warning messages
- **info**: Informational messages (default in production)
- **debug**: Debug messages (only in development)

## 📁 Log Files

Logs are written to the `logs/` directory:

- `error.log` - Only error-level logs
- `combined.log` - All log levels
- `exceptions.log` - Uncaught exceptions
- `rejections.log` - Unhandled promise rejections

## ⚙️ Configuration

### Environment Variables

```env
LOG_LEVEL=info  # error, warn, info, debug
```

### Log Rotation

Logs are automatically rotated:
- Max file size: 5MB
- Max files: 5
- Old files are automatically deleted

## 🔍 Viewing Logs

### Development

Logs are printed to console with colors and formatting.

### Production

Logs are written to files in JSON format:

```bash
# View error logs
tail -f logs/error.log

# View all logs
tail -f logs/combined.log

# Search logs
grep "payment" logs/combined.log

# View logs with jq (pretty JSON)
tail -f logs/combined.log | jq
```

## 📝 Best Practices

### 1. Include Context

```typescript
// ✅ Good
logger.error('Payment failed', {
  userId: user.id,
  amount: 100,
  error: error.message,
});

// ❌ Bad
logger.error('Payment failed');
```

### 2. Use Appropriate Log Levels

```typescript
// ✅ Good
logger.debug('Database query', { query });
logger.info('User registered', { userId });
logger.warn('Rate limit approaching', { requests: 95 });
logger.error('Payment failed', { error });

// ❌ Bad
logger.info('Debug query', { query }); // Should be debug
logger.error('User registered', { userId }); // Should be info
```

### 3. Don't Log Sensitive Data

```typescript
// ✅ Good
logger.info('User logged in', {
  userId: user.id,
  email: user.email, // OK - not sensitive
});

// ❌ Bad
logger.info('User logged in', {
  password: user.password, // NEVER log passwords
  token: user.token, // NEVER log tokens
  apiKey: user.apiKey, // NEVER log API keys
});
```

### 4. Use Structured Logging

```typescript
// ✅ Good - structured
logger.info('Payment processed', {
  transactionId: 'txn-123',
  amount: 100,
  currency: 'USD',
});

// ❌ Bad - string interpolation
logger.info(`Payment processed: txn-123, amount: 100, currency: USD`);
```

## 🔗 Integration

### Request Logging

The `requestLogger` middleware automatically logs all HTTP requests:

```typescript
import { requestLogger } from '@/middleware/requestLogger';

app.use(requestLogger);
```

### Error Logging

The error handler automatically logs errors:

```typescript
// Errors are automatically logged in errorHandler middleware
```

## 📚 Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)


