/**
 * Health Check Endpoints
 * 
 * Provides health check endpoints for monitoring and load balancers
 * - GET /health - Basic health check (fast, no external dependencies)
 * - GET /health/ready - Readiness probe (checks critical dependencies)
 * - GET /health/live - Liveness probe (checks if service is running)
 */

import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';
import { env } from '../config/env';
import { redis, isRedisAvailable } from '../lib/redis';

const router = Router();

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database?: {
      status: 'healthy' | 'unhealthy';
      responseTime?: number;
      error?: string;
    };
    redis?: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
    s3?: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
    supabase?: {
      status: 'healthy' | 'unhealthy' | 'not_configured';
      responseTime?: number;
      error?: string;
    };
  };
}

/**
 * Check database connection
 */
async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; responseTime?: number; error?: string }> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const responseTime = Date.now() - startTime;
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Database health check failed', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Redis connection
 */
async function checkRedis(): Promise<{ status: 'healthy' | 'unhealthy' | 'not_configured'; responseTime?: number; error?: string }> {
  if (!env.REDIS_URL) {
    return {
      status: 'not_configured',
    };
  }

  const startTime = Date.now();
  try {
    if (!redis || !isRedisAvailable()) {
      return {
        status: 'not_configured',
      };
    }
    
    await redis.ping();
    const responseTime = Date.now() - startTime;
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Redis health check failed', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check S3/Storage connection
 */
async function checkS3(): Promise<{ status: 'healthy' | 'unhealthy' | 'not_configured'; responseTime?: number; error?: string }> {
  // Check if S3 is configured
  const s3Bucket = env.S3_BUCKET_NAME;
  const s3Endpoint = env.S3_ENDPOINT;
  const s3AccessKey = env.S3_ACCESS_KEY_ID;
  const s3SecretKey = env.S3_SECRET_ACCESS_KEY;

  if (!s3Bucket || !s3Endpoint || !s3AccessKey || !s3SecretKey) {
    return {
      status: 'not_configured',
    };
  }

  const startTime = Date.now();
  try {
    // Dynamically import AWS SDK only if S3 is configured
    const { S3Client, HeadBucketCommand } = await import('@aws-sdk/client-s3');
    
    const s3Client = new S3Client({
      endpoint: s3Endpoint,
      region: env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
    });

    await s3Client.send(new HeadBucketCommand({ Bucket: s3Bucket }));
    const responseTime = Date.now() - startTime;
    
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('S3 health check failed', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check Supabase connection
 */
async function checkSupabase(): Promise<{ status: 'healthy' | 'unhealthy' | 'not_configured'; responseTime?: number; error?: string }> {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      status: 'not_configured',
    };
  }

  const startTime = Date.now();
  try {
    const { getSupabaseAdmin } = await import('../lib/supabaseAdmin');
    // Simple health check - try to connect
    const supabaseAdmin = getSupabaseAdmin();
    const { error } = await supabaseAdmin.from('_health_check').select('1').limit(1);
    
    // If error is "relation does not exist", that's OK - it means we can connect
    // If it's a connection error, that's a problem
    if (error && !error.message.includes('does not exist') && !error.message.includes('relation')) {
      throw error;
    }
    
    const responseTime = Date.now() - startTime;
    return {
      status: 'healthy',
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Supabase health check failed', {
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    });
    return {
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * GET /health
 * Basic health check - fast, no external dependencies
 * Returns 200 if service is running
 */
router.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: env.NODE_ENV,
  });
});

/**
 * GET /health/ready
 * Readiness probe - checks if service is ready to accept traffic
 * Checks all critical dependencies
 * Returns 200 if all critical services are healthy
 * Returns 503 if any critical service is unhealthy
 */
router.get('/ready', async (req: Request, res: Response) => {
  const checks: HealthCheckResult['checks'] = {};
  
  // Check database (critical)
  checks.database = await checkDatabase();
  
  // Check Redis (optional but check if configured)
  checks.redis = await checkRedis();
  
  // Check S3 (optional but check if configured)
  checks.s3 = await checkS3();
  
  // Check Supabase (optional but check if configured)
  checks.supabase = await checkSupabase();
  
  // Determine overall status
  const criticalChecks = [checks.database];
  const allCriticalHealthy = criticalChecks.every(check => check?.status === 'healthy');
  
  // Check if any optional services are unhealthy (but configured)
  const optionalChecks = [checks.redis, checks.s3, checks.supabase].filter(
    check => check && check.status !== 'not_configured'
  );
  const optionalUnhealthy = optionalChecks.some(check => check?.status === 'unhealthy');
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (!allCriticalHealthy) {
    overallStatus = 'unhealthy';
  } else if (optionalUnhealthy) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: env.NODE_ENV,
    checks,
  };
  
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(result);
});

/**
 * GET /health/live
 * Liveness probe - checks if service is alive
 * Returns 200 if service is running
 * Returns 503 if service is not responding
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /health/detailed
 * Detailed health check with all checks and metrics
 * Useful for monitoring dashboards
 */
router.get('/detailed', async (req: Request, res: Response) => {
  const checks: HealthCheckResult['checks'] = {};
  
  // Run all checks in parallel
  const [database, redis, s3, supabase] = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkS3(),
    checkSupabase(),
  ]);
  
  checks.database = database;
  checks.redis = redis;
  checks.s3 = s3;
  checks.supabase = supabase;
  
  // Determine overall status
  const criticalChecks = [checks.database];
  const allCriticalHealthy = criticalChecks.every(check => check?.status === 'healthy');
  
  const optionalChecks = [checks.redis, checks.s3, checks.supabase].filter(
    check => check && check.status !== 'not_configured'
  );
  const optionalUnhealthy = optionalChecks.some(check => check?.status === 'unhealthy');
  
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded';
  if (!allCriticalHealthy) {
    overallStatus = 'unhealthy';
  } else if (optionalUnhealthy) {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }
  
  const result: HealthCheckResult = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: env.NODE_ENV,
    checks,
  };
  
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(result);
});

export default router;

