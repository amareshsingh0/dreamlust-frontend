/**
 * On-Call Rotation Configuration
 * 
 * Manages on-call rotation schedules and escalation policies
 * for Discord-based on-call management.
 * 
 * Note: For production, consider using Discord bots or external
 * rotation tools for better reliability and features.
 */

import { env } from '../../config/env';
import logger from '../logger';

/**
 * On-Call Rotation Schedule
 */
export interface OnCallSchedule {
  name: string;
  timezone: string;
  rotationType: 'daily' | 'weekly' | 'monthly';
  startDate: string; // ISO date string
  users: string[]; // User IDs or email addresses
  currentOnCall?: string;
}

/**
 * Escalation Policy
 */
export interface EscalationPolicy {
  name: string;
  rules: EscalationRule[];
}

export interface EscalationRule {
  level: number; // 1 = first level, 2 = second level, etc.
  delayMinutes: number; // Minutes to wait before escalating
  targets: EscalationTarget[];
}

export interface EscalationTarget {
  type: 'user' | 'schedule' | 'team';
  id: string;
}

/**
 * Default On-Call Schedules
 */
export const DEFAULT_SCHEDULES: OnCallSchedule[] = [
  {
    name: 'Primary On-Call',
    timezone: 'UTC',
    rotationType: 'weekly',
    startDate: new Date().toISOString(),
    users: [
      // Add your team members here
      // Example: 'user1@example.com', 'user2@example.com'
    ],
  },
  {
    name: 'Secondary On-Call',
    timezone: 'UTC',
    rotationType: 'weekly',
    startDate: new Date().toISOString(),
    users: [],
  },
];

/**
 * Default Escalation Policies
 */
export const DEFAULT_ESCALATION_POLICIES: EscalationPolicy[] = [
  {
    name: 'Critical Alerts',
    rules: [
      {
        level: 1,
        delayMinutes: 0, // Immediate
        targets: [{ type: 'schedule', id: 'primary-on-call' }],
      },
      {
        level: 2,
        delayMinutes: 15, // Escalate after 15 minutes
        targets: [{ type: 'schedule', id: 'secondary-on-call' }],
      },
      {
        level: 3,
        delayMinutes: 30, // Escalate after 30 minutes
        targets: [{ type: 'team', id: 'engineering-team' }],
      },
    ],
  },
  {
    name: 'Warning Alerts',
    rules: [
      {
        level: 1,
        delayMinutes: 5, // Wait 5 minutes
        targets: [{ type: 'schedule', id: 'primary-on-call' }],
      },
      {
        level: 2,
        delayMinutes: 30, // Escalate after 30 minutes
        targets: [{ type: 'schedule', id: 'secondary-on-call' }],
      },
    ],
  },
];

/**
 * On-Call Rotation Manager
 */
export class OnCallRotationManager {
  private schedules: Map<string, OnCallSchedule> = new Map();
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();

  constructor() {
    // Initialize with default schedules
    DEFAULT_SCHEDULES.forEach((schedule) => {
      this.schedules.set(schedule.name.toLowerCase().replace(/\s+/g, '-'), schedule);
    });

    // Initialize with default escalation policies
    DEFAULT_ESCALATION_POLICIES.forEach((policy) => {
      this.escalationPolicies.set(policy.name.toLowerCase().replace(/\s+/g, '-'), policy);
    });
  }

  /**
   * Get current on-call user for a schedule
   */
  getCurrentOnCall(scheduleName: string): string | undefined {
    const schedule = this.schedules.get(scheduleName.toLowerCase().replace(/\s+/g, '-'));
    if (!schedule || schedule.users.length === 0) {
      return undefined;
    }

    // Calculate current on-call based on rotation
    const startDate = new Date(schedule.startDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    let rotationIndex = 0;
    switch (schedule.rotationType) {
      case 'daily':
        rotationIndex = daysSinceStart % schedule.users.length;
        break;
      case 'weekly':
        rotationIndex = Math.floor(daysSinceStart / 7) % schedule.users.length;
        break;
      case 'monthly':
        rotationIndex = Math.floor(daysSinceStart / 30) % schedule.users.length;
        break;
    }

    return schedule.users[rotationIndex];
  }

  /**
   * Get escalation policy
   */
  getEscalationPolicy(policyName: string): EscalationPolicy | undefined {
    return this.escalationPolicies.get(policyName.toLowerCase().replace(/\s+/g, '-'));
  }

  /**
   * Add or update schedule
   */
  addSchedule(schedule: OnCallSchedule): void {
    const key = schedule.name.toLowerCase().replace(/\s+/g, '-');
    this.schedules.set(key, schedule);
    logger.info('On-call schedule updated', { schedule: schedule.name });
  }

  /**
   * Add or update escalation policy
   */
  addEscalationPolicy(policy: EscalationPolicy): void {
    const key = policy.name.toLowerCase().replace(/\s+/g, '-');
    this.escalationPolicies.set(key, policy);
    logger.info('Escalation policy updated', { policy: policy.name });
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): OnCallSchedule[] {
    return Array.from(this.schedules.values());
  }

  /**
   * Get all escalation policies
   */
  getAllEscalationPolicies(): EscalationPolicy[] {
    return Array.from(this.escalationPolicies.values());
  }
}

// Export singleton instance
export const onCallRotationManager = new OnCallRotationManager();

/**
 * Setup Instructions:
 * 
 * For Discord:
 * 1. Create Discord roles for on-call rotation:
 *    - @on-call-primary (primary on-call engineer)
 *    - @on-call-secondary (secondary on-call engineer)
 *    - @on-call-team (entire on-call team)
 * 
 * 2. Set up role mentions in Discord alerts:
 *    - Critical alerts will mention @on-call-primary
 *    - Escalation can mention @on-call-secondary after delay
 * 
 * 3. Configure Discord webhook:
 *    - Add DISCORD_WEBHOOK_URL to environment variables
 *    - Webhook should post to #incidents or #alerts channel
 * 
 * 4. Manual rotation (recommended for small teams):
 *    - Update Discord roles weekly/daily
 *    - Document rotation schedule in channel topic
 * 
 * 5. Automated rotation (optional):
 *    - Use Discord bots (PagerBot, OnCallBot, etc.)
 *    - Or implement custom rotation script
 * 
 * Note: This code provides the structure. For production,
 * consider using Discord bots or external rotation tools
 * for better reliability and features (timezone handling, overrides, etc.)
 */

