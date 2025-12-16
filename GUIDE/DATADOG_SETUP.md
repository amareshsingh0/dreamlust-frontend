# Datadog APM Setup Guide

Application Performance Monitoring (APM) with Datadog for both frontend and backend.

## 📋 Overview

Datadog provides:
- **Real User Monitoring (RUM)**: Frontend performance tracking
- **APM**: Backend performance monitoring and distributed tracing
- **Session Replay**: Record user sessions for debugging
- **Custom Metrics**: Track business events and KPIs

## 🚀 Frontend Setup

### 1. Install Dependencies

```bash
cd frontend
bun add @datadog/browser-rum @datadog/browser-logs
```

### 2. Environment Variables

Add to `frontend/.env`:

```env
VITE_DATADOG_APP_ID=your-app-id
VITE_DATADOG_CLIENT_TOKEN=your-client-token
VITE_DATADOG_SITE=datadoghq.com
VITE_DATADOG_ENV=production
VITE_APP_VERSION=1.0.0
```

### 3. Get Datadog Credentials

1. Go to [Datadog Dashboard](https://app.datadoghq.com/)
2. Navigate to **RUM** → **Applications**
3. Click **New Application**
4. Copy **Application ID** and **Client Token**

### 4. Usage

Datadog is automatically initialized in `main.tsx`:

```typescript
import { initDatadogRUM, initDatadogLogs } from './lib/monitoring/datadog';

if (import.meta.env.PROD) {
  initDatadogRUM();
  initDatadogLogs();
}
```

### 5. Track User Actions

```typescript
import { trackVideoPlay, trackSearch, trackPayment } from '@/lib/monitoring/datadog';

// Track video play
trackVideoPlay('content-123', '1080p');

// Track search
trackSearch('coding tutorial', 25);

// Track payment
trackPayment('txn-456', 9.99, 'USD');
```

### 6. Using Hooks

```typescript
import { useVideoTracking, useSearchTracking } from '@/hooks/useDatadogTracking';

function VideoPlayer({ contentId }: { contentId: string }) {
  const { trackPlay, trackPause, trackComplete } = useVideoTracking(contentId);
  
  const handlePlay = () => {
    trackPlay('1080p');
  };
  
  return <video onPlay={handlePlay} />;
}
```

## 🔧 Backend Setup

### 1. Install Dependencies

```bash
cd backend
bun add dd-trace
```

### 2. Environment Variables

Add to `backend/.env`:

```env
DATADOG_API_KEY=your-api-key
DATADOG_APP_KEY=your-app-key
DD_SITE=datadoghq.com
DD_ENV=production
DD_SERVICE=dreamlust-api
DD_VERSION=1.0.0
```

### 3. Get Datadog Credentials

1. Go to [Datadog Dashboard](https://app.datadoghq.com/)
2. Navigate to **Organization Settings** → **API Keys**
3. Create or copy **API Key** and **Application Key**

### 4. Automatic Initialization

Datadog APM is automatically initialized in `server.ts` before other imports:

```typescript
// Initialize Datadog APM first (must be before other imports)
if (env.NODE_ENV === 'production' && env.DATADOG_API_KEY) {
  require('dd-trace').init({
    service: 'dreamlust-api',
    env: env.DD_ENV || env.NODE_ENV,
    version: process.env.APP_VERSION || '1.0.0',
    site: env.DD_SITE || 'datadoghq.com',
    logInjection: true,
    runtimeMetrics: true,
    profiling: true,
  });
}
```

### 5. Custom Spans

```typescript
import { addTags, trackMetric } from '@/lib/monitoring/datadog';

router.post('/api/payment', async (req, res) => {
  addTags({ operation: 'process_payment', user_id: req.user?.id });
  
  // Your code here
  
  trackMetric('payment.amount', amount, { currency: 'USD' });
});
```

## 📊 Features

### Frontend (RUM)

- ✅ Automatic page view tracking
- ✅ User interaction tracking
- ✅ Resource loading tracking
- ✅ Long task detection
- ✅ Session replay (20% of sessions)
- ✅ Error tracking
- ✅ Custom action tracking

### Backend (APM)

- ✅ Automatic HTTP request tracing
- ✅ Database query tracing
- ✅ Distributed tracing across services
- ✅ Performance profiling
- ✅ Runtime metrics
- ✅ Log correlation (trace IDs in logs)

## 🎯 Custom Tracking Examples

### Track Video Events

```typescript
import { trackVideoPlay, trackVideoComplete } from '@/lib/monitoring/datadog';

// When video starts playing
trackVideoPlay('content-123', '1080p');

// When video completes
trackVideoComplete('content-123', 300); // 300 seconds
```

### Track Business Events

```typescript
import { trackAction } from '@/lib/monitoring/datadog';

// Track subscription
trackAction('subscription_created', {
  user_id: user.id,
  plan_id: 'premium',
  amount: 9.99,
});

// Track content upload
trackAction('content_uploaded', {
  content_id: content.id,
  type: 'video',
  size: 15000000, // bytes
});
```

### Track Errors

```typescript
import { addError } from '@/lib/monitoring/datadog';

try {
  // Your code
} catch (error) {
  addError(error, {
    context: 'payment_processing',
    user_id: user.id,
  });
}
```

## 🔍 Viewing Data in Datadog

### RUM Dashboard

1. Go to **RUM** → **Sessions**
2. View user sessions, page views, and errors
3. Click on a session to see replay

### APM Dashboard

1. Go to **APM** → **Services**
2. View service performance, traces, and errors
3. Click on a trace to see full request flow

### Custom Metrics

1. Go to **Metrics** → **Explorer**
2. Search for custom metrics (e.g., `payment.amount`)
3. Create dashboards and alerts

## 🔒 Privacy & Security

### Data Masking

- User input fields are automatically masked
- Sensitive query parameters are filtered
- Passwords and tokens are never logged

### Configuration

```typescript
// In datadog.ts
defaultPrivacyLevel: 'mask-user-input', // Mask all user input
beforeSend: (event) => {
  // Remove sensitive data from URLs
  if (event.view?.url) {
    const url = new URL(event.view.url);
    url.searchParams.delete('token');
    url.searchParams.delete('password');
    event.view.url = url.toString();
  }
  return event;
},
```

## 📈 Performance Impact

- **RUM**: Minimal impact (~1-2% overhead)
- **APM**: ~5-10% overhead on backend
- **Session Replay**: Only 20% of sessions recorded

## 🐛 Troubleshooting

### Frontend Not Tracking

1. Check browser console for errors
2. Verify `VITE_DATADOG_APP_ID` and `VITE_DATADOG_CLIENT_TOKEN` are set
3. Check Datadog dashboard for incoming data

### Backend Not Tracking

1. Check server logs for initialization errors
2. Verify `DATADOG_API_KEY` is set
3. Ensure `dd-trace` is imported before other modules

### Missing Traces

1. Check network tab for Datadog API calls
2. Verify credentials are correct
3. Check Datadog dashboard filters

## 📚 Additional Resources

- [Datadog RUM Documentation](https://docs.datadoghq.com/real_user_monitoring/)
- [Datadog APM Documentation](https://docs.datadoghq.com/tracing/)
- [Custom Metrics Guide](https://docs.datadoghq.com/metrics/custom_metrics/)


