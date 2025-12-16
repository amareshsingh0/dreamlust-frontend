/**
 * PagerDuty Integration
 * 
 * Sends alerts to PagerDuty for critical incidents
 */

import { AlertConfig, AlertSeverity } from './alerts';
import logger from '../logger';
import { env } from '@/config/env';

interface PagerDutyEvent {
  routing_key: string;
  event_action: 'trigger' | 'acknowledge' | 'resolve';
  dedup_key?: string;
  payload: {
    summary: string;
    source: string;
    severity: 'critical' | 'error' | 'warning' | 'info';
    custom_details?: Record<string, any>;
  };
  links?: Array<{ href: string; text: string }>;
}

/**
 * Send alert to PagerDuty
 */
export async function sendPagerDutyAlert(
  alert: AlertConfig,
  metricValue: number,
  context?: Record<string, any>
): Promise<void> {
  const routingKey = env.PAGERDUTY_INTEGRATION_KEY;
  if (!routingKey) {
    logger.warn('PagerDuty integration key not configured. Skipping alert.');
    return;
  }

  // Only send critical alerts to PagerDuty
  if (alert.threshold.severity !== AlertSeverity.CRITICAL) {
    return;
  }

  try {
    const event: PagerDutyEvent = {
      routing_key: routingKey,
      event_action: 'trigger',
      dedup_key: `${alert.name}-${Date.now()}`,
      payload: {
        summary: `${alert.name}: ${alert.metric} = ${metricValue} (threshold: ${alert.threshold.threshold})`,
        source: env.API_URL || 'dreamlust-api',
        severity: 'critical',
        custom_details: {
          alert_name: alert.name,
          metric: alert.metric,
          metric_value: metricValue,
          threshold: alert.threshold.threshold,
          description: alert.threshold.description,
          ...context,
        },
      },
      links: alert.runbookUrl
        ? [
            {
              href: `${env.API_URL}${alert.runbookUrl}`,
              text: 'View Runbook',
            },
          ]
        : undefined,
    };

    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PagerDuty API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    logger.info('PagerDuty alert sent successfully', {
      alert: alert.name,
      dedup_key: result.dedup_key,
    });
  } catch (error) {
    logger.error('Failed to send PagerDuty alert', {
      alert: alert.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Resolve PagerDuty incident
 */
export async function resolvePagerDutyIncident(dedupKey: string): Promise<void> {
  const routingKey = env.PAGERDUTY_INTEGRATION_KEY;
  if (!routingKey) {
    return;
  }

  try {
    const event: PagerDutyEvent = {
      routing_key: routingKey,
      event_action: 'resolve',
      dedup_key: dedupKey,
      payload: {
        summary: 'Incident resolved',
        source: env.API_URL || 'dreamlust-api',
        severity: 'info',
      },
    };

    await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    logger.info('PagerDuty incident resolved', { dedup_key: dedupKey });
  } catch (error) {
    logger.error('Failed to resolve PagerDuty incident', {
      dedup_key: dedupKey,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


