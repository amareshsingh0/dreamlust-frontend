# Monitoring & Alerting Setup Guide

This guide explains how to set up and use the monitoring and alerting system for post-launch operations.

## Overview

The monitoring system automatically:
- Collects metrics (error rates, response times, database connections, system resources)
- Checks metrics against alert thresholds every minute
- Triggers alerts via PagerDuty, Opsgenie, or Slack when thresholds are exceeded
- Provides runbooks for incident response

## Components

### 1. Metrics Collector (`metricsCollector.ts`)
Collects and aggregates metrics:
- **Error Rate**: Percentage of 5xx errors over 5-minute window
- **Response Times**: P95 and P99 response times
- **Database Connections**: Active connections and pool usage
- **System Resources**: CPU, memory usage
- **Redis Status**: Connection status

### 2. Monitoring Service (`monitoringService.ts`)
Periodically (every 1 minute):
- Collects all metrics
- Checks them against alert thresholds
- Triggers alerts when thresholds are exceeded
- Checks health endpoint status

### 3. Alert Configuration (`alerts.ts`)
Pre-configured alerts matching your requirements:
- `error_rate`: 5% threshold (critical)
- `response_time_p95`: 1 second threshold (warning)
- `database_connections`: 80% pool usage (warning)
- `disk_usage`: 85% threshold (critical)

### 4. On-Call Rotation (`onCallRotation.ts`)
Manages on-call schedules and escalation policies for PagerDuty/Opsgenie.

### 5. Runbooks (`RUNBOOKS.md`)
Step-by-step guides for responding to common incidents.

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Discord Webhook (for all alerts - replaces PagerDuty, Opsgenie, and Slack)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# API URL (for health checks)
API_URL=http://localhost:3001

# Sentry DSN (for error tracking - already configured)
SENTRY_DSN=your-sentry-dsn
SENTRY_ENVIRONMENT=production
```

### 2. Discord Webhook Setup

1. **Create Discord Webhook**
   - Open your Discord server
   - Go to Server Settings → Integrations → Webhooks
   - Click "New Webhook" or "Create Webhook"
   - Configure webhook:
     - Name: "Dreamlust Alert System" (or your preferred name)
     - Channel: Select the channel for alerts (e.g., #incidents, #alerts)
     - Copy the webhook URL
   - Add to `DISCORD_WEBHOOK_URL` in `.env`:
     ```bash
     DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN
     ```

2. **Test Webhook**
   ```bash
   # Test the webhook
   curl -X POST $DISCORD_WEBHOOK_URL \
     -H "Content-Type: application/json" \
     -d '{"content": "Test alert from Dreamlust API"}'
   ```

3. **Set Up Discord Channel**
   - Create dedicated channels:
     - `#incidents` - For critical alerts and incident coordination
     - `#alerts` - For all monitoring alerts
     - `#monitoring` - For monitoring updates and status
   - Set up notifications:
     - Enable @mentions for on-call engineers
     - Set up role-based mentions for escalation
   - Configure permissions:
     - Allow bot/webhook to post messages
     - Restrict who can post to prevent spam

4. **On-Call Rotation in Discord**
   - Use Discord roles for on-call rotation:
     - Create roles: `@on-call-primary`, `@on-call-secondary`
     - Mention roles in alerts: `@on-call-primary`
   - Or use Discord bots:
     - PagerBot, OnCallBot, or similar for rotation management
   - Manual rotation:
     - Update roles weekly/daily
     - Document rotation schedule in Discord channel topic

## How It Works

### Automatic Monitoring

The monitoring service starts automatically in production:

1. **Metrics Collection**: Every request is tracked for errors and response times
2. **Periodic Checks**: Every 1 minute, metrics are checked against thresholds
3. **Alert Triggering**: When a threshold is exceeded, alerts are sent to Discord
4. **Health Checks**: Health endpoint is checked every minute

### Alert Flow

```
Metric exceeds threshold
    ↓
Alert triggered
    ↓
Logged to Winston
    ↓
Sent to Discord (all alerts)
    ↓
Critical alerts get special formatting with @mentions
    ↓
On-call engineer notified via Discord
    ↓
Follow runbook to resolve
```

## Alert Thresholds

### Critical Alerts (Discord with special formatting)

- **Error Rate**: > 5% over 5 minutes
- **P99 Response Time**: > 2 seconds over 5 minutes
- **Database Pool**: > 95% usage
- **Disk Usage**: > 85%
- **Memory Usage**: > 90%
- **Health Check Failure**: Health endpoint returns unhealthy

### Warning Alerts (Discord)

- **P95 Response Time**: > 1 second over 5 minutes
- **Database Pool**: > 80% usage
- **CPU Usage**: > 90% over 5 minutes
- **Redis Connection Failure**: Redis disconnected
- **Elevated Error Rate**: > 2% over 5 minutes

