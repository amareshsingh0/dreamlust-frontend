/**
 * Metrics Collector
 * 
 * Collects and aggregates metrics for monitoring and alerting:
 * - Error rates
 * - Response times
 * - Database connection pool usage
 * - System resources (CPU, memory, disk)
 */

import { alertManager } from './alertManager';
import { processAlert } from './alertManager';
import logger from '../logger';
import { prisma } from '../prisma';
import { redis, isRedisAvailable } from '../redis';
import os from 'os';
import { env } from '../../config/env';

interface MetricValue {
  timestamp: number;
  value: number;
}

interface MetricsSnapshot {
  timestamp: string;
  error_rate: number;
  response_time_p95: number;
  response_time_p99: number;
  database_connections: number;
  database_connection_pool_usage: number;
  disk_usage: number;
  memory_usage: number;
  cpu_usage: number;
  redis_connected: number;
}

class MetricsCollector {
  private errorCounts: MetricValue[] = [];
  private requestCounts: MetricValue[] = [];
  private responseTimes: MetricValue[] = [];
  private readonly maxHistorySize = 1000;
  private readonly windowMs = 5 * 60 * 1000; // 5 minutes

  /**
   * Record an HTTP request
   */
  recordRequest(statusCode: number, responseTime: number): void {
    const now = Date.now();

    // Record request
    this.requestCounts.push({ timestamp: now, value: 1 });
    this.trimHistory(this.requestCounts);

    // Record response time
    this.responseTimes.push({ timestamp: now, value: responseTime });
    this.trimHistory(this.responseTimes);

    // Record error if status >= 500
    if (statusCode >= 500) {
      this.errorCounts.push({ timestamp: now, value: 1 });
      this.trimHistory(this.errorCounts);
    }

    // Record metrics in alert manager
    alertManager.recordMetric('http.response_time', responseTime);
  }

  /**
   * Calculate error rate over time window
   */
  calculateErrorRate(windowMs: number = this.windowMs): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    const errors = this.errorCounts.filter((e) => e.timestamp >= windowStart).length;
    const requests = this.requestCounts.filter((r) => r.timestamp >= windowStart).length;

    if (requests === 0) return 0;
    return errors / requests;
  }

  /**
   * Calculate percentile response time
   */
  calculateResponseTimePercentile(percentile: number, windowMs: number = this.windowMs): number {
    const now = Date.now();
    const windowStart = now - windowMs;

    const times = this.responseTimes
      .filter((r) => r.timestamp >= windowStart)
      .map((r) => r.value)
      .sort((a, b) => a - b);

    if (times.length === 0) return 0;

    const index = Math.floor(times.length * (percentile / 100));
    return times[index] || 0;
  }

  /**
   * Get database connection pool usage
   */
  async getDatabaseConnectionPoolUsage(): Promise<number> {
    try {
      // Prisma doesn't expose connection pool stats directly
      // We'll use a query to check if we can get connections
      // This is an approximation - actual pool size is configured in DATABASE_URL
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
      `;

      const activeConnections = Number(result[0]?.count || 0);
      // Assume max pool size of 50 (default Prisma pool size)
      // This should match your DATABASE_URL connection_limit parameter
      const maxPoolSize = 50;
      return (activeConnections / maxPoolSize) * 100;
    } catch (error) {
      logger.error('Failed to get database connection pool usage', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Get disk usage percentage
   * 
   * Note: This is a simplified implementation. For production,
   * use a monitoring tool like Datadog, CloudWatch, or Prometheus
   * to get accurate disk usage metrics.
   */
  async getDiskUsage(): Promise<number> {
    try {
      // Use Node.js built-in checkdisk module if available
      // For cross-platform support, we'll use a simple approximation
      // In production, this should be replaced with actual disk monitoring
      
      // Try to use check-disk-space package or similar
      // For now, return 0 to indicate we can't determine disk usage
      // This should be replaced with actual monitoring in production
      
      logger.debug('Disk usage monitoring requires external monitoring tool', {
        platform: process.platform,
        note: 'Use Datadog, CloudWatch, or Prometheus for disk metrics',
      });
      
      // Return 0 to indicate unknown (won't trigger alerts)
      // In production, integrate with actual disk monitoring
      return 0;
    } catch (error) {
      logger.warn('Could not determine disk usage', {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * Get memory usage percentage
   */
  getMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return (usedMemory / totalMemory) * 100;
  }

  /**
   * Get CPU usage (average over last minute)
   */
  getCpuUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const idle = totalIdle / cpus.length;
    const total = totalTick / cpus.length;
    const usage = 100 - ~~((idle / total) * 100);
    return usage;
  }

  /**
   * Get Redis connection status
   */
  getRedisStatus(): number {
    return redis && isRedisAvailable() ? 1 : 0;
  }

  /**
   * Collect all metrics snapshot
   */
  async collectMetrics(): Promise<MetricsSnapshot> {
    const errorRate = this.calculateErrorRate();
    const responseTimeP95 = this.calculateResponseTimePercentile(95);
    const responseTimeP99 = this.calculateResponseTimePercentile(99);
    const dbPoolUsage = await this.getDatabaseConnectionPoolUsage();
    const diskUsage = await this.getDiskUsage();
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCpuUsage();
    const redisConnected = this.getRedisStatus();

    // Get active database connections count
    let dbConnections = 0;
    try {
      const result = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
      `;
      dbConnections = Number(result[0]?.count || 0);
    } catch (error) {
      logger.error('Failed to get database connections count', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return {
      timestamp: new Date().toISOString(),
      error_rate: errorRate,
      response_time_p95: responseTimeP95,
      response_time_p99: responseTimeP99,
      database_connections: dbConnections,
      database_connection_pool_usage: dbPoolUsage,
      disk_usage: diskUsage,
      memory_usage: memoryUsage,
      cpu_usage: cpuUsage,
      redis_connected: redisConnected,
    };
  }

  /**
   * Trim history to keep only recent entries
   */
  private trimHistory(history: MetricValue[]): void {
    if (history.length > this.maxHistorySize) {
      const cutoff = Date.now() - this.windowMs * 2; // Keep 2x window for safety
      const index = history.findIndex((entry) => entry.timestamp >= cutoff);
      if (index > 0) {
        history.splice(0, index);
      } else if (history.length > this.maxHistorySize) {
        history.splice(0, history.length - this.maxHistorySize);
      }
    }
  }
}

export const metricsCollector = new MetricsCollector();

