/**
 * Opsgenie Integration
 * 
 * Alternative to PagerDuty for on-call management and alerting
 */

import { AlertConfig, AlertSeverity } from './alerts';
import logger from '../logger';
import { env } from '@/config/env';

interface OpsgenieAlert {
  message: string;
  alias?: string;
  description?: string;
  responders?: Array<{ type: string; id: string }>;
  tags?: string[];
  details?: Record<string, string>;
  priority?: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
  source?: string;
}

/**
 * Get priority from severity
 */
function getPriority(severity: AlertSeverity): 'P1' | 'P2' | 'P3' | 'P4' | 'P5' {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 'P1';
    case AlertSeverity.WARNING:
      return 'P2';
    case AlertSeverity.INFO:
      return 'P4';
    default:
      return 'P3';
  }
}

/**
 * Send alert to Opsgenie
 */
export async function sendOpsgenieAlert(
  alert: AlertConfig,
  metricValue: number,
  context?: Record<string, any>
): Promise<void> {
  const apiKey = env.OPSGENIE_API_KEY;
  if (!apiKey) {
    logger.warn('Opsgenie API key not configured. Skipping alert.');
    return;
  }

  // Only send critical and warning alerts to Opsgenie
  if (alert.threshold.severity === AlertSeverity.INFO) {
    return;
  }

  try {
    const opsgenieAlert: OpsgenieAlert = {
      message: `${alert.name}: ${alert.metric} = ${metricValue}`,
      alias: `${alert.name}-${Date.now()}`,
      description: alert.threshold.description || alert.name,
      priority: getPriority(alert.threshold.severity),
      source: env.API_URL || 'dreamlust-api',
      tags: [alert.threshold.severity, alert.metric],
      details: {
        metric: alert.metric,
        metric_value: metricValue.toString(),
        threshold: alert.threshold.threshold.toString(),
        ...Object.fromEntries(
          Object.entries(context || {}).map(([key, value]) => [key, String(value)])
        ),
        ...(alert.runbookUrl ? { runbook: `${env.API_URL}${alert.runbookUrl}` } : {}),
      },
    };

    const response = await fetch('https://api.opsgenie.com/v2/alerts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `GenieKey ${apiKey}`,
      },
      body: JSON.stringify(opsgenieAlert),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Opsgenie API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    logger.info('Opsgenie alert sent successfully', {
      alert: alert.name,
      alert_id: result.data?.id,
    });
  } catch (error) {
    logger.error('Failed to send Opsgenie alert', {
      alert: alert.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Close Opsgenie alert
 */
export async function closeOpsgenieAlert(alias: string, note?: string): Promise<void> {
  const apiKey = env.OPSGENIE_API_KEY;
  if (!apiKey) {
    return;
  }

  try {
    const response = await fetch(`https://api.opsgenie.com/v2/alerts/${alias}/close`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `GenieKey ${apiKey}`,
      },
      body: JSON.stringify({
        note: note || 'Alert resolved automatically',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Opsgenie API error: ${response.status} - ${errorText}`);
    }

    logger.info('Opsgenie alert closed successfully', { alias });
  } catch (error) {
    logger.error('Failed to close Opsgenie alert', {
      alias,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


