# Monitoring & Incident Response

Comprehensive monitoring and alerting system for production incident management.

## 📋 Overview

The monitoring system provides:
- **Alert Definitions**: Pre-configured alerts for critical metrics
- **Multi-Channel Notifications**: PagerDuty, Opsgenie, and Slack integration
- **Alert Management**: Centralized alert processing and routing
- **Runbooks**: Detailed incident response procedures

## 🚨 Alert Configuration

### Alert Definitions

Alerts are defined in `backend/src/lib/monitoring/alerts.ts`:

```typescript
export const ALERTS = {
  error_rate: {
    name: 'High Error Rate',
    metric: 'http.error_rate',
    threshold: {
      threshold: 0.05, // 5% error rate
      window: '5m',
      severity: AlertSeverity.CRITICAL,
      enabled: true,
    },
    notificationChannels: ['pagerduty', 'slack'],
    runbookUrl: '/runbooks/high-error-rate',
  },
  // ... more alerts
};
```

### Available Alerts

**Critical Alerts:**
- `error_rate` - Error rate > 5%
- `response_time_p99` - P99 response time > 2s
- `health_check_failure` - Health check returns unhealthy
- `disk_usage` - Disk usage > 85%
- `memory_usage` - Memory usage > 90%

**Warning Alerts:**
- `error_rate_warning` - Error rate > 2%
- `response_time_p95` - P95 response time > 1s
- `database_connections` - Connection pool > 80%
- `cpu_usage` - CPU usage > 90%
- `queue_size` - Queue size > 10,000

## 🔔 Notification Channels

### PagerDuty

**Setup:**
1. Create PagerDuty service
2. Add Events API v2 integration
3. Copy integration key to `PAGERDUTY_INTEGRATION_KEY`

**Usage:**
```typescript
import { sendPagerDutyAlert } from '@/lib/monitoring/pagerduty';

await sendPagerDutyAlert(alert, metricValue, context);
```

**Features:**
- Automatic incident creation
- Escalation policies
- On-call rotation
- Incident resolution

### Opsgenie

**Setup:**
1. Create Opsgenie team
2. Generate API key
3. Add to `OPSGENIE_API_KEY`

**Usage:**
```typescript
import { sendOpsgenieAlert } from '@/lib/monitoring/opsgenie';

await sendOpsgenieAlert(alert, metricValue, context);
```

**Features:**
- Alert management
- On-call scheduling
- Escalation rules
- Alert closing

### Slack

**Setup:**
1. Create Slack webhook
2. Add to `SLACK_WEBHOOK_URL`

**Usage:**
```typescript
import { sendSlackAlert, sendSlackMessage } from '@/lib/monitoring/slack';

await sendSlackAlert(alert, metricValue, context);
await sendSlackMessage('Custom message', '#alerts', AlertSeverity.WARNING);
```

**Features:**
- Rich message formatting
- Color-coded by severity
- Runbook links
- Custom messages

## 📊 Alert Manager

### Usage

```typescript
import { alertManager, processAlert } from '@/lib/monitoring/alertManager';

// Process single alert
await processAlert('error_rate', 0.06, {
  endpoint: '/api/users',
  timestamp: new Date().toISOString(),
});

// Record metric for history
alertManager.recordMetric('http.error_rate', 0.05);

// Get metric statistics
const stats = alertManager.calculateStats('http.error_rate', 300000); // 5 minutes
console.log(stats.p95); // P95 value
```

### Metric History

The alert manager maintains metric history for:
- Statistical calculations (avg, min, max, p95, p99)
- Trend analysis
- Alert threshold evaluation

## 🔧 Configuration

### Environment Variables

```env
# PagerDuty
PAGERDUTY_INTEGRATION_KEY=your-integration-key

# Opsgenie
OPSGENIE_API_KEY=your-api-key

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Alert Customization

To customize alerts, edit `backend/src/lib/monitoring/alerts.ts`:

```typescript
export const ALERTS: Record<string, AlertConfig> = {
  // Add or modify alerts
  custom_alert: {
    name: 'Custom Alert',
    metric: 'custom.metric',
    threshold: {
      threshold: 100,
      severity: AlertSeverity.WARNING,
      enabled: true,
    },
    notificationChannels: ['slack'],
  },
};
```

## 📚 Runbooks

Detailed runbooks are available in `RUNBOOKS.md`:

- High Error Rate
- High Response Time
- Health Check Failure
- Database Connection Issues
- Disk Usage
- Slow Database Queries

Each runbook includes:
- Symptoms
- Immediate actions
- Investigation steps
- Resolution steps
- Prevention measures

## 🚀 Integration Examples

### Error Handler Integration

```typescript
import { processAlert } from '@/lib/monitoring/alertManager';

// In error handler
if (errorRate > 0.05) {
  await processAlert('error_rate', errorRate, {
    endpoint: req.path,
    method: req.method,
  });
}
```

### Health Check Integration

```typescript
import { processAlert } from '@/lib/monitoring/alertManager';

// In health check
if (healthStatus === 'unhealthy') {
  await processAlert('health_check_failure', 0, {
    checks: healthChecks,
  });
}
```

### Periodic Monitoring

```typescript
import { checkAllAlerts, alertManager } from '@/lib/monitoring/alertManager';

// Periodic check (every 5 minutes)
setInterval(async () => {
  const metrics = {
    'http.error_rate': calculateErrorRate(),
    'http.response_time': getResponseTime(),
    'database.connection_pool_usage': getConnectionPoolUsage(),
  };

  // Record metrics
  Object.entries(metrics).forEach(([metric, value]) => {
    alertManager.recordMetric(metric, value);
  });

  // Check all alerts
  await checkAllAlerts(metrics, {
    environment: env.NODE_ENV,
    service: 'dreamlust-api',
  });
}, 5 * 60 * 1000);
```

## 📈 Escalation Policy

### Level 1: On-Call Engineer
- **Response Time**: 15 minutes
- **Actions**: Acknowledge, initial investigation

### Level 2: Senior Engineer
- **Escalation**: 30 minutes
- **Actions**: Deep investigation, rollback

### Level 3: Engineering Manager
- **Escalation**: 1 hour
- **Actions**: Coordinate team, decisions

### Level 4: CTO/VP Engineering
- **Escalation**: 2 hours or critical impact
- **Actions**: Strategic decisions

## 🔍 Monitoring Dashboard

### Key Metrics

1. **Error Rate**: < 1% (target), > 5% (critical)
2. **Response Time**: P95 < 500ms, P99 < 1s
3. **Database**: Connection pool < 70%, Query time < 1s
4. **System**: CPU < 70%, Memory < 80%, Disk < 75%
5. **Queue**: Size < 1000, Processing time < 1m

## 🐛 Troubleshooting

### Alerts Not Sending

1. Check environment variables are set
2. Verify API keys are valid
3. Check logs for errors
4. Test webhook URLs

### False Positives

1. Adjust alert thresholds
2. Review alert windows
3. Add alert filters
4. Implement alert deduplication

## 📚 Additional Resources

- [RUNBOOKS.md](../RUNBOOKS.md) - Detailed incident response procedures
- [PagerDuty API](https://developer.pagerduty.com/api-reference/)
- [Opsgenie API](https://docs.opsgenie.com/docs/api)
- [Slack Webhooks](https://api.slack.com/messaging/webhooks)


