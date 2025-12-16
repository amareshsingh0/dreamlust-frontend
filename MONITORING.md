# Monitoring & Observability Guide

This guide covers monitoring and error tracking setup for the Dreamlust platform.

## 🔍 Sentry Integration

Sentry is configured for both backend and frontend error tracking.

### Backend Configuration

**Location**: `backend/src/lib/monitoring/sentry.ts`

**Features:**
- Automatic error capture
- Request/response tracing
- User context tracking
- Sensitive data filtering
- Custom error filtering

**Initialization**: Sentry is automatically initialized in `server.ts` when `NODE_ENV=production` and `SENTRY_DSN` is set.

### Frontend Configuration

**Location**: `frontend/src/lib/monitoring/sentry.ts`

**Features:**
- Client-side error tracking
- Browser performance monitoring
- User session tracking
- Automatic breadcrumb collection

**Initialization**: Sentry is automatically initialized in `main.tsx` when in production mode.

## 📊 Usage Examples

### Basic Error Capture

```typescript
import { captureException } from '@/lib/monitoring/sentry';

try {
  // Your code
} catch (error) {
  if (error instanceof Error) {
    captureException(error, {
      tags: { endpoint: '/api/search' },
      user: { id: req.user?.id },
      extra: { query: req.query }
    });
  }
  res.status(500).json({ error: 'Internal server error' });
}
```

### Using Helper Functions

```typescript
import { captureEndpointError } from '@/lib/monitoring/sentry-helpers';

try {
  // Your code
} catch (error) {
  if (error instanceof Error) {
    captureEndpointError(error, req, { searchQuery: req.body.query });
  }
  throw error;
}
```

### Adding Breadcrumbs

```typescript
import { addApiBreadcrumb } from '@/lib/monitoring/sentry-helpers';

addApiBreadcrumb('Starting database query', { table: 'users' });
const result = await db.query('SELECT * FROM users');
```

### Setting User Context

```typescript
import { setUser, clearUser } from '@/lib/monitoring/sentry';

// Set user context
setUser({
  id: user.id,
  email: user.email,
  username: user.username,
});

// Clear user context (e.g., on logout)
clearUser();
```

## 🔒 Security Features

### Automatic Data Filtering

Sentry automatically filters sensitive data:

- **Headers**: `Authorization`, `Cookie`, `X-API-Key`
- **Query Params**: `token`, `password`, `apiKey`, `secret`
- **Request Body**: `password`, `token`, `apiKey`, `secret`
- **URLs**: Replaces sensitive values with `***`

### Ignored Errors

The following errors are automatically ignored:

- Network errors (handled gracefully)
- Browser extension errors
- Rate limiting errors (expected)
- Chunk load errors (client-side)

## 📈 Performance Monitoring

### Backend Tracing

Sentry automatically traces:
- HTTP requests
- Database queries (via Prisma)
- External API calls

**Sample Rate**: 10% (configurable via `SENTRY_TRACES_SAMPLE_RATE`)

### Frontend Tracing

Sentry automatically traces:
- Page loads
- API calls
- User interactions

**Sample Rate**: 10% (configurable via `VITE_SENTRY_TRACES_SAMPLE_RATE`)

## 🛠️ Configuration

### Environment Variables

**Backend:**
```env
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_RELEASE=v1.0.0
SENTRY_SERVER_NAME=api-server
```

**Frontend:**
```env
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
VITE_SENTRY_ENVIRONMENT=production
VITE_SENTRY_TRACES_SAMPLE_RATE=0.1
VITE_SENTRY_RELEASE=v1.0.0
```

### Custom Configuration

Edit `backend/src/lib/monitoring/sentry.ts` or `frontend/src/lib/monitoring/sentry.ts` to customize:

- Error filtering
- Breadcrumb collection
- Performance sampling
- Release tracking

## 📋 Best Practices

### 1. Don't Capture Expected Errors

```typescript
// ❌ Don't capture 404s
if (!item) {
  return res.status(404).json({ error: 'Not found' });
}

// ✅ Only capture unexpected errors
try {
  await processItem(item);
} catch (error) {
  if (error instanceof Error) {
    captureException(error);
  }
}
```

### 2. Add Context to Errors

```typescript
captureException(error, {
  tags: {
    endpoint: req.path,
    operation: 'userCreation',
  },
  extra: {
    userId: user.id,
    email: user.email,
  },
});
```

### 3. Use Breadcrumbs for Debugging

```typescript
addApiBreadcrumb('Fetching user data', { userId: user.id });
const userData = await fetchUserData(user.id);
addApiBreadcrumb('User data fetched', { dataSize: userData.length });
```

### 4. Set User Context Early

```typescript
// In authentication middleware
if (req.user) {
  setUser({
    id: req.user.id,
    email: req.user.email,
  });
}
```

## 🔍 Viewing Errors

1. **Go to Sentry Dashboard**: https://sentry.io
2. **Select your project**
3. **View Issues**: See all captured errors
4. **View Performance**: See performance traces
5. **View Releases**: Track deployments

## 📊 Metrics to Monitor

### Error Metrics
- Error rate by endpoint
- Error rate by user
- Error rate by release
- Error trends over time

### Performance Metrics
- Response time by endpoint
- Database query performance
- External API call performance
- Frontend page load times

### User Metrics
- Active users
- Error rate by user segment
- Performance by device/browser

## 🚨 Alerting

Configure alerts in Sentry dashboard for:

- **High Error Rate**: > 10 errors/minute
- **New Issues**: New error types
- **Performance Degradation**: P95 > 2s
- **Release Issues**: Errors in new releases

## 🔧 Troubleshooting

### Sentry Not Capturing Errors

1. **Check DSN**: Verify `SENTRY_DSN` is set correctly
2. **Check Environment**: Ensure `NODE_ENV=production`
3. **Check Logs**: Look for Sentry initialization messages
4. **Check Network**: Ensure outbound connections to Sentry are allowed

### Too Many Errors

1. **Adjust Sample Rate**: Reduce `SENTRY_TRACES_SAMPLE_RATE`
2. **Add to Ignore List**: Add common errors to `ignoreErrors`
3. **Filter in beforeSend**: Add custom filtering logic

### Missing Context

1. **Set User Context**: Ensure `setUser()` is called
2. **Add Breadcrumbs**: Use `addBreadcrumb()` for debugging
3. **Add Tags**: Use tags for filtering and grouping

## 📚 Additional Resources

- [Sentry Documentation](https://docs.sentry.io/)
- [Sentry Node.js Guide](https://docs.sentry.io/platforms/node/)
- [Sentry React Guide](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Error Tracking Best Practices](https://docs.sentry.io/product/best-practices/)


