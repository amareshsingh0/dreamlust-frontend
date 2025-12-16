# Logging Guide

This guide covers structured logging with Winston for the Dreamlust platform.

## 📋 Overview

Winston provides structured, JSON-formatted logs with:
- **File Transport**: Persistent logs in `logs/` directory
- **Console Transport**: Pretty-printed logs in development
- **Automatic Log Rotation**: 5MB max file size, 5 files max
- **Exception Handling**: Automatic logging of unhandled errors

## 🚀 Quick Start

### Basic Usage

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

## 📊 Log Levels

- **error**: Error events that might still allow the app to continue
- **warn**: Warning messages
- **info**: Informational messages (default in production)
- **debug**: Debug messages (only in development)

## 📁 Log Files

Logs are written to the `backend/logs/` directory:

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
tail -f backend/logs/error.log

# View all logs
tail -f backend/logs/combined.log

# Search logs
grep "payment" backend/logs/combined.log

# View logs with jq (pretty JSON)
tail -f backend/logs/combined.log | jq
```

## 📝 Usage Examples

### In API Routes

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

### With Context

```typescript
// Create child logger with context
const contextLogger = logger.child({
  requestId: 'req-123',
  userId: 'user-456',
});

contextLogger.info('Processing request');
// All logs will include requestId and userId
```

## 🔒 Security Best Practices

### Don't Log Sensitive Data

```typescript
// ✅ Good
logger.info('User logged in', {
  userId: user.id,
  email: user.email,
});

// ❌ Bad
logger.info('User logged in', {
  password: user.password, // NEVER log passwords
  token: user.token, // NEVER log tokens
  apiKey: user.apiKey, // NEVER log API keys
});
```

### Use Appropriate Log Levels

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

## 🔗 Integration

### Automatic Request Logging

The `requestLogger` middleware automatically logs all HTTP requests:

```typescript
import { requestLogger } from '@/middleware/requestLogger';

app.use(requestLogger);
```

This logs:
- Request method and path
- Response status code
- Request duration
- User ID (if authenticated)
- IP address

### Automatic Error Logging

The error handler automatically logs all errors with full context.

## 📚 Additional Resources

- [Winston Documentation](https://github.com/winstonjs/winston)
- [Logging Best Practices](https://www.loggly.com/ultimate-guide/node-logging-basics/)
- See `backend/src/lib/logger/README.md` for detailed documentation
- See `backend/src/lib/logger/examples.ts` for usage examples


