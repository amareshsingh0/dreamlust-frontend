/**
 * Monitoring Service
 * 
 * Periodically collects metrics and checks them against alert thresholds.
 * Triggers alerts when thresholds are exceeded.
 */

import { metricsCollector } from './metricsCollector';
import { processAlert, checkAllAlerts } from './alertManager';
import logger from '../logger';
import { env } from '../../config/env';

interface MonitoringConfig {
  enabled: boolean;
  intervalMs: number; // How often to check metrics
  checkHealthEndpoint: boolean;
}

class MonitoringService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private config: MonitoringConfig;

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      enabled: env.NODE_ENV === 'production',
      intervalMs: 60000, // 1 minute
      checkHealthEndpoint: true,
      ...config,
    };
  }

  /**
   * Start monitoring service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Monitoring service is already running');
      return;
    }

    if (!this.config.enabled) {
      logger.info('Monitoring service is disabled');
      return;
    }

    logger.info('Starting monitoring service', {
      intervalMs: this.config.intervalMs,
    });

    // Run immediately, then on interval
    this.checkMetrics();

    this.intervalId = setInterval(() => {
      this.checkMetrics();
    }, this.config.intervalMs);

    this.isRunning = true;
  }

  /**
   * Stop monitoring service
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logger.info('Monitoring service stopped');
  }

  /**
   * Check metrics and trigger alerts
   */
  private async checkMetrics(): Promise<void> {
    try {
      const snapshot = await metricsCollector.collectMetrics();

      // Prepare metrics for alert checking
      const metrics: Record<string, number> = {
        'http.error_rate': snapshot.error_rate,
        'http.response_time': snapshot.response_time_p95, // Use P95 for general response time
        'database.connection_pool_usage': snapshot.database_connection_pool_usage,
        'system.disk_usage': snapshot.disk_usage,
        'system.memory_usage': snapshot.memory_usage,
        'system.cpu_usage': snapshot.cpu_usage,
        'redis.connection_status': snapshot.redis_connected,
      };

      // Check all alerts
      await checkAllAlerts(metrics, {
        timestamp: snapshot.timestamp,
        environment: env.NODE_ENV,
        service: 'dreamlust-api',
      });

      // Check specific percentile-based alerts
      await processAlert('response_time_p95', snapshot.response_time_p95, {
        timestamp: snapshot.timestamp,
        percentile: 95,
      });

      await processAlert('response_time_p99', snapshot.response_time_p99, {
        timestamp: snapshot.timestamp,
        percentile: 99,
      });

      // Check health endpoint if enabled
      if (this.config.checkHealthEndpoint) {
        await this.checkHealthEndpoint();
      }

      logger.debug('Metrics check completed', {
        error_rate: snapshot.error_rate,
        response_time_p95: snapshot.response_time_p95,
        database_pool_usage: snapshot.database_connection_pool_usage,
      });
    } catch (error) {
      logger.error('Error checking metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check health endpoint
   */
  private async checkHealthEndpoint(): Promise<void> {
    try {
      const healthUrl = `${env.API_URL || 'http://localhost:3001'}/api/health`;
      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout
      });

      const data = await response.json();
      const isHealthy = response.ok && data.status === 'healthy';

      if (!isHealthy) {
        await processAlert('health_check_failure', 0, {
          timestamp: new Date().toISOString(),
          health_status: data.status,
          checks: data.checks,
        });
      }
    } catch (error) {
      // Health check failed - trigger alert
      await processAlert('health_check_failure', 0, {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get current status
   */
  getStatus(): { running: boolean; config: MonitoringConfig } {
    return {
      running: this.isRunning,
      config: this.config,
    };
  }
}

// Export singleton instance
export const monitoringService = new MonitoringService();

// Auto-start in production
if (env.NODE_ENV === 'production') {
  // Start after a short delay to allow server to initialize
  setTimeout(() => {
    monitoringService.start();
  }, 5000);
}

// Graceful shutdown
process.on('SIGTERM', () => {
  monitoringService.stop();
});

process.on('SIGINT', () => {
  monitoringService.stop();
});

