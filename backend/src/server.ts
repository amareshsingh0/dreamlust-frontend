// Initialize Datadog APM first (must be before other imports)
import { env } from './config/env';
if (env.NODE_ENV === 'production' && env.DATADOG_API_KEY) {
  try {
    require('dd-trace').init({
      service: 'dreamlust-api',
      env: env.DD_ENV || env.NODE_ENV,
      version: process.env.APP_VERSION || '1.0.0',
      site: env.DD_SITE || 'datadoghq.com',
      logInjection: true,
      runtimeMetrics: true,
      profiling: true,
    });
  } catch (error) {
    console.warn('⚠️  Failed to initialize Datadog APM:', error);
  }
}

import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { initSentry } from './lib/monitoring/sentry';
import logger from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { ipRateLimiter } from './middleware/rateLimit';
import { securityMiddleware } from './middleware/security';
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
import uploadRoutes from './routes/upload';
import creatorsRoutes from './routes/creators';
import liveRoutes from './routes/live';
import paymentsRoutes from './routes/payments';
import subscriptionsRoutes from './routes/subscriptions';
import plansRoutes from './routes/plans';
import razorpayRoutes from './routes/razorpay';
import giftcardsRoutes from './routes/giftcards';
import loyaltyRoutes from './routes/loyalty';
import analyticsRoutes from './routes/analytics';
import creatorAnalyticsRoutes from './routes/creator-analytics';
import affiliatesRoutes from './routes/affiliates';
import notificationsRoutes from './routes/notifications';
import pushRoutes from './routes/push';
import feedbackRoutes from './routes/feedback';
import funnelAnalyticsRoutes from './routes/funnel-analytics';
import healthRoutes from './routes/health';
import { createServer } from 'http';
import { initializeSocketServer } from './socket/socketServer';

const app = express();

// Initialize Sentry before other middleware (only in production)
if (env.NODE_ENV === 'production') {
  try {
    initSentry(app);
    logger.info('Sentry initialized successfully');
  } catch (error) {
    logger.warn('Failed to initialize Sentry', { error });
  }
}

// Sentry request handler (must be before other middleware)
if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.requestHandler());
  app.use(Sentry.Handlers.tracingHandler());
}

// Security middleware - comprehensive security headers
app.use(...securityMiddleware);

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

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (after body parsing to avoid logging sensitive data)
app.use(requestLogger);

// IP rate limiting (applied to all routes)
app.use(ipRateLimiter);

// Health check routes (before other routes for fast response)
app.use('/health', healthRoutes);

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
app.use('/api/upload', uploadRoutes);
app.use('/api/creators', creatorsRoutes);
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

// Sentry error handler (must be before other error handlers)
if (env.NODE_ENV === 'production' && env.SENTRY_DSN) {
  const Sentry = require('@sentry/node');
  app.use(Sentry.Handlers.errorHandler());
}

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

const PORT = parseInt(env.PORT, 10);

// Create HTTP server for Socket.io
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocketServer(httpServer);

const server = httpServer.listen(PORT, () => {
  logger.info('Server started successfully', {
    port: PORT,
    environment: env.NODE_ENV,
    frontendUrl: env.FRONTEND_URL,
    apiUrl: env.API_URL,
  });
});

// Handle server errors
server.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EADDRINUSE') {
    logger.error('Port already in use', {
      port: PORT,
      message: 'Please free the port or change PORT in .env',
    });
    process.exit(1);
  } else {
    logger.error('Server error', {
      error: error.message,
      stack: error.stack,
      code: error.code,
    });
    process.exit(1);
  }
});

// Handle unhandled promise rejections (prevents server crashes)
process.on('unhandledRejection', (reason: unknown, promise: Promise<any>) => {
  logger.error('Unhandled Rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  // Don't exit - let the error handler middleware handle it
  // This prevents the server from crashing on async errors
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

