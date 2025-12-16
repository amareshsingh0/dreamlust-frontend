/**
 * Alert Manager
 * 
 * Centralized alert management and routing
 */

import { AlertConfig, checkAlert, logAlert, getEnabledAlerts } from './alerts';
import { sendPagerDutyAlert } from './pagerduty';
import { sendSlackAlert } from './slack';
import { sendOpsgenieAlert } from './opsgenie';
import logger from '../logger';

interface AlertContext {
  timestamp?: string;
  environment?: string;
  service?: string;
  [key: string]: any;
}

/**
 * Process and route alert
 */
export async function processAlert(
  alertName: string,
  metricValue: number,
  context?: AlertContext
): Promise<void> {
  const { triggered, alert } = checkAlert(alertName, metricValue);

  if (!triggered || !alert) {
    return;
  }

  // Log alert
  logAlert(alert, metricValue, context);

  // Route to notification channels
  const promises: Promise<void>[] = [];

  if (alert.notificationChannels.includes('pagerduty')) {
    promises.push(sendPagerDutyAlert(alert, metricValue, context));
  }

  if (alert.notificationChannels.includes('opsgenie')) {
    promises.push(sendOpsgenieAlert(alert, metricValue, context));
  }

  if (alert.notificationChannels.includes('slack')) {
    promises.push(sendSlackAlert(alert, metricValue, context));
  }

  // Wait for all notifications to be sent (don't block on failures)
  await Promise.allSettled(promises);
}

/**
 * Check all enabled alerts (for periodic monitoring)
 */
export async function checkAllAlerts(metrics: Record<string, number>, context?: AlertContext): Promise<void> {
  const enabledAlerts = getEnabledAlerts();

  const promises = enabledAlerts.map((alert) => {
    const metricValue = metrics[alert.metric];
    if (metricValue === undefined) {
      return Promise.resolve();
    }
    return processAlert(alert.name, metricValue, context);
  });

  await Promise.allSettled(promises);
}

/**
 * Alert manager instance
 */
export class AlertManager {
  private alertHistory: Map<string, { timestamp: number; value: number }[]> = new Map();
  private readonly historySize = 100;

  /**
   * Record metric value
   */
  recordMetric(metric: string, value: number): void {
    if (!this.alertHistory.has(metric)) {
      this.alertHistory.set(metric, []);
    }

    const history = this.alertHistory.get(metric)!;
    history.push({ timestamp: Date.now(), value });

    // Keep only recent history
    if (history.length > this.historySize) {
      history.shift();
    }
  }

  /**
   * Get metric history
   */
  getMetricHistory(metric: string, windowMs?: number): number[] {
    const history = this.alertHistory.get(metric) || [];
    const now = Date.now();

    if (windowMs) {
      return history
        .filter((entry) => now - entry.timestamp <= windowMs)
        .map((entry) => entry.value);
    }

    return history.map((entry) => entry.value);
  }

  /**
   * Calculate metric statistics
   */
  calculateStats(metric: string, windowMs?: number): {
    count: number;
    min: number;
    max: number;
    avg: number;
    p95?: number;
    p99?: number;
  } {
    const values = this.getMetricHistory(metric, windowMs);

    if (values.length === 0) {
      return { count: 0, min: 0, max: 0, avg: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / values.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

// Export singleton instance
export const alertManager = new AlertManager();