## Customizing Alerts

Edit `backend/src/lib/monitoring/alerts.ts` to:
- Change thresholds
- Add new alerts
- Modify notification channels
- Update severity levels

Example:
```typescript
export const ALERTS: Record<string, AlertConfig> = {
  error_rate: {
    name: 'High Error Rate',
    metric: 'http.error_rate',
    threshold: {
      threshold: 0.05, // 5% - adjust as needed
      window: '5m',
      severity: AlertSeverity.CRITICAL,
      enabled: true,
    },
    notificationChannels: ['pagerduty', 'slack'],
  },
  // ... more alerts
};
```

## Testing Alerts

### Manual Alert Trigger

```typescript
import { processAlert } from './lib/monitoring/alertManager';

// Trigger a test alert
await processAlert('error_rate', 0.06, {
  test: true,
  message: 'This is a test alert',
});
```

### Test Health Check Failure

```bash
# Stop database temporarily to trigger health check failure
# Or modify health endpoint to return unhealthy
curl http://localhost:3001/api/health
```

## Monitoring Dashboard

For a full monitoring dashboard, integrate with:
- **Datadog**: APM and metrics dashboard
- **Grafana**: Custom dashboards with Prometheus
- **CloudWatch**: AWS-native monitoring
- **New Relic**: Application performance monitoring

The metrics collector provides the data; these tools provide visualization.

## On-Call Rotation

### Using PagerDuty/Opsgenie (Recommended)

Manage on-call rotation directly in PagerDuty/Opsgenie dashboards:
- Better timezone handling
- Override capabilities
- Mobile app notifications
- Escalation policies

### Using Code (Basic)

Edit `backend/src/lib/monitoring/onCallRotation.ts`:

```typescript
DEFAULT_SCHEDULES[0].users = [
  'engineer1@example.com',
  'engineer2@example.com',
  'engineer3@example.com',
];
```

## Runbooks

See `backend/GUIDE/RUNBOOKS.md` for detailed runbooks covering:
- High error rate
- High response time
- Database connection issues
- Disk usage
- Memory issues
- Health check failures
- And more...

## Troubleshooting

### Alerts Not Triggering

1. **Check Monitoring Service Status**
   ```typescript
   import { monitoringService } from './lib/monitoring/monitoringService';
   console.log(monitoringService.getStatus());
   ```

2. **Check Environment Variables**
   - Verify `DISCORD_WEBHOOK_URL` is set correctly
   - Test webhook URL:
     ```bash
     curl -X POST $DISCORD_WEBHOOK_URL \
       -H "Content-Type: application/json" \
       -d '{"content": "Test"}'
     ```

3. **Check Logs**
   ```bash
   tail -f logs/combined.log | grep -i alert
   tail -f logs/error.log | grep -i discord
   ```

### Metrics Not Collecting

1. **Check Request Logger**
   - Verify `requestLogger` middleware is enabled
   - Check that requests are being logged

2. **Check Metrics Collector**
   ```typescript
   import { metricsCollector } from './lib/monitoring/metricsCollector';
   const snapshot = await metricsCollector.collectMetrics();
   console.log(snapshot);
   ```

### False Positives

1. **Adjust Thresholds**
   - Edit `alerts.ts` to increase thresholds
   - Add cooldown periods

2. **Disable Specific Alerts**
   ```typescript
   ALERTS.error_rate.threshold.enabled = false;
   ```

## Best Practices

1. **Start Conservative**: Set higher thresholds initially, lower them as you learn
2. **Monitor Trends**: Watch for gradual increases, not just spikes
3. **Regular Reviews**: Review alert effectiveness weekly
4. **Update Runbooks**: Keep runbooks current with actual incidents
5. **Test Regularly**: Test alerting system monthly
6. **Document Changes**: Document any threshold changes and reasons

## Production Checklist

- [ ] Discord webhook created and configured
- [ ] `DISCORD_WEBHOOK_URL` added to environment variables
- [ ] Discord channels set up (#incidents, #alerts)
- [ ] On-call roles configured in Discord
- [ ] Test alert sent and verified in Discord
- [ ] Alert thresholds reviewed and adjusted
- [ ] Runbooks reviewed by team
- [ ] Monitoring service running (auto-starts in production)
- [ ] Health endpoint accessible
- [ ] Team trained on incident response
- [ ] Sentry DSN configured (for error tracking)

## Support

For issues or questions:
- Check logs: `logs/combined.log` and `logs/error.log`
- Review runbooks: `GUIDE/RUNBOOKS.md`
- Check monitoring service status
- Review alert configuration in `alerts.ts`

---

**Last Updated:** [Date]
**Maintained By:** Engineering Team

