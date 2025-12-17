/**
 * Slack/Discord Integration
 * 
 * Sends alerts to Slack or Discord channels for monitoring and incident response
 * Supports both SLACK_WEBHOOK_URL and DISCORD_WEBHOOK_URL (Discord webhooks are compatible)
 */

import { AlertConfig, AlertSeverity } from './alerts';
import logger from '../logger';
import { env } from '../../config/env';

interface SlackMessage {
  text?: string;
  blocks?: Array<{
    type: string;
    text?: { type: string; text: string };
    fields?: Array<{ type: string; text: string }>;
  }>;
  attachments?: Array<{
    color: string;
    fields: Array<{ title: string; value: string; short: boolean }>;
  }>;
}

/**
 * Get color for alert severity
 */
function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 'danger'; // Red
    case AlertSeverity.WARNING:
      return 'warning'; // Yellow
    case AlertSeverity.INFO:
      return 'good'; // Green
    default:
      return '#808080'; // Gray
  }
}

/**
 * Get emoji for alert severity
 */
function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return '🚨';
    case AlertSeverity.WARNING:
      return '⚠️';
    case AlertSeverity.INFO:
      return 'ℹ️';
    default:
      return '📢';
  }
}

/**
 * Send alert to Slack
 */
export async function sendSlackAlert(
  alert: AlertConfig,
  metricValue: number,
  context?: Record<string, any>
): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL || env.SLACK_WEBHOOK_URL; // Support both Discord and Slack
  if (!webhookUrl) {
    logger.warn('Slack/Discord webhook URL not configured. Skipping alert.');
    return;
  }

  try {
    const color = getSeverityColor(alert.threshold.severity);
    const emoji = getSeverityEmoji(alert.threshold.severity);

    const message: SlackMessage = {
      text: `${emoji} ${alert.name}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Metric',
              value: alert.metric,
              short: true,
            },
            {
              title: 'Value',
              value: metricValue.toString(),
              short: true,
            },
            {
              title: 'Threshold',
              value: alert.threshold.threshold.toString(),
              short: true,
            },
            {
              title: 'Severity',
              value: alert.threshold.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Description',
              value: alert.threshold.description || 'No description',
              short: false,
            },
            ...(context
              ? Object.entries(context).map(([key, value]) => ({
                  title: key,
                  value: String(value),
                  short: true,
                }))
              : []),
            ...(alert.runbookUrl
              ? [
                  {
                    title: 'Runbook',
                    value: `${env.API_URL}${alert.runbookUrl}`,
                    short: false,
                  },
                ]
              : []),
          ],
        },
      ],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Slack API error: ${response.status} - ${errorText}`);
    }

    logger.info('Slack/Discord alert sent successfully', { alert: alert.name });
  } catch (error) {
    logger.error('Failed to send Slack/Discord alert', {
      alert: alert.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send custom message to Slack
 */
export async function sendSlackMessage(
  text: string,
  channel?: string,
  severity: AlertSeverity = AlertSeverity.INFO
): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL || env.SLACK_WEBHOOK_URL; // Support both Discord and Slack
  if (!webhookUrl) {
    return;
  }

  try {
    const color = getSeverityColor(severity);
    const emoji = getSeverityEmoji(severity);

    const message: SlackMessage = {
      text: `${emoji} ${text}`,
      attachments: [
        {
          color,
          fields: [
            {
              title: 'Message',
              value: text,
              short: false,
            },
          ],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    logger.error('Failed to send Slack/Discord message', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


