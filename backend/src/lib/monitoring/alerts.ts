/**
 * Alert Configuration and Management
 * 
 * Defines alert thresholds, severity levels, and alerting rules
 * for critical metrics and system health monitoring.
 */

import logger from '../logger';
import { env } from '../../config/env';

/**
 * Alert Severity Levels
 */
export enum AlertSeverity {
  CRITICAL = 'critical',
  WARNING = 'warning',
  INFO = 'info',
}

/**
 * Alert Threshold Configuration
 */
export interface AlertThreshold {
  threshold: number;
  window?: string; // e.g., '5m', '1h'
  percentile?: number; // For percentile-based metrics (e.g., p95, p99)
  severity: AlertSeverity;
  enabled: boolean;
  description?: string;
}

/**
 * Alert Configuration
 */
export interface AlertConfig {
  name: string;
  metric: string;
  threshold: AlertThreshold;
  notificationChannels: string[]; // e.g., ['pagerduty', 'slack', 'email']
  runbookUrl?: string;
}

/**
 * Alert Definitions
 */
export const ALERTS: Record<string, AlertConfig> = {
  // Error Rate Alerts
  error_rate: {
    name: 'High Error Rate',
    metric: 'http.error_rate',
    threshold: {
      threshold: 0.05, // 5% error rate
      window: '5m',
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      description: 'Error rate exceeds 5% over 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/high-error-rate',
  },

  error_rate_warning: {
    name: 'Elevated Error Rate',
    metric: 'http.error_rate',
    threshold: {
      threshold: 0.02, // 2% error rate
      window: '5m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'Error rate exceeds 2% over 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/elevated-error-rate',
  },

  // Response Time Alerts
  // Alias for simpler naming (matches requirement)
  response_time: {
    name: 'High Response Time',
    metric: 'http.response_time',
    threshold: {
      threshold: 1000, // 1 second
      percentile: 95,
      window: '5m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'P95 response time exceeds 1 second over 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/high-response-time',
  },

  response_time_p95: {
    name: 'High P95 Response Time',
    metric: 'http.response_time',
    threshold: {
      threshold: 1000, // 1 second
      percentile: 95,
      window: '5m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'P95 response time exceeds 1 second over 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/high-response-time',
  },

  response_time_p99: {
    name: 'High P99 Response Time',
    metric: 'http.response_time',
    threshold: {
      threshold: 2000, // 2 seconds
      percentile: 99,
      window: '5m',
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      description: 'P99 response time exceeds 2 seconds over 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/high-response-time',
  },

  // Database Alerts
  database_connections: {
    name: 'High Database Connection Pool Usage',
    metric: 'database.connection_pool_usage',
    threshold: {
      threshold: 80, // 80% of pool
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'Database connection pool usage exceeds 80%',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/database-connections',
  },

  database_connections_critical: {
    name: 'Critical Database Connection Pool Usage',
    metric: 'database.connection_pool_usage',
    threshold: {
      threshold: 95, // 95% of pool
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      description: 'Database connection pool usage exceeds 95%',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/database-connections',
  },

  database_query_time: {
    name: 'Slow Database Queries',
    metric: 'database.query_time',
    threshold: {
      threshold: 5000, // 5 seconds
      percentile: 95,
      window: '5m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'P95 database query time exceeds 5 seconds',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/slow-database-queries',
  },

  // System Resource Alerts
  disk_usage: {
    name: 'High Disk Usage',
    metric: 'system.disk_usage',
    threshold: {
      threshold: 85, // 85% full
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      description: 'Disk usage exceeds 85%',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/disk-usage',
  },

  memory_usage: {
    name: 'High Memory Usage',
    metric: 'system.memory_usage',
    threshold: {
      threshold: 90, // 90% memory usage
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      description: 'Memory usage exceeds 90%',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/memory-usage',
  },

  cpu_usage: {
    name: 'High CPU Usage',
    metric: 'system.cpu_usage',
    threshold: {
      threshold: 90, // 90% CPU usage
      window: '5m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'CPU usage exceeds 90% over 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/cpu-usage',
  },

  // Redis Alerts
  redis_connection_failure: {
    name: 'Redis Connection Failure',
    metric: 'redis.connection_status',
    threshold: {
      threshold: 0, // 0 = disconnected
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'Redis connection failed',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/redis-connection-failure',
  },

  redis_memory_usage: {
    name: 'High Redis Memory Usage',
    metric: 'redis.memory_usage',
    threshold: {
      threshold: 80, // 80% memory usage
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'Redis memory usage exceeds 80%',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/redis-memory-usage',
  },

  // Application Health Alerts
  health_check_failure: {
    name: 'Health Check Failure',
    metric: 'health.check_status',
    threshold: {
      threshold: 0, // 0 = unhealthy
      severity: AlertSeverity.CRITICAL,
      enabled: true,
      description: 'Health check endpoint returned unhealthy status',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/health-check-failure',
  },

  // Queue Alerts
  queue_size: {
    name: 'Large Queue Size',
    metric: 'queue.size',
    threshold: {
      threshold: 10000, // 10,000 jobs
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'Queue size exceeds 10,000 jobs',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/queue-size',
  },

  queue_processing_time: {
    name: 'Slow Queue Processing',
    metric: 'queue.processing_time',
    threshold: {
      threshold: 300000, // 5 minutes
      percentile: 95,
      window: '10m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'P95 queue processing time exceeds 5 minutes',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/queue-processing-time',
  },

  // API Rate Limit Alerts
  rate_limit_exceeded: {
    name: 'Rate Limit Exceeded',
    metric: 'api.rate_limit_exceeded',
    threshold: {
      threshold: 100, // 100 requests
      window: '1m',
      severity: AlertSeverity.WARNING,
      enabled: true,
      description: 'Rate limit exceeded more than 100 times in 1 minute',
    },
    notificationChannels: ['discord'],
    runbookUrl: '/runbooks/rate-limit-exceeded',
  },
};

/**
 * Get alert configuration by name
 */
export function getAlert(name: string): AlertConfig | undefined {
  return ALERTS[name];
}

/**
 * Get all enabled alerts
 */
export function getEnabledAlerts(): AlertConfig[] {
  return Object.values(ALERTS).filter((alert) => alert.threshold.enabled);
}

/**
 * Get alerts by severity
 */
export function getAlertsBySeverity(severity: AlertSeverity): AlertConfig[] {
  return Object.values(ALERTS).filter(
    (alert) => alert.threshold.severity === severity && alert.threshold.enabled
  );
}

/**
 * Check if metric value triggers alert
 */
export function checkAlert(
  alertName: string,
  metricValue: number
): { triggered: boolean; alert?: AlertConfig } {
  const alert = ALERTS[alertName];
  if (!alert || !alert.threshold.enabled) {
    return { triggered: false };
  }

  const triggered = metricValue >= alert.threshold.threshold;
  return { triggered, alert: triggered ? alert : undefined };
}

/**
 * Log alert (for integration with monitoring systems)
 */
export function logAlert(alert: AlertConfig, metricValue: number, context?: Record<string, any>) {
  const logData = {
    alert: alert.name,
    metric: alert.metric,
    threshold: alert.threshold.threshold,
    value: metricValue,
    severity: alert.threshold.severity,
    ...context,
  };

  if (alert.threshold.severity === AlertSeverity.CRITICAL) {
    logger.error('Critical alert triggered', logData);
  } else if (alert.threshold.severity === AlertSeverity.WARNING) {
    logger.warn('Warning alert triggered', logData);
  } else {
    logger.info('Info alert triggered', logData);
  }
}


