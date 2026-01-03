// Initialize Datadog APM first (must be before other imports)
import { env } from './config/env';
if (env.NODE_ENV === 'production' && env.DATADOG_API_KEY) {
  // Use dynamic import for dd-trace (ES modules)
  import('dd-trace').then((ddTrace) => {
    ddTrace.default.init({
      service: 'dreamlust-api',
      env: env.DD_ENV || env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      site: env.DD_SITE || 'datadoghq.com',
      logInjection: true,
      runtimeMetrics: true,
      profiling: true,
    });
  }).catch((error) => {
    console.warn('⚠️  Failed to initialize Datadog APM:', error);
  });
}

import express, {
  Request,
  Response as ExpressResponse,
  NextFunction,
} from 'express';
import cors from 'cors';
import compression from 'compression';
import { initSentry } from './lib/monitoring/sentry';
import * as Sentry from '@sentry/node';
import logger from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ipRateLimiter } from './middleware/rateLimit';
import { securityMiddleware } from './middleware/security';
import { requestLogger } from './middleware/requestLogger';
import authRoutes from './routes/auth';
import oauthRoutes from './routes/oauth';
import searchRoutes from './routes/search';
import preferencesRoutes from './routes/preferences';
import playlistRoutes from './routes/playlists';
import contentRoutes from './routes/content';
import analyticsRoutes from './routes/analytics';
import recommendationsRoutes from './routes/recommendations';
import commentsRoutes from './routes/comments';
import tipsRoutes from './routes/tips';
import earningsRoutes from './routes/earnings';
import payoutsRoutes from './routes/payouts';
import webhooksRoutes from './routes/webhooks';
import privacyRoutes from './routes/privacy';
import moderationRoutes from './routes/moderation';
import adminRoutes from './routes/admin';
import adminExportRoutes from './routes/admin-export';
import authResetRoutes from './routes/auth-reset';
import auth2FARoutes from './routes/auth-2fa';
import uploadRoutes from './routes/upload';
import creatorsRoutes from './routes/creators';
import categoriesRoutes from './routes/categories';
import creatorToolsRoutes from './routes/creator-tools';
import liveRoutes from './routes/live';
import paymentsRoutes from './routes/payments';
import subscriptionsRoutes from './routes/subscriptions';
import plansRoutes from './routes/plans';
import razorpayRoutes from './routes/razorpay';
import giftcardsRoutes from './routes/giftcards';
import loyaltyRoutes from './routes/loyalty';
import creatorAnalyticsRoutes from './routes/creator-analytics';
import affiliatesRoutes from './routes/affiliates';
import notificationsRoutes from './routes/notifications';
import pushRoutes from './routes/push';
import feedbackRoutes from './routes/feedback';
import experimentsRoutes from './routes/experiments';
import funnelAnalyticsRoutes from './routes/funnel-analytics';
import featuresRoutes from './routes/features';
import searchAutocompleteRoutes from './routes/search-autocomplete';
import savedSearchesRoutes from './routes/saved-searches';
import socialRoutes from './routes/social';
import downloadsRoutes from './routes/downloads';
import interactiveRoutes from './routes/interactive';
import seriesRoutes from './routes/series';
import seasonsRoutes from './routes/seasons';
import pricingRoutes from './routes/pricing';
import promotionsRoutes from './routes/promotions';
import subscriptionManagementRoutes from './routes/subscription-management';
import cohortsRoutes from './routes/cohorts';
import funnelsRoutes from './routes/funnels';
import localizationRoutes from './routes/localization';
import retentionAnalyticsRoutes from './routes/retention-analytics';
import communityRoutes from './routes/community';
import adminChurnRoutes from './routes/admin-churn';
import contentRestrictionsRoutes from './routes/content-restrictions';
import multiAngleRoutes from './routes/multi-angle';
import healthRoutes, { simpleHealthCheck } from './routes/health';
import cacheTestRoutes from './routes/cache-test';
import { createServer } from 'http';
import { initializeSocketServer } from './socket/socketServer';
// Initialize monitoring service (will auto-start in production)
// Import monitoring service to ensure it's loaded and auto-starts
import './lib/monitoring/monitoringService';
// Initialize email service
import { initializeEmailService } from './lib/email/emailService';
// Initialize cron jobs
import { startCronJobs } from './lib/cron/cronService';
// Initialize Razorpay
import { initializeRazorpay } from './lib/payments/razorpayService';

console.log('📦 Creating Express app...');
const app = express();
console.log('✅ Express app created');

// Initialize Sentry before other middleware (only in production)
if (env.NODE_ENV === 'production') {
  try {
    initSentry(app);
    logger.info('Sentry initialized successfully');

    // Note: Modern Sentry SDK automatically handles request tracing
    // No need for Sentry.Handlers.requestHandler() or tracingHandler()
  } catch (error) {
    logger.warn('Failed to initialize Sentry', { error });
  }
}

// Security middleware - comprehensive security headers
app.use(...securityMiddleware);

// HTTPS enforcement (production only)
// Use dynamic import here — static `import { ... } from '...'` inside a block is syntax error
if (env.NODE_ENV === 'production') {
  import('./middleware/httpsEnforcer')
    .then(({ enforceHTTPS, setHSTSHeader }) => {
      if (typeof enforceHTTPS === 'function') app.use(enforceHTTPS);
      if (typeof setHSTSHeader === 'function') app.use(setHSTSHeader);
    })
    .catch((err) => {
      logger.warn('Failed to load HTTPS enforcer middleware', { error: err });
    });
}

