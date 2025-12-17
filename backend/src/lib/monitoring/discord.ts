/**
 * Discord Webhook Integration
 * 
 * Sends alerts to Discord channels via webhooks for monitoring and incident response
 * Replaces PagerDuty and Opsgenie for critical alerts
 */

import { AlertConfig, AlertSeverity } from './alerts';
import logger from '../logger';
import { env } from '../../config/env';

interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
  url?: string;
}

interface DiscordWebhookPayload {
  content?: string;
  username?: string;
  avatar_url?: string;
  embeds?: DiscordEmbed[];
}

/**
 * Get color for alert severity (Discord uses decimal colors)
 */
function getSeverityColor(severity: AlertSeverity): number {
  switch (severity) {
    case AlertSeverity.CRITICAL:
      return 0xff0000; // Red
    case AlertSeverity.WARNING:
      return 0xffaa00; // Orange/Yellow
    case AlertSeverity.INFO:
      return 0x00ff00; // Green
    default:
      return 0x808080; // Gray
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
 * Send alert to Discord (Critical alerts - replaces PagerDuty)
 */
export async function sendDiscordCriticalAlert(
  alert: AlertConfig,
  metricValue: number,
  context?: Record<string, any>
): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured. Skipping critical alert.');
    return;
  }

  // Only send critical alerts to Discord (replacing PagerDuty)
  if (alert.threshold.severity !== AlertSeverity.CRITICAL) {
    return;
  }

  try {
    const emoji = getSeverityEmoji(alert.threshold.severity);
    const color = getSeverityColor(alert.threshold.severity);

    const embed: DiscordEmbed = {
      title: `${emoji} ${alert.name}`,
      description: `**Critical Alert Triggered**`,
      color,
      fields: [
        {
          name: 'Metric',
          value: alert.metric,
          inline: true,
        },
        {
          name: 'Value',
          value: metricValue.toString(),
          inline: true,
        },
        {
          name: 'Threshold',
          value: alert.threshold.threshold.toString(),
          inline: true,
        },
        {
          name: 'Severity',
          value: alert.threshold.severity.toUpperCase(),
          inline: true,
        },
        {
          name: 'Description',
          value: alert.threshold.description || 'No description',
          inline: false,
        },
        ...(context
          ? Object.entries(context)
              .filter(([_, value]) => value !== undefined && value !== null)
              .map(([key, value]) => ({
                name: key,
                value: String(value).substring(0, 1024), // Discord field value limit
                inline: true,
              }))
          : []),
        ...(alert.runbookUrl
          ? [
              {
                name: 'Runbook',
                value: `${env.API_URL || 'http://localhost:3001'}${alert.runbookUrl}`,
                inline: false,
              },
            ]
          : []),
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Dreamlust API Monitoring',
      },
    };

    const payload: DiscordWebhookPayload = {
      content: `🚨 **CRITICAL ALERT** - ${alert.name}`,
      username: 'Dreamlust Alert System',
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook error: ${response.status} - ${errorText}`);
    }

    logger.info('Discord critical alert sent successfully', { alert: alert.name });
  } catch (error) {
    logger.error('Failed to send Discord critical alert', {
      alert: alert.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send alert to Discord (All alerts - replaces Slack)
 */
export async function sendDiscordAlert(
  alert: AlertConfig,
  metricValue: number,
  context?: Record<string, any>
): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    logger.warn('Discord webhook URL not configured. Skipping alert.');
    return;
  }

  try {
    const emoji = getSeverityEmoji(alert.threshold.severity);
    const color = getSeverityColor(alert.threshold.severity);

    const embed: DiscordEmbed = {
      title: `${emoji} ${alert.name}`,
      description: alert.threshold.description || 'Alert triggered',
      color,
      fields: [
        {
          name: 'Metric',
          value: alert.metric,
          inline: true,
        },
        {
          name: 'Value',
          value: metricValue.toString(),
          inline: true,
        },
        {
          name: 'Threshold',
          value: alert.threshold.threshold.toString(),
          inline: true,
        },
        {
          name: 'Severity',
          value: alert.threshold.severity.toUpperCase(),
          inline: true,
        },
        ...(context
          ? Object.entries(context)
              .filter(([_, value]) => value !== undefined && value !== null)
              .map(([key, value]) => ({
                name: key,
                value: String(value).substring(0, 1024),
                inline: true,
              }))
          : []),
        ...(alert.runbookUrl
          ? [
              {
                name: 'Runbook',
                value: `${env.API_URL || 'http://localhost:3001'}${alert.runbookUrl}`,
                inline: false,
              },
            ]
          : []),
      ],
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Dreamlust API Monitoring',
      },
    };

    const payload: DiscordWebhookPayload = {
      username: 'Dreamlust Alert System',
      embeds: [embed],
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord webhook error: ${response.status} - ${errorText}`);
    }

    logger.info('Discord alert sent successfully', { alert: alert.name });
  } catch (error) {
    logger.error('Failed to send Discord alert', {
      alert: alert.name,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Send custom message to Discord
 */
export async function sendDiscordMessage(
  text: string,
  severity: AlertSeverity = AlertSeverity.INFO
): Promise<void> {
  const webhookUrl = env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return;
  }

  try {
    const emoji = getSeverityEmoji(severity);
    const color = getSeverityColor(severity);

    const embed: DiscordEmbed = {
      description: `${emoji} ${text}`,
      color,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'Dreamlust API Monitoring',
      },
    };

    const payload: DiscordWebhookPayload = {
      username: 'Dreamlust Alert System',
      embeds: [embed],
    };

    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    logger.error('Failed to send Discord message', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}


