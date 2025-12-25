/**
 * Data Retention Service
 * Implements automated data cleanup based on retention policies
 * GDPR/CCPA compliance
 */

import { prisma } from '../prisma';
import logger from '../logger';

interface RetentionPolicy {
  table: string;
  retentionDays: number;
  dateColumn: string;
  description: string;
  enabled: boolean;
}

// Define retention policies
const RETENTION_POLICIES: RetentionPolicy[] = [
  {
    table: 'views',
    retentionDays: 730, // 2 years
    dateColumn: 'watchedAt',
    description: 'User viewing history',
    enabled: true,
  },
  {
    table: 'analytics_events',
    retentionDays: 730, // 2 years
    dateColumn: 'timestamp',
    description: 'Analytics events',
    enabled: true,
  },
  {
    table: 'search_history',
    retentionDays: 180, // 6 months
    dateColumn: 'createdAt',
    description: 'Search history',
    enabled: true,
  },
  {
    table: 'activity_feed',
    retentionDays: 365, // 1 year
    dateColumn: 'createdAt',
    description: 'Activity feed entries',
    enabled: true,
  },
  {
    table: 'notifications',
    retentionDays: 90, // 3 months
    dateColumn: 'createdAt',
    description: 'User notifications',
    enabled: true,
  },
  {
    table: 'email_queue',
    retentionDays: 30, // 1 month
    dateColumn: 'createdAt',
    description: 'Email queue (sent emails)',
    enabled: true,
  },
  {
    table: 'sessions',
    retentionDays: 30, // 1 month
    dateColumn: 'expiresAt',
    description: 'Expired sessions',
    enabled: true,
  },
  {
    table: 'account_deletions',
    retentionDays: 30, // 1 month after completion
    dateColumn: 'completedAt',
    description: 'Completed account deletions',
    enabled: true,
  },
  {
    table: 'feedback',
    retentionDays: 1095, // 3 years
    dateColumn: 'createdAt',
    description: 'User feedback',
    enabled: true,
  },
  {
    table: 'reports',
    retentionDays: 1095, // 3 years
    dateColumn: 'createdAt',
    description: 'Content reports',
    enabled: true,
  },
];

export class DataRetentionService {
  /**
   * Execute retention policy for a specific table
   */
  async executeRetentionPolicy(policy: RetentionPolicy): Promise<number> {
    const startTime = Date.now();
    let deletedCount = 0;

    try {
      logger.info(`Executing retention policy for ${policy.table}`);

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

      // Execute deletion based on table
      switch (policy.table) {
        case 'views':
          deletedCount = await this.deleteOldRecords('views', policy.dateColumn, cutoffDate);
          break;
        case 'analytics_events':
          deletedCount = await this.deleteOldRecords('analytics_events', policy.dateColumn, cutoffDate);
          break;
        case 'search_history':
          deletedCount = await this.deleteOldRecords('search_history', policy.dateColumn, cutoffDate);
          break;
        case 'activity_feed':
          deletedCount = await this.deleteOldRecords('activity_feed', policy.dateColumn, cutoffDate);
          break;
        case 'notifications':
          // Only delete read notifications
          const result = await prisma.$executeRaw`
            DELETE FROM notifications 
            WHERE ${policy.dateColumn}::timestamp < ${cutoffDate}::timestamp
            AND isRead = true
          `;
          deletedCount = Number(result);
          break;
        case 'email_queue':
          // Only delete sent/failed emails
          const emailResult = await prisma.$executeRaw`
            DELETE FROM email_queue 
            WHERE ${policy.dateColumn}::timestamp < ${cutoffDate}::timestamp
            AND status IN ('sent', 'failed')
          `;
          deletedCount = Number(emailResult);
          break;
        case 'account_deletions':
          // Only delete completed deletions
          const deletionResult = await prisma.$executeRaw`
            DELETE FROM account_deletions 
            WHERE completedAt IS NOT NULL
            AND completedAt < ${cutoffDate}::timestamp
          `;
          deletedCount = Number(deletionResult);
          break;
        default:
          deletedCount = await this.deleteOldRecords(policy.table, policy.dateColumn, cutoffDate);
      }

      const executionTime = Date.now() - startTime;

      // Log retention execution
      await prisma.$executeRaw`
        INSERT INTO data_retention_logs (
          table_name, records_deleted, retention_days, 
          executed_at, execution_time_ms, status
        ) VALUES (
          ${policy.table}, ${deletedCount}, ${policy.retentionDays},
          NOW(), ${executionTime}, 'success'
        )
      `;

      logger.info(`Deleted ${deletedCount} records from ${policy.table} (${executionTime}ms)`);

      return deletedCount;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      logger.error(`Error executing retention policy for ${policy.table}:`, error);

      // Log failure
      await prisma.$executeRaw`
        INSERT INTO data_retention_logs (
          table_name, records_deleted, retention_days,
          executed_at, execution_time_ms, status
        ) VALUES (
          ${policy.table}, 0, ${policy.retentionDays},
          NOW(), ${executionTime}, 'failed'
        )
      `;

      throw error;
    }
  }

  /**
   * Delete old records from a table
   */
  private async deleteOldRecords(
    table: string,
    dateColumn: string,
    cutoffDate: Date
  ): Promise<number> {
    const result = await prisma.$executeRaw`
      DELETE FROM ${table}
      WHERE ${dateColumn}::timestamp < ${cutoffDate}::timestamp
    `;

    return Number(result);
  }

  /**
   * Execute all enabled retention policies
   */
  async executeAllPolicies(): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    for (const policy of RETENTION_POLICIES) {
      if (!policy.enabled) {
        logger.info(`Skipping disabled policy for ${policy.table}`);
        continue;
      }

      try {
        const deleted = await this.executeRetentionPolicy(policy);
        results.set(policy.table, deleted);
      } catch (error) {
        logger.error(`Failed to execute policy for ${policy.table}:`, error);
        results.set(policy.table, -1); // -1 indicates error
      }
    }

    return results;
  }

  /**
   * Get retention policy for a table
   */
  getPolicy(table: string): RetentionPolicy | undefined {
    return RETENTION_POLICIES.find(p => p.table === table);
  }

  /**
   * Get all retention policies
   */
  getAllPolicies(): RetentionPolicy[] {
    return RETENTION_POLICIES;
  }

  /**
   * Get retention logs
   */
  async getRetentionLogs(limit: number = 100): Promise<any[]> {
    return await prisma.$queryRaw`
      SELECT * FROM data_retention_logs
      ORDER BY executed_at DESC
      LIMIT ${limit}
    `;
  }

  /**
   * Get retention statistics
   */
  async getRetentionStats(): Promise<any> {
    const stats = await prisma.$queryRaw`
      SELECT 
        table_name,
        COUNT(*) as executions,
        SUM(records_deleted) as total_deleted,
        AVG(execution_time_ms) as avg_time_ms,
        MAX(executed_at) as last_execution
      FROM data_retention_logs
      WHERE executed_at > NOW() - INTERVAL '30 days'
      GROUP BY table_name
      ORDER BY total_deleted DESC
    `;

    return stats;
  }
}

export const dataRetentionService = new DataRetentionService();