// CORS configuration - allow frontend origin and localhost in development
const allowedOrigins = [
  env.FRONTEND_URL,
  'http://localhost:4001',
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4001',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Compression middleware - gzip/brotli for text responses
app.use(compression({
  filter: (req, res) => {
    // Compress text responses
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Compression level (1-9)
  threshold: 1024, // Only compress responses > 1KB
}));

// Body parsing (increase limit for base64 encoded images)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging (after body parsing to avoid logging sensitive data)
app.use(requestLogger);

// IP rate limiting (applied to all routes)
app.use(ipRateLimiter);
// Add country detection middleware globally
import { countryDetectionMiddleware } from './lib/geo/countryDetection';
import { asyncHandler } from './middleware/asyncHandler';
app.use(countryDetectionMiddleware);

// Health check routes (before other routes for fast response)
app.use('/health', healthRoutes);

// Simple health check endpoint at /api/health (matching standard format)
app.get('/api/health', async (req, res) => {
  const result = await simpleHealthCheck();
  const allHealthy = Object.values(result.checks).every((v) => v);
  res.status(allHealthy ? 200 : 503).json(result);
});

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Dreamlust API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
        logout: 'POST /api/auth/logout',
        me: 'GET /api/auth/me',
        changePassword: 'POST /api/auth/change-password',
      },
      oauth: {
        google: 'GET /api/auth/oauth/google',
        twitter: 'GET /api/auth/oauth/twitter',
      },
    },
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/reset-password', authResetRoutes);
app.use('/api/auth/2fa', auth2FARoutes);
app.use('/api/auth/oauth', oauthRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/preferences', preferencesRoutes);
app.use('/api/playlists', playlistRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/tips', tipsRoutes);
app.use('/api/earnings', earningsRoutes);
app.use('/api/payouts', payoutsRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/privacy', privacyRoutes);
app.use('/api/moderation', moderationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin/export', adminExportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/creators', creatorsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/creator-tools', creatorToolsRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/subscriptions', subscriptionsRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/razorpay', razorpayRoutes);
app.use('/api/giftcards', giftcardsRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/creator-analytics', creatorAnalyticsRoutes);
app.use('/api/affiliates', affiliatesRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/funnel-analytics', funnelAnalyticsRoutes);
app.use('/api/experiments', experimentsRoutes);
app.use('/api/features', featuresRoutes);
app.use('/api/search', searchAutocompleteRoutes);
app.use('/api/saved-searches', savedSearchesRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/downloads', downloadsRoutes);
app.use('/api/interactive', interactiveRoutes);
app.use('/api/series', seriesRoutes);
app.use('/api/seasons', seasonsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/promotions', promotionsRoutes);
app.use('/api/subscription-management', subscriptionManagementRoutes);
app.use('/api/cohorts', cohortsRoutes);
app.use('/api/funnels', funnelsRoutes);
app.use('/api/retention-analytics', retentionAnalyticsRoutes);
app.use('/api/admin/churn', adminChurnRoutes);
app.use('/api/content-restrictions', contentRestrictionsRoutes);
app.use('/api/multi-angle', multiAngleRoutes);
app.use('/api/community', communityRoutes);
app.use('/api/cache-test', cacheTestRoutes);

// Sentry error handler (must be before other error handlers)
if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

console.log('🔧 Setting up server...');
const PORT = parseInt(env.PORT, 10);
console.log(`📡 Server will listen on port ${PORT}`);

// Create HTTP server for Socket.io
console.log('🌐 Creating HTTP server...');
const httpServer = createServer(app);
console.log('✅ HTTP server created');

// Initialize Socket.io
console.log('🔌 Initializing Socket.io...');
let io;
try {
  io = initializeSocketServer(httpServer);
  logger.info('Socket.io server initialized');
  console.log('✅ Socket.io initialized');
} catch (error) {
  logger.error('Failed to initialize Socket.io', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  console.error('❌ Failed to initialize Socket.io:', error);
  process.exit(1);
}

let server;
try {
  server = httpServer.listen(PORT, async () => {
    logger.info('Server started successfully', {
      port: PORT,
      environment: env.NODE_ENV,
      frontendUrl: env.FRONTEND_URL,
      apiUrl: env.API_URL,
    });
    console.log(`✅ Server running on http://localhost:${PORT}`);

    // Initialize services
    initializeEmailService();
    initializeRazorpay();
    startCronJobs();

    logger.info('All services initialized');
  });

  // Handle server errors
  server.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code === 'EADDRINUSE') {
      logger.error('Port already in use', {
        port: PORT,
        message: 'Please free the port or change PORT in .env',
      });
      console.error(`❌ Port ${PORT} is already in use. Please free the port or change PORT in .env`);
      process.exit(1);
    } else {
      logger.error('Server error', {
        error: error.message,
        stack: error.stack,
        code: error.code,
      });
      console.error('Server error:', error);
      process.exit(1);
    }
  });
} catch (error) {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
  });
  console.error('Failed to start server:', error);
  process.exit(1);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  // Check if it's a Redis error - these are expected and handled gracefully
  const errorMessage = reason instanceof Error ? reason.message : String(reason);
  if (errorMessage.includes('Redis') || errorMessage.includes('maxRetriesPerRequest')) {
    // Redis errors are handled gracefully - server continues without Redis
    logger.warn('Redis connection error (handled gracefully)', {
      reason: errorMessage,
    });
    return; // Don't log as error or exit
  }

  logger.error('Unhandled Rejection', {
    reason: errorMessage,
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  console.error('Unhandled rejection:', reason);
  // In development, exit to catch errors early
  if (env.NODE_ENV === 'development') {
    process.exit(1);
  }
  // In production, don't exit - let the error handler middleware handle it
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception', {
    message: error.message,
    stack: error.stack,
  });
  // Only exit on truly unexpected errors
  // Most errors should be caught by asyncHandler
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export default app;